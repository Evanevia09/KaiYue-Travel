import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAdminSessionAuth } from "../../../lib/server/admin-session.ts";
import { allowedAdminEmails } from "../../../lib/server/admin-session.ts";
import { isDevelopment } from "../../../lib/server/env.ts";

export const prerender = false;
function equalSecret(input: string, expected: string) {
  if (input.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= input.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export const ALL: APIRoute = async ({ request }) => {
  const signup = new URL(request.url).pathname === "/api/auth/sign-up/email";
  if (signup) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const token = env.ADMIN_SETUP_TOKEN;
    if (
      !isDevelopment(env) ||
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
  const auth = createAdminSessionAuth(env, signup);
  return auth.handler(request);
};
