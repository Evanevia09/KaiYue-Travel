import { AppError } from "@kaiyue/contracts";
import type { AppEnv } from "./env.ts";

export type AccessIdentity = {
  id: string;
  email: string;
};

const JWKS_TTL_MS = 60 * 60 * 1000;
const jwksCache = new Map<string, { expiresAt: number; keys: JsonWebKey[] }>();

export function accessIssuer(teamDomain: string): string {
  return `https://${teamDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

export function accessCertsUrl(teamDomain: string): string {
  return `${accessIssuer(teamDomain)}/cdn-cgi/access/certs`;
}

export function resetAccessJwksCache(): void {
  jwksCache.clear();
}

function decodeSegment(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  try {
    return JSON.parse(decodeSegment(parts[1])) as Record<string, unknown>;
  } catch {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
}

export function assertAccessClaims(
  payload: Record<string, unknown>,
  issuer: string,
  audience: string,
  nowSeconds = Date.now() / 1000,
): void {
  if (payload.iss !== issuer) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  const aud = payload.aud;
  const audienceOk =
    aud === audience || (Array.isArray(aud) && aud.some((value) => value === audience));
  if (!audienceOk) {
    throw new AppError("FORBIDDEN", "Admin access is not allowed for this identity.");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  if (payload.nbf != null && (typeof payload.nbf !== "number" || payload.nbf > nowSeconds)) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
}

export async function getAccessJwks(
  certsUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<JsonWebKey[]> {
  const cached = jwksCache.get(certsUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }
  const response = await fetchImpl(certsUrl);
  if (!response.ok) {
    throw new AppError("UNAVAILABLE", "Could not verify admin identity.", { expose: false });
  }
  const body = (await response.json()) as { keys?: JsonWebKey[] };
  const keys = body.keys ?? [];
  jwksCache.set(certsUrl, { keys, expiresAt: Date.now() + JWKS_TTL_MS });
  return keys;
}

function bytesFromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const bytes = Uint8Array.from(decodeSegment(value), (char) => char.charCodeAt(0));
  return new Uint8Array(bytes);
}

export async function verifyAccessJwt(
  token: string,
  env: Pick<AppEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
  fetchImpl: typeof fetch = fetch,
): Promise<AccessIdentity> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.ACCESS_AUD?.trim();
  if (!teamDomain || !audience) {
    throw new AppError("FORBIDDEN", "Admin access is not configured.");
  }

  const issuer = accessIssuer(teamDomain);
  const payload = decodeJwtPayload(token);
  assertAccessClaims(payload, issuer, audience);

  const email = typeof payload.email === "string" ? payload.email : undefined;
  const sub = typeof payload.sub === "string" ? payload.sub : email;
  if (!email || !sub) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  const header = JSON.parse(decodeSegment(token.split(".")[0]!)) as { kid?: string };
  const keys = await getAccessJwks(accessCertsUrl(teamDomain), fetchImpl);
  const jwk = keys.find((key) => (key as { kid?: string }).kid === header.kid);
  if (!jwk) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    bytesFromBase64Url(encodedSignature!),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  return { id: sub, email };
}
