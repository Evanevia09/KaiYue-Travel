import { AppError } from "@kaiyue/contracts";
import type { AppEnv } from "./env.ts";

const LIVE_ADMIN_PATHS = ["/admin", "/api/admin", "/api/v1/admin"];
const PASSWORD_ADMIN_PATHS = ["/login", "/setup-admin", "/api/auth"];

export const ACCESS_ADMIN_HOST = "admin.kaiyuemacau.com";
export const STAFF_ADMIN_HOST = "staff.kaiyuemacau.com";
export const CANONICAL_PUBLIC_ORIGIN = "https://kaiyuemacau.com";

/**
 * Public production hostnames. Password admin is fail-closed here unless
 * Access is unset and a future TEMP_ADMIN_EXPIRES_AT + ADMIN_EMAILS pair is
 * explicitly configured. The staging workers.dev host must not appear here.
 */
export const PRODUCTION_HOSTS = [
  "kaiyuemacau.com",
  "www.kaiyuemacau.com",
  "kaiyue-travel.scalingsmb.workers.dev",
] as const;

export const STAGING_HOSTS = ["kaiyue-travel-staging.kai-yue.workers.dev"] as const;

export function requestHost(request: Request): string {
  return new URL(request.url).hostname.toLowerCase();
}

export function isAccessAdminHost(request: Request): boolean {
  return requestHost(request) === ACCESS_ADMIN_HOST;
}

export function isStaffAdminHost(request: Request): boolean {
  return requestHost(request) === STAFF_ADMIN_HOST;
}

export function isProductionHost(request: Request): boolean {
  return (PRODUCTION_HOSTS as readonly string[]).includes(requestHost(request));
}

export function isStagingHost(request: Request): boolean {
  return (STAGING_HOSTS as readonly string[]).includes(requestHost(request));
}

export function isLoopbackHost(request: Request): boolean {
  const host = requestHost(request);
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

export function isLocalRuntime(env: Pick<AppEnv, "ENVIRONMENT" | "ENV">): boolean {
  const environment = (env.ENVIRONMENT ?? "").trim().toLowerCase();
  const envFlag = (env.ENV ?? "").trim().toLowerCase();
  return environment === "development" || environment === "local" || envFlag === "local";
}

export function isLiveEnvironment(env: Pick<AppEnv, "ENVIRONMENT" | "ENV">): boolean {
  return !isLocalRuntime(env);
}

export function isPreviewRuntime(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request?: Request,
): boolean {
  if (request && (isProductionHost(request) || isAccessAdminHost(request))) {
    return false;
  }
  if ((env.ENVIRONMENT ?? "").trim().toLowerCase() === "preview") {
    return true;
  }
  if (request && isStagingHost(request)) {
    return true;
  }
  if ((env.ENVIRONMENT ?? "").trim().toLowerCase() === "production") {
    return false;
  }
  if (!request) {
    return false;
  }
  const host = requestHost(request);
  return host.endsWith(".workers.dev") && !(PRODUCTION_HOSTS as readonly string[]).includes(host);
}

export function isLocalAdminSurface(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request: Request,
): boolean {
  if (
    isProductionHost(request) ||
    isAccessAdminHost(request) ||
    isStaffAdminHost(request) ||
    isStagingHost(request)
  ) {
    return false;
  }
  if (!isLoopbackHost(request)) {
    return false;
  }
  return isLocalRuntime(env);
}

export function emailSignupAllowed(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request: Request,
): boolean {
  return isLocalAdminSurface(env, request);
}

export function accessConfigured(env: Pick<AppEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">): boolean {
  return Boolean(env.ACCESS_TEAM_DOMAIN?.trim() && env.ACCESS_AUD?.trim());
}

/**
 * Cloudflare Access, when configured, is the only non-local admin identity.
 * Password login stays available on loopback development so operators can work
 * without a tunnel.
 */
export function accessTakesOver(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV" | "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
  request: Request,
): boolean {
  return (
    !isLocalAdminSurface(env, request) && (isAccessAdminHost(request) || accessConfigured(env))
  );
}

export function passwordAdminPath(pathname: string): boolean {
  return PASSWORD_ADMIN_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isProtectedAdminPath(pathname: string): boolean {
  return (
    passwordAdminPath(pathname) ||
    LIVE_ADMIN_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function temporaryPasswordConfigured(
  env: Pick<AppEnv, "ADMIN_EMAILS" | "TEMP_ADMIN_EXPIRES_AT">,
): boolean {
  const hasAllowlist = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .some(Boolean);
  if (!hasAllowlist) {
    return false;
  }
  const raw = env.TEMP_ADMIN_EXPIRES_AT?.trim();
  if (!raw) {
    return false;
  }
  const expiresAt = Date.parse(raw);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

export function passwordAdminAllowed(
  env: Pick<
    AppEnv,
    | "ENVIRONMENT"
    | "ENV"
    | "ADMIN_EMAILS"
    | "TEMP_ADMIN_EXPIRES_AT"
    | "ACCESS_TEAM_DOMAIN"
    | "ACCESS_AUD"
  >,
  request: Request,
): boolean {
  if (isAccessAdminHost(request)) {
    return false;
  }
  if (accessConfigured(env) && !isLocalAdminSurface(env, request)) {
    return false;
  }
  if (isLocalAdminSurface(env, request)) {
    return true;
  }
  if (!temporaryPasswordConfigured(env)) {
    return false;
  }
  if (isProductionHost(request) || isStaffAdminHost(request)) {
    return true;
  }
  return isPreviewRuntime(env, request) || isStagingHost(request);
}

export function assertLiveAdminSurface(env: AppEnv, pathname: string, request: Request): void {
  if (!isProtectedAdminPath(pathname)) {
    return;
  }
  if (isLocalAdminSurface(env, request)) {
    return;
  }
  if (accessTakesOver(env, request)) {
    if (passwordAdminPath(pathname) || !accessConfigured(env)) {
      throw new AppError("FORBIDDEN", "Admin access is not configured.");
    }
    return;
  }
  if (passwordAdminAllowed(env, request)) {
    if (pathname === "/setup-admin") {
      throw new AppError("FORBIDDEN", "Operator setup is disabled.");
    }
    return;
  }
  throw new AppError("FORBIDDEN", "Admin access is not configured.");
}

export function forbiddenResponse(message = "Admin access is not configured."): Response {
  return new Response(
    JSON.stringify({ error: { code: "FORBIDDEN", message, requestId: "gate" } }),
    {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
