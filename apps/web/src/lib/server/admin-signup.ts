import { allowedAdminEmails } from "./admin-session.ts";
import { isDevelopment, type AppEnv } from "./env.ts";

function equalSecret(input: string, expected: string) {
  if (input.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= input.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export type PasswordSignupGate =
  { ok: true } | { ok: false; status: 404 | 403 | 409 | 400 | 405; message: string };

export async function passwordSignupGate(
  env: AppEnv,
  request: Request,
): Promise<PasswordSignupGate> {
  if (request.method !== "POST") {
    return { ok: false, status: 405, message: "Method not allowed" };
  }
  const token = env.ADMIN_SETUP_TOKEN;
  if (
    !isDevelopment(env) ||
    !token ||
    token.length < 32 ||
    !equalSecret(request.headers.get("x-admin-setup-token") ?? "", token)
  ) {
    return { ok: false, status: 404, message: "Not found" };
  }
  const origin = request.headers.get("origin");
  if (origin !== new URL(env.PUBLIC_SITE_URL || request.url).origin) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM "user"').first<{
    count: number;
  }>();
  if ((count?.count ?? 0) > 0) {
    return { ok: false, status: 409, message: "Setup already completed" };
  }
  let body: { email?: unknown };
  try {
    body = (await request.clone().json()) as { email?: unknown };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON" };
  }
  if (
    typeof body.email !== "string" ||
    !allowedAdminEmails(env).has(body.email.trim().toLowerCase())
  ) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true };
}
