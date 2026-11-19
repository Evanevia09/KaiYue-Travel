import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import {
  PRODUCTION_ADMIN_HOST,
  STAGING_ADMIN_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { createAdminSessionAuth } from "../../apps/web/src/lib/server/admin-session.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { authenticateMcp } from "../../apps/web/src/lib/server/mcp-access.ts";
import {
  authorizeMcpClient,
  readMcpAuthorization,
} from "../../apps/web/src/lib/server/mcp-oauth.ts";
import { mcpResource } from "../../apps/web/src/lib/server/mcp-oauth-metadata.ts";
import { createWorkerFetch } from "../../apps/web/src/lib/server/worker-entry.ts";

const stagingOrigin = `https://${STAGING_ADMIN_HOST}`;
const productionOrigin = `https://${PRODUCTION_ADMIN_HOST}`;
const email = "mcp-oauth-renewal-test@example.invalid";
const password = "synthetic-renewal-password";
const callback = "http://127.0.0.1:4330/callback";
const verifier = "v".repeat(43);

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;
let cookie: string;
const worker = createWorkerFetch(() => new Response("astro", { status: 404 }));

function sql(path: string) {
  return readFileSync(fileURLToPath(new URL(`../../migrations/${path}`, import.meta.url)), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

async function challenge(value: string) {
  return Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  ).toString("base64url");
}

function register(body: unknown, target = env, origin = stagingOrigin, type = "application/json") {
  return worker(
    new Request(`${origin}/api/v1/admin/mcp/oauth/register`, {
      method: "POST",
      headers: { "content-type": type },
      body: JSON.stringify(body),
    }),
    target,
    {},
  );
}

async function registerClient(redirect = callback) {
  const response = await register({ client_name: "renewal fixture", redirect_uris: [redirect] });
  expect(response.status).toBe(201);
  return ((await response.json()) as { client_id: string }).client_id;
}

function token(
  clientId: string,
  data: Record<string, string>,
  init: { origin?: string; host?: string; target?: AppEnv } = {},
) {
  return worker(
    new Request(`${init.host ?? stagingOrigin}/api/v1/admin/mcp/oauth/token`, {
      method: "POST",
      headers: init.origin ? { origin: init.origin } : {},
      body: new URLSearchParams({ client_id: clientId, ...data }),
    }),
    init.target ?? env,
    {},
  );
}

async function consentUrl(clientId: string, overrides: Record<string, string> = {}) {
  const url = new URL(`${stagingOrigin}/admin/agent-authorize`);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: "code",
    resource: mcpResource,
    code_challenge: await challenge(verifier),
    code_challenge_method: "S256",
    state: "s",
    ...overrides,
  }).toString();
  return url;
}

async function authorize(clientId: string) {
  const response = await authorizeMcpClient(
    new Request(await consentUrl(clientId), {
      method: "POST",
      headers: { origin: stagingOrigin, cookie },
    }),
    env,
  );
  expect(response.status).toBe(303);
  return new URL(response.headers.get("Location")!).searchParams.get("code")!;
}

async function connect(clientId: string) {
  const code = await authorize(clientId);
  const exchange = {
    grant_type: "authorization_code",
    code,
    redirect_uri: callback,
    code_verifier: verifier,
  };
  const response = await token(clientId, exchange);
  expect(response.status).toBe(200);
  const pair = (await response.json()) as { access_token: string; refresh_token: string };
  return { exchange, ...pair };
}

function useAccess(accessToken: string) {
  return authenticateMcp(
    new Request(`${stagingOrigin}/api/v1/admin/mcp`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}` },
    }),
    env,
  );
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error: string }).error;
}

describe("staging MCP OAuth renewal path", () => {
  beforeAll(async () => {
    platform = await getPlatformProxy({
      configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
      persist: false,
    });
    env = {
      ...(platform.env as AppEnv),
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
      BETTER_AUTH_SECRET: "test-only-renewal-secret-0123456789abcdef",
      ADMIN_EMAILS: email,
      ADMIN_PRIMARY_EMAIL: "primary-not-used@example.invalid",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    };
    for (const name of [
      "0004_admin_auth.sql",
      "0009_admin_operator.sql",
      "0010_admin_operator_last_super.sql",
    ]) {
      await env.DB.exec(sql(name));
    }
    const base = sql("0001_init.sql");
    await env.DB.exec(
      base
        .slice(
          base.indexOf("CREATE TABLE idempotency_keys"),
          base.indexOf("CREATE TABLE rate_limits"),
        )
        .split(";")
        .map((part) => part.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join(";\n"),
    );
    const origin = { "content-type": "application/json", origin: stagingOrigin };
    const signUp = await createAdminSessionAuth(
      env,
      true,
      new Request(`${stagingOrigin}/api/auth/ok`),
    ).handler(
      new Request(`${stagingOrigin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: origin,
        body: JSON.stringify({ name: "Synthetic Renewal Staff", email, password }),
      }),
    );
    expect(signUp.status).toBe(200);
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
       SELECT id, 'staff', 1, ?, ?, 'test' FROM "user" WHERE email = ?`,
    )
      .bind(now, now, email)
      .run();
    const login = await createAdminSessionAuth(
      env,
      false,
      new Request(`${stagingOrigin}/api/auth/ok`),
    ).handler(
      new Request(`${stagingOrigin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: origin,
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(login.status).toBe(200);
    cookie = login.headers
      .getSetCookie()
      .map((part) => part.split(";")[0] ?? "")
      .filter((part) => part.includes("="))
      .join("; ");
  }, 30_000);

  afterAll(async () => {
    await platform?.dispose();
  });

  it("exposes no OAuth routes outside the staging admin host", async () => {
    const production = { ...env, PUBLIC_SITE_URL: "https://kaiyuemacau.com" };
    for (const [origin, target] of [
      [productionOrigin, env],
      [stagingOrigin, production],
    ] as const) {
      const metadata = await worker(
        new Request(`${origin}/.well-known/oauth-authorization-server`),
        target,
        {},
      );
      expect(await metadata.text()).not.toContain("authorization_endpoint");
      expect((await register({ redirect_uris: [callback] }, target, origin)).status).toBe(404);
      expect(
        (await token("x", { grant_type: "refresh_token" }, { host: origin, target })).status,
      ).toBe(404);
    }
  });

  it("rejects unsafe client registrations", async () => {
    for (const redirect_uris of [
      ["cursor://anysphere.cursor-mcp/oauth/callback"],
      ["http://example.invalid/callback"],
      ["https://user:pass@example.invalid/callback"],
      ["https://example.invalid/callback#fragment"],
      Array.from({ length: 5 }, (_, i) => `https://example.invalid/${i}`),
      [],
    ]) {
      expect((await register({ redirect_uris })).status).toBe(400);
    }
    expect(
      (
        await register({
          redirect_uris: [callback],
          token_endpoint_auth_method: "client_secret_basic",
        })
      ).status,
    ).toBe(400);
    expect(
      (await register({ redirect_uris: [callback] }, env, stagingOrigin, "text/plain")).status,
    ).toBe(400);
    expect((await register({ redirect_uris: ["https://client.example.invalid/cb"] })).status).toBe(
      201,
    );
  });

  it("validates authorization requests against the registered client", async () => {
    const clientId = await registerClient();
    const read = async (overrides: Record<string, string>) =>
      readMcpAuthorization(
        new Request(await consentUrl(clientId, overrides), { headers: { cookie } }),
        env,
      );
    expect((await read({})).redirectUri).toBe(callback);
    for (const overrides of [
      { redirect_uri: "http://127.0.0.1:9999/other" },
      { code_challenge_method: "plain" },
      { response_type: "token" },
      { resource: "https://admin-staging.kaiyuemacau.com/api/v1/admin/other" },
      { client_id: "forged.client" },
    ]) {
      await expect(read(overrides)).rejects.toBeTruthy();
    }
  });

  it("guards the token endpoint", async () => {
    const clientId = await registerClient();
    const code = await authorize(clientId);
    const exchange = {
      grant_type: "authorization_code",
      code,
      redirect_uri: callback,
      code_verifier: verifier,
    };
    const foreign = await token(clientId, exchange, { origin: "https://evil.example.invalid" });
    expect(foreign.status).toBe(400);
    const get = await worker(new Request(`${stagingOrigin}/api/v1/admin/mcp/oauth/token`), env, {});
    expect(get.status).toBe(405);
    const unknownClient = await token("forged.client", exchange);
    expect(unknownClient.status).toBe(401);
    expect(await errorCode(unknownClient)).toBe("invalid_client");
    const wrongResource = await token(clientId, {
      ...exchange,
      resource: "https://admin-staging.kaiyuemacau.com/other",
    });
    expect(await errorCode(wrongResource)).toBe("invalid_target");
    expect(await errorCode(await token(clientId, { grant_type: "password" }))).toBe(
      "unsupported_grant_type",
    );
    const otherClient = await registerClient();
    expect((await token(otherClient, exchange)).status).toBe(400);
    expect(
      (await token(clientId, { ...exchange, redirect_uri: "http://127.0.0.1:1/x" })).status,
    ).toBe(400);
    expect((await token(clientId, exchange)).status).toBe(200);
  });

  it("expires unused authorization codes after three minutes", async () => {
    const clientId = await registerClient();
    const code = await authorize(clientId);
    const time = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 4 * 60_000);
    try {
      const response = await token(clientId, {
        grant_type: "authorization_code",
        code,
        redirect_uri: callback,
        code_verifier: verifier,
      });
      expect(await errorCode(response)).toBe("invalid_grant");
    } finally {
      time.mockRestore();
    }
  });

  it("revokes the connection when an authorization code is replayed", async () => {
    const clientId = await registerClient();
    const connection = await connect(clientId);
    expect((await useAccess(connection.access_token)).actor).toBeTruthy();
    const replay = await token(clientId, connection.exchange);
    expect(await errorCode(replay)).toBe("invalid_grant");
    await expect(useAccess(connection.access_token)).rejects.toMatchObject({ status: 401 });
    expect(
      (
        await token(clientId, {
          grant_type: "refresh_token",
          refresh_token: connection.refresh_token,
        })
      ).status,
    ).toBe(400);
  });

  it("binds refresh tokens to their client without revoking on a cross-client attempt", async () => {
    const clientId = await registerClient();
    const other = await registerClient();
    const connection = await connect(clientId);
    const stolen = await token(other, {
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    });
    expect(await errorCode(stolen)).toBe("invalid_grant");
    const renewed = await token(clientId, {
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    });
    expect(renewed.status).toBe(200);
  });

  it("ends renewal when the eight-hour authorization expires", async () => {
    const clientId = await registerClient();
    const connection = await connect(clientId);
    const time = vi.spyOn(Date, "now").mockReturnValue(Date.now() + 8 * 60 * 60_000 + 60_000);
    try {
      const response = await token(clientId, {
        grant_type: "refresh_token",
        refresh_token: connection.refresh_token,
      });
      expect(await errorCode(response)).toBe("invalid_grant");
    } finally {
      time.mockRestore();
    }
  });
});
