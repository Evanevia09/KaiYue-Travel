import { afterEach, describe, expect, it } from "vitest";
import {
  accessIssuer,
  assertAccessClaims,
  getAccessJwks,
  resetAccessJwksCache,
  verifyAccessJwt,
} from "./access-jwt.ts";

afterEach(() => {
  resetAccessJwksCache();
});

describe("Access JWT claim checks", () => {
  const issuer = "https://example.cloudflareaccess.com";
  const audience = "test-aud";
  const now = 1_700_000_000;

  it("accepts an exact issuer, matching aud, future exp, and valid nbf", () => {
    expect(() =>
      assertAccessClaims(
        { iss: issuer, aud: audience, exp: now + 60, nbf: now - 10 },
        issuer,
        audience,
        now,
      ),
    ).not.toThrow();
  });

  it("rejects issuer mismatch, wrong aud, expired tokens, and future nbf", () => {
    expect(() =>
      assertAccessClaims(
        { iss: `${issuer}/`, aud: audience, exp: now + 60 },
        issuer,
        audience,
        now,
      ),
    ).toThrow(/Admin authentication is required/);
    expect(() =>
      assertAccessClaims({ iss: issuer, aud: "other", exp: now + 60 }, issuer, audience, now),
    ).toThrow(/not allowed/);
    expect(() =>
      assertAccessClaims({ iss: issuer, aud: audience, exp: now }, issuer, audience, now),
    ).toThrow(/Admin authentication is required/);
    expect(() =>
      assertAccessClaims(
        { iss: issuer, aud: audience, exp: now + 60, nbf: now + 30 },
        issuer,
        audience,
        now,
      ),
    ).toThrow(/Admin authentication is required/);
  });

  it("caches JWKS responses", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response(JSON.stringify({ keys: [{ kid: "k1", kty: "RSA" }] }));
    };
    await getAccessJwks("https://example.invalid/certs", fetchImpl as typeof fetch);
    await getAccessJwks("https://example.invalid/certs", fetchImpl as typeof fetch);
    expect(calls).toBe(1);
  });
});

describe("Access JWT signature verification", () => {
  it("verifies a signed token against cached JWKS", async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"],
    );
    const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    const kid = "test-key";
    const header = Buffer.from(JSON.stringify({ alg: "RS256", kid })).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        iss: accessIssuer("https://team.cloudflareaccess.com"),
        aud: "preview-aud",
        exp: now + 300,
        nbf: now - 10,
        email: "ops@example.test",
        sub: "access-user-1",
      }),
    ).toString("base64url");
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      pair.privateKey,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    const token = `${header}.${payload}.${Buffer.from(signature).toString("base64url")}`;
    let fetches = 0;
    const fetchImpl = async () => {
      fetches += 1;
      return new Response(JSON.stringify({ keys: [{ ...jwk, kid }] }));
    };
    const first = await verifyAccessJwt(
      token,
      { ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com", ACCESS_AUD: "preview-aud" },
      fetchImpl as typeof fetch,
    );
    const second = await verifyAccessJwt(
      token,
      { ACCESS_TEAM_DOMAIN: "https://team.cloudflareaccess.com", ACCESS_AUD: "preview-aud" },
      fetchImpl as typeof fetch,
    );
    expect(first).toEqual({ id: "access-user-1", email: "ops@example.test" });
    expect(second.email).toBe("ops@example.test");
    expect(fetches).toBe(1);
  });
});
