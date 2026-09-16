import { AppError } from "@kaiyue/contracts";
import type { AppEnv } from "./env.ts";
import { isDevelopment } from "./env.ts";

export type AdminIdentity = {
  id: string;
  email: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const json = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return JSON.parse(json) as Record<string, unknown>;
}

async function verifyAccessJwt(token: string, env: AppEnv): Promise<AdminIdentity> {
  const teamDomain = env.ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
  const audience = env.ACCESS_AUD;
  if (!teamDomain || !audience) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is not configured.");
  }

  const payload = decodeJwtPayload(token);
  if (payload.aud !== audience && !(Array.isArray(payload.aud) && payload.aud.includes(audience))) {
    throw new AppError("FORBIDDEN", "Admin access is not allowed for this identity.");
  }

  const email = typeof payload.email === "string" ? payload.email : undefined;
  const sub = typeof payload.sub === "string" ? payload.sub : email;
  if (!email || !sub) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  const certsUrl = `${teamDomain.startsWith("http") ? teamDomain : `https://${teamDomain}`}/cdn-cgi/access/certs`;
  const response = await fetch(certsUrl);
  if (!response.ok) {
    throw new AppError("UNAVAILABLE", "Could not verify admin identity.", { expose: false });
  }
  const certs = (await response.json()) as { keys?: JsonWebKey[] };
  const headerJson = JSON.parse(
    atob(token.split(".")[0]!.replace(/-/g, "+").replace(/_/g, "/")),
  ) as { kid?: string; alg?: string };
  const jwk = certs.keys?.find((key) => (key as { kid?: string }).kid === headerJson.kid);
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
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = Uint8Array.from(
    atob(encodedSignature!.replace(/-/g, "+").replace(/_/g, "/")),
    (char) => char.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
  if (!valid) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  return { id: sub, email };
}

export async function requireAdmin(request: Request, env: AppEnv): Promise<AdminIdentity> {
  if (isDevelopment(env) && env.DEV_ADMIN_BYPASS === "true") {
    return { id: "dev-admin", email: "dev-admin@localhost" };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }

  return verifyAccessJwt(token, env);
}

export function requireSameOrigin(request: Request, env: AppEnv): void {
  if (request.method === "GET" || request.method === "HEAD") {
    return;
  }
  const origin = request.headers.get("origin");
  const site = env.PUBLIC_SITE_URL;
  if (origin && site && origin !== new URL(site).origin) {
    throw new AppError("FORBIDDEN", "Cross-origin admin mutations are not allowed.");
  }
}
