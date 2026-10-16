import { AppError } from "@kaiyue/contracts";
import type { AppEnv } from "./env.ts";

const LIVE_ADMIN_PATHS = [
  "/admin",
  "/login",
  "/setup-admin",
  "/api/admin",
  "/api/v1/admin",
  "/api/auth",
];

export const PRODUCTION_HOSTS = ["kaiyue-travel.scalingsmb.workers.dev"];

export function requestHost(request: Request): string {
  return new URL(request.url).hostname.toLowerCase();
}

export function isProductionHost(request: Request): boolean {
  return PRODUCTION_HOSTS.includes(requestHost(request));
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
  if (request && isProductionHost(request)) {
    return false;
  }
  if ((env.ENVIRONMENT ?? "").trim().toLowerCase() === "preview") {
    return true;
  }
  if (!request) {
    return false;
  }
  const host = requestHost(request);
  return host.endsWith(".workers.dev") && !PRODUCTION_HOSTS.includes(host);
}

export function accessConfigured(env: Pick<AppEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">): boolean {
  return Boolean(env.ACCESS_TEAM_DOMAIN?.trim() && env.ACCESS_AUD?.trim());
}

export function isProtectedAdminPath(pathname: string): boolean {
  return LIVE_ADMIN_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function passwordAdminAllowed(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request: Request,
): boolean {
  if (isLocalRuntime(env)) {
    return true;
  }
  return isPreviewRuntime(env, request);
}

export function assertLiveAdminSurface(env: AppEnv, pathname: string, request: Request): void {
  if (!isProtectedAdminPath(pathname)) {
    return;
  }
  if (isLocalRuntime(env)) {
    return;
  }
  if (isProductionHost(request) || !isPreviewRuntime(env, request)) {
    throw new AppError("FORBIDDEN", "Admin access is not configured.");
  }
  if (pathname === "/setup-admin") {
    throw new AppError("FORBIDDEN", "Operator setup is disabled on preview.");
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
