import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { AppError } from "@kaiyue/contracts";
import { createAdminSessionAuth } from "../../../lib/server/admin-session.ts";
import { allowedAdminEmails } from "../../../lib/server/admin-session.ts";
import {
  adminPasswordMinLength,
  assertLiveAdminSurface,
  emailSignupAllowed,
  forbiddenResponse,
  isLocalAdminSurface,
  passwordAdminAllowed,
  passwordMeetsAdminMin,
  temporaryPasswordConfigured,
} from "../../../lib/server/admin-gate.ts";
import { clientIp, errorResponse, requestIdFrom } from "../../../lib/server/http.ts";
import { enforceAdminSignInRateLimit } from "../../../lib/server/rate-limit.ts";

export const prerender = false;
function equalSecret(input: string, expected: string) {
  if (input.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= input.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export const ALL: APIRoute = async ({ request }) => {
  const pathname = new URL(request.url).pathname;
  const requestId = requestIdFrom(request);
  try {
    assertLiveAdminSurface(env, pathname, request);
  } catch {
    return forbiddenResponse();
  }
  if (!passwordAdminAllowed(env, request)) {
    return forbiddenResponse();
  }

  if (!isLocalAdminSurface(env, request) && !temporaryPasswordConfigured(env)) {
    return forbiddenResponse();
  }

  const signup = pathname === "/api/auth/sign-up/email";
  const signIn = pathname === "/api/auth/sign-in/email";
  if (signIn && request.method === "POST") {
    try {
      await enforceAdminSignInRateLimit(env.DB, clientIp(request));
    } catch (error) {
      return errorResponse(error, requestId);
    }
    let signInBody: { password?: unknown };
    try {
      signInBody = (await request.clone().json()) as { password?: unknown };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (!passwordMeetsAdminMin(signInBody.password, adminPasswordMinLength(env, request))) {
      return new Response(JSON.stringify({ message: "Password is too short" }), {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
  }
  if (signup) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const token = env.ADMIN_SETUP_TOKEN;
    if (
      !emailSignupAllowed(env, request) ||
      !token ||
      token.length < 32 ||
      !equalSecret(request.headers.get("x-admin-setup-token") ?? "", token)
    ) {
      return new Response("Not found", { status: 404 });
    }
    const origin = request.headers.get("origin");
    if (origin !== new URL(env.PUBLIC_SITE_URL || request.url).origin)
      return new Response("Forbidden", { status: 403 });
    const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM "user"').first<{
      count: number;
    }>();
    if ((count?.count ?? 0) > 0) return new Response("Setup already completed", { status: 409 });
    let body: { email?: unknown };
    try {
      body = (await request.clone().json()) as { email?: unknown };
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }
    if (
      typeof body.email !== "string" ||
      !allowedAdminEmails(env).has(body.email.trim().toLowerCase())
    )
      return new Response("Forbidden", { status: 403 });
  }
  try {
    const auth = createAdminSessionAuth(env, signup, request);
    return auth.handler(request);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error, requestId);
    }
    throw error;
  }
};
