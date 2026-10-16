import { AppError } from "@kaiyue/contracts";
import { betterAuth } from "better-auth";
import type { AppEnv } from "./env.ts";

export function allowedAdminEmails(env: AppEnv): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function createAdminSessionAuth(env: AppEnv, allowSignup = false, request?: Request) {
  const secret = env.BETTER_AUTH_SECRET;
  const configured = env.PUBLIC_SITE_URL;
  const baseURL = request ? new URL(request.url).origin : configured;
  if (!secret || secret.length < 32 || !baseURL) {
    throw new AppError("UNAVAILABLE", "Admin sign-in is not configured.", { expose: false });
  }
  const trustedOrigins = new Set<string>([new URL(baseURL).origin]);
  if (configured) {
    trustedOrigins.add(new URL(configured).origin);
  }
  return betterAuth({
    database: env.DB,
    secret,
    baseURL,
    trustedOrigins: [...trustedOrigins],
    emailAndPassword: { enabled: true, disableSignUp: !allowSignup, minPasswordLength: 12 },
    session: {
      expiresIn: 60 * 60 * 8,
      updateAge: 60 * 60,
      // Preview admin POSTs were spending most of their 5 s on sequential Better Auth
      // D1 session reads. A short signed cookie cache skips those round trips.
      cookieCache: { enabled: true, maxAge: 60 },
    },
  });
}
