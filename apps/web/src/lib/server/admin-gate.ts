import { AppError } from "@kaiyue/contracts";
import type { AppEnv } from "./env.ts";

const LIVE_ADMIN_PATHS = ["/admin", "/api/admin", "/api/v1/admin"];

export const PRODUCTION_ADMIN_HOST = "admin.kaiyuemacau.com";
export const STAGING_ADMIN_HOST = "admin-staging.kaiyuemacau.com";
export const STAGING_MARKETING_HOST = "staging.kaiyuemacau.com";

/** Dedicated production staff host. Alias kept for existing imports. */
export const ACCESS_ADMIN_HOST = PRODUCTION_ADMIN_HOST;

export const PRODUCTION_MARKETING_HOSTS = [
  "kaiyuemacau.com",
  "www.kaiyuemacau.com",
  "kaiyue-travel.scalingsmb.workers.dev",
  "kaiyue-travel-staging.kai-yue.workers.dev",
] as const;

export const PRODUCTION_ADMIN_HOSTS = [PRODUCTION_ADMIN_HOST] as const;
export const STAGING_MARKETING_HOSTS = [STAGING_MARKETING_HOST] as const;
export const STAGING_ADMIN_HOSTS = [STAGING_ADMIN_HOST] as const;

/** Historical alias for fail-closed public production marketing hosts. */
export const PRODUCTION_HOSTS: readonly string[] = PRODUCTION_MARKETING_HOSTS;

export const ADMIN_TRIAL_HOST = "kaiyue-travel-admin-trial.kai-yue.workers.dev";

export type HostRole =
  | "production-marketing"
  | "production-admin"
  | "staging-marketing"
  | "staging-admin"
  | "preview"
  | "local";

const productionMarketingHosts = new Set<string>(PRODUCTION_MARKETING_HOSTS);
const productionAdminHosts = new Set<string>(PRODUCTION_ADMIN_HOSTS);
const stagingMarketingHosts = new Set<string>(STAGING_MARKETING_HOSTS);
const stagingAdminHosts = new Set<string>(STAGING_ADMIN_HOSTS);

export function requestHost(request: Request): string {
  return new URL(request.url).hostname.toLowerCase();
}

function namedHostRole(host: string): HostRole | null {
  if (productionAdminHosts.has(host)) {
    return "production-admin";
  }
  if (stagingAdminHosts.has(host)) {
    return "staging-admin";
  }
  if (productionMarketingHosts.has(host)) {
    return "production-marketing";
  }
  if (stagingMarketingHosts.has(host)) {
    return "staging-marketing";
  }
  return null;
}

export function resolveHostRole(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request: Request,
): HostRole {
  const named = namedHostRole(requestHost(request));
  if (named) {
    return named;
  }
  if (isLocalRuntime(env)) {
    return "local";
  }
  if ((env.ENVIRONMENT ?? "").trim().toLowerCase() === "preview") {
    return "preview";
  }
  if (requestHost(request).endsWith(".workers.dev")) {
    return "preview";
  }
  return "production-marketing";
}

export function isDedicatedAdminHostname(host: string): boolean {
  const normalized = host.toLowerCase();
  return productionAdminHosts.has(normalized) || stagingAdminHosts.has(normalized);
}

export function isDedicatedAdminHost(request: Request): boolean {
  return isDedicatedAdminHostname(requestHost(request));
}

export function isProductionHost(request: Request): boolean {
  return productionMarketingHosts.has(requestHost(request));
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
  if (request) {
    return resolveHostRole(env, request) === "preview";
  }
  return (env.ENVIRONMENT ?? "").trim().toLowerCase() === "preview";
}

export type AccessBindingState = "absent" | "partial" | "configured";

export function accessBindingState(
  env: Pick<AppEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
): AccessBindingState {
  const team = Boolean(env.ACCESS_TEAM_DOMAIN?.trim());
  const audience = Boolean(env.ACCESS_AUD?.trim());
  if (team && audience) {
    return "configured";
  }
  if (team || audience) {
    return "partial";
  }
  return "absent";
}

export function accessConfigured(env: Pick<AppEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">): boolean {
  return accessBindingState(env) === "configured";
}

export function isProtectedAdminPath(pathname: string): boolean {
  return (
    passwordAdminPath(pathname) ||
    LIVE_ADMIN_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function passwordAdminAllowed(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV" | "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
  request: Request,
): boolean {
  const role = resolveHostRole(env, request);
  switch (role) {
    case "production-admin":
    case "staging-admin":
      return accessBindingState(env) === "absent";
    case "local":
    case "preview":
      return true;
    case "production-marketing":
    case "staging-marketing":
      return false;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

function passwordAdminPath(pathname: string): boolean {
  return ["/login", "/setup-admin", "/api/auth"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function assertDedicatedAdminSurface(env: AppEnv, pathname: string): void {
  const accessState = accessBindingState(env);
  if (accessState === "partial") {
    throw new AppError("FORBIDDEN", "Admin access is not configured.");
  }
  if (accessState === "configured") {
    if (passwordAdminPath(pathname)) {
      throw new AppError("FORBIDDEN", "Admin access is not configured.");
    }
    return;
  }
  if (pathname === "/setup-admin" || pathname.startsWith("/setup-admin/")) {
    throw new AppError("FORBIDDEN", "Operator setup is disabled on this host.");
  }
}

export function assertLiveAdminSurface(env: AppEnv, pathname: string, request: Request): void {
  if (!isProtectedAdminPath(pathname)) {
    return;
  }
  const role = resolveHostRole(env, request);
  switch (role) {
    case "production-admin":
    case "staging-admin":
      assertDedicatedAdminSurface(env, pathname);
      return;
    case "production-marketing":
    case "staging-marketing":
      throw new AppError("FORBIDDEN", "Admin access is not configured.");
    case "local":
      return;
    case "preview":
      if (pathname === "/setup-admin" || pathname.startsWith("/setup-admin/")) {
        throw new AppError("FORBIDDEN", "Operator setup is disabled on preview.");
      }
      return;
    default: {
      const exhaustive: never = role;
      throw exhaustive;
    }
  }
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
