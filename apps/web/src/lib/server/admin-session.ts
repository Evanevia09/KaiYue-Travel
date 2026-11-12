import { AppError } from "@kaiyue/contracts";
import { betterAuth } from "better-auth";
import { isAccessAdminHost, isLocalAdminSurface, isLocalRuntime } from "./admin-gate.ts";
import type { AppEnv } from "./env.ts";

export const MIN_ADMIN_PASSWORD_LENGTH = 16;

export function allowedAdminEmails(env: AppEnv): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function adminAuthTrustedOrigins(
  env: Pick<AppEnv, "PUBLIC_SITE_URL">,
  request?: Request,
): string[] {
  const configured = env.PUBLIC_SITE_URL;
  const baseURL = request ? new URL(request.url).origin : configured;
  if (!baseURL) {
    return [];
  }
  const trustedOrigins = new Set<string>([new URL(baseURL).origin]);
  if (configured && !(request && isAccessAdminHost(request))) {
    trustedOrigins.add(new URL(configured).origin);
  }
  return [...trustedOrigins];
}

export function createAdminSessionAuth(env: AppEnv, allowSignup = false, request?: Request) {
  const secret = env.BETTER_AUTH_SECRET;
  const configured = env.PUBLIC_SITE_URL;
  const baseURL = request ? new URL(request.url).origin : configured;
  if (!secret || secret.length < 32 || !baseURL) {
    throw new AppError("UNAVAILABLE", "Admin sign-in is not configured.", { expose: false });
  }
  const trustedOrigins = adminAuthTrustedOrigins(env, request);
  const local = request ? isLocalAdminSurface(env, request) : isLocalRuntime(env);
  return betterAuth({
    database: env.DB,
    secret,
    baseURL,
    trustedOrigins: [...trustedOrigins],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !allowSignup,
      minPasswordLength: MIN_ADMIN_PASSWORD_LENGTH,
    },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
      // Preview admin POSTs were spending most of their 5 s on sequential Better Auth
      // D1 session reads. A short signed cookie cache skips those round trips.
      cookieCache: { enabled: true, maxAge: 60 },
    },
    advanced: {
      useSecureCookies: !local,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: !local,
        path: "/",
      },
    },
  });
}
