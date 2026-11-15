import { AppError } from "@kaiyue/contracts";
import { verifyAccessJwt } from "./access-jwt.ts";
import {
  accessBindingState,
  isDedicatedAdminHost,
  isLocalRuntime,
  passwordAdminAllowed,
  resolveHostRole,
} from "./admin-gate.ts";
import { assertPrimaryOperator, temporaryAdminExpiryApplies } from "./admin-primary.ts";
import { allowedAdminEmails, createAdminSessionAuth } from "./admin-session.ts";
import type { AppEnv } from "./env.ts";

export type AdminIdentity = {
  id: string;
  email: string;
};

export async function requireAdmin(request: Request, env: AppEnv): Promise<AdminIdentity> {
  const accessState = accessBindingState(env);
  if (accessState === "partial") {
    throw new AppError("FORBIDDEN", "Admin access is not configured.");
  }

  const role = resolveHostRole(env, request);
  switch (role) {
    case "production-marketing":
    case "staging-marketing":
      throw new AppError("FORBIDDEN", "Admin access is not configured.");
    case "production-admin":
    case "staging-admin":
    case "preview":
    case "local":
      break;
    default: {
      const exhaustive: never = role;
      throw exhaustive;
    }
  }

  if (isDedicatedAdminHost(request) && accessState === "configured") {
    const accessToken = request.headers.get("cf-access-jwt-assertion");
    if (!accessToken) {
      throw new AppError("FORBIDDEN", "Admin access is not configured.");
    }
    const accessIdentity = await verifyAccessJwt(accessToken, env);
    assertPrimaryOperator(accessIdentity, env, request);
    return accessIdentity;
  }

  if (isLocalRuntime(env) && env.DEV_ADMIN_BYPASS === "true" && !isDedicatedAdminHost(request)) {
    return { id: "dev-admin", email: "dev-admin@localhost" };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (token && accessState === "configured") {
    const accessIdentity = await verifyAccessJwt(token, env);
    assertPrimaryOperator(accessIdentity, env, request);
    return accessIdentity;
  }

  if (!passwordAdminAllowed(env, request)) {
    throw new AppError("FORBIDDEN", "Admin access is not configured.");
  }

  const allowed = allowedAdminEmails(env);
  if (allowed.size === 0) throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  if (temporaryAdminExpiryApplies(env, request) && env.TEMP_ADMIN_EXPIRES_AT) {
    const expiresAt = Date.parse(env.TEMP_ADMIN_EXPIRES_AT);
    if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) {
      throw new AppError("UNAUTHORIZED", "Temporary admin access has expired.");
    }
  }
  const auth = createAdminSessionAuth(env, false, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || !allowed.has(session.user.email.toLowerCase())) {
    throw new AppError("UNAUTHORIZED", "Admin authentication is required.");
  }
  const identity = { id: session.user.id, email: session.user.email };
  assertPrimaryOperator(identity, env, request);
  return identity;
}

export function requireSameOrigin(request: Request, env: AppEnv): void {
  if (request.method === "GET" || request.method === "HEAD") {
    return;
  }
  const origin = request.headers.get("origin");
  const site = env.PUBLIC_SITE_URL;
  const requestOrigin = new URL(request.url).origin;
  const allowed = new Set<string>();
  if (site && !isDedicatedAdminHost(request)) allowed.add(new URL(site).origin);
  allowed.add(requestOrigin);
  if (origin && !allowed.has(origin)) {
    throw new AppError("FORBIDDEN", "Cross-origin admin mutations are not allowed.");
  }
}
