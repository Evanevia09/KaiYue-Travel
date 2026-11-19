import { AppError, sha256Hex } from "@kaiyue/contracts";
import { STAGING_ADMIN_HOST, resolveHostRole } from "./admin-gate.ts";
import { ADMIN_PASSWORD_MAX_LENGTH } from "./admin-operator.ts";
import { createAdminSessionAuth } from "./admin-session.ts";
import { requireAdmin } from "./auth.ts";
import { first } from "./db.ts";
import type { AppEnv } from "./env.ts";
import { errorResponse, json, readJson, requestIdFrom } from "./http.ts";
import { mailSite } from "./notification-policy.ts";
import {
  PASSWORD_SIGNIN_FAILED,
  beginPasswordAttempt,
  clearPasswordAttempts,
  rejectIfPasswordLocked,
} from "./password-attempt.ts";

const origin = `https://${STAGING_ADMIN_HOST}`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const sessionCookieName = "__Secure-better-auth.session_token";
const tokenLifetime = 30 * 60 * 1000;
const tokenLifetimeSeconds = tokenLifetime / 1000;
const approvalLifetime = 10 * 60 * 1000;
const staffEmailMaxLength = 254;

/** Worker var name. Read only from env, never from request headers, query, or body. */
export const MCP_STAGING_DIRECT_WRITES_VAR = "MCP_STAGING_DIRECT_WRITES";

/**
 * Staging MCP write tools skip browser-review tickets only when the official
 * staging overlay sets this var to the exact string `"true"` and the request is
 * on the trusted staging admin host with the staging site identity. Fail closed
 * otherwise. `ENVIRONMENT` is ignored (official staging uses `"production"`).
 */
export function mcpStagingDirectWritesEnabled(
  env: Pick<AppEnv, "MCP_STAGING_DIRECT_WRITES" | "PUBLIC_SITE_URL" | "ENVIRONMENT" | "ENV">,
  request: Request,
): boolean {
  if (env.MCP_STAGING_DIRECT_WRITES !== "true") return false;
  if (resolveHostRole(env, request) !== "staging-admin") return false;
  if (mailSite(env) !== "staging") return false;
  try {
    return new URL(request.url).origin === origin;
  } catch {
    return false;
  }
}

type Ticket = {
  session: { cookie: string; actor: string; expires: number };
  approval: { action: string; actor: string; message: string; expires: number };
};

export function assertMcpHost(request: Request, env: AppEnv) {
  if (
    resolveHostRole(env, request) !== "staging-admin" ||
    new URL(request.url).origin !== origin ||
    mailSite(env) !== "staging"
  ) {
    throw new AppError("NOT_FOUND", "The staging MCP endpoint is unavailable on this host.");
  }
}

function requireBrowserOrigin(request: Request) {
  if (request.method === "POST" && request.headers.get("origin") !== origin) {
    throw new AppError("FORBIDDEN", "Use the staging admin page to confirm this request.");
  }
}

async function ticketKey(env: AppEnv, purpose: keyof Ticket): Promise<CryptoKey> {
  if (!env.BETTER_AUTH_SECRET)
    throw new AppError("UNAVAILABLE", "Staff authentication is unavailable.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`kaiyue-mcp:${origin}:${purpose}:${env.BETTER_AUTH_SECRET}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decode(value: string) {
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (char) =>
    char.charCodeAt(0),
  );
}

async function seal<P extends keyof Ticket>(env: AppEnv, purpose: P, payload: Ticket[P]) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await ticketKey(env, purpose),
    encoder.encode(JSON.stringify(payload)),
  );
  return `${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
}

async function open<P extends keyof Ticket>(
  env: AppEnv,
  purpose: P,
  ticket: string,
): Promise<Ticket[P]> {
  try {
    if (ticket.length > 6000 || !/^[\w-]+\.[\w-]+$/.test(ticket)) throw new Error("Invalid ticket");
    const [iv, ciphertext] = ticket.split(".") as [string, string];
    const bytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(iv) },
      await ticketKey(env, purpose),
      decode(ciphertext),
    );
    const payload = JSON.parse(decoder.decode(bytes)) as Ticket[P];
    if (!Number.isFinite(payload.expires) || payload.expires <= Date.now())
      throw new Error("Expired ticket");
    return payload;
  } catch {
    throw new AppError(
      "UNAUTHORIZED",
      "This staging connection or approval expired. Sign in again.",
    );
  }
}

function staffRequest(cookie: string) {
  return new Request(`${origin}/api/v1/admin/profile`, { headers: { cookie } });
}

function sessionCookieFromHeader(header: string | null): string | undefined {
  return header
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
}

function sessionCookieFromResponse(response: Response): string | undefined {
  for (const value of response.headers.getSetCookie()) {
    const cookie = sessionCookieFromHeader(value);
    if (cookie) return cookie;
  }
  return undefined;
}

async function sealStaffSession(env: AppEnv, cookie: string, actor: string) {
  return seal(env, "session", { cookie, actor, expires: Date.now() + tokenLifetime });
}

function rejectCredentialQuery(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.has("email") || params.has("password")) {
    throw new AppError("VALIDATION_FAILED", "Do not put credentials in the URL.");
  }
}

function staffPasswordCredentials(body: unknown): { email: string; password: string } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new AppError("VALIDATION_FAILED", "Send the staff email and password as JSON.");
  }
  const record = body as Record<string, unknown>;
  const email = typeof record.email === "string" ? record.email.trim() : "";
  const password = typeof record.password === "string" ? record.password : "";
  if (!email || email.length > staffEmailMaxLength || email.includes("\0")) {
    throw new AppError("VALIDATION_FAILED", "Enter a staff email address.");
  }
  if (!password || password.length > ADMIN_PASSWORD_MAX_LENGTH) {
    throw new AppError("VALIDATION_FAILED", "Enter the staff password.");
  }
  return { email, password };
}

async function requireStaffOperatorSession(env: AppEnv, cookie: string) {
  const identity = await requireAdmin(staffRequest(cookie), env);
  if (!identity.operatorRole) {
    throw new AppError("FORBIDDEN", "A staging staff password session is required.");
  }
  return identity;
}

export async function issueMcpToken(request: Request, env: AppEnv) {
  assertMcpHost(request, env);
  requireBrowserOrigin(request);
  const identity = await requireAdmin(request, env);
  const cookie = sessionCookieFromHeader(request.headers.get("cookie"));
  if (!identity.operatorRole || !cookie) {
    throw new AppError("FORBIDDEN", "A staging staff password session is required.");
  }
  return sealStaffSession(env, cookie, identity.id);
}

export async function issueMcpTokenFromCredentials(
  request: Request,
  env: AppEnv,
  now = Date.now(),
) {
  assertMcpHost(request, env);
  rejectCredentialQuery(request);
  const credentials = staffPasswordCredentials(await readJson(request));
  const attempt = await beginPasswordAttempt(env, request, credentials.email, now);
  const signInRequest = new Request(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(credentials),
  });
  const login = await createAdminSessionAuth(env, false, signInRequest).handler(signInRequest);
  const cookie = sessionCookieFromResponse(login);
  if (!login.ok || !cookie) {
    await login.body?.cancel();
    rejectIfPasswordLocked(attempt, now);
    throw new AppError("UNAUTHORIZED", PASSWORD_SIGNIN_FAILED);
  }
  await login.body?.cancel();
  try {
    const identity = await requireStaffOperatorSession(env, cookie);
    await clearPasswordAttempts(env, request, credentials.email);
    return sealStaffSession(env, cookie, identity.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "RATE_LIMITED") throw error;
    if (
      error instanceof AppError &&
      (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
    ) {
      rejectIfPasswordLocked(attempt, now);
      throw new AppError("UNAUTHORIZED", PASSWORD_SIGNIN_FAILED);
    }
    throw error;
  }
}

export async function handleMcpSession(request: Request, env: AppEnv): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    assertMcpHost(request, env);
    if (request.method !== "POST") {
      return new Response(null, {
        status: 405,
        headers: { Allow: "POST", "Cache-Control": "no-store" },
      });
    }
    const token = await issueMcpTokenFromCredentials(request, env);
    return json({ token, expiresIn: tokenLifetimeSeconds }, 200, requestId);
  } catch (error) {
    const response = errorResponse(error, requestId);
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers });
  }
}

export async function authenticateMcp(request: Request, env: AppEnv) {
  assertMcpHost(request, env);
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer "))
    throw new AppError("UNAUTHORIZED", "A staging connection token is required.");
  const session = await open(env, "session", header.slice(7));
  const identity = await requireAdmin(staffRequest(session.cookie), env);
  if (!identity.operatorRole || identity.id !== session.actor) {
    throw new AppError("UNAUTHORIZED", "The staging session is no longer available.");
  }
  return session;
}

export async function reviewMcpWrite(
  env: AppEnv,
  request: Request,
  actor: string,
  message: string,
  action: unknown,
): Promise<string | null> {
  if (mcpStagingDirectWritesEnabled(env, request)) return null;
  return consumeMcpApproval(env, actor, action, message);
}

export async function consumeMcpApproval(
  env: AppEnv,
  actor: string,
  action: unknown,
  message: string,
) {
  const key = await sha256Hex(JSON.stringify(["mcp-action", actor, action]));
  const now = new Date().toISOString();
  const approved = await first(
    env.DB,
    "UPDATE idempotency_keys SET status_code = 204 WHERE key_hash = ? AND status_code = 200 AND expires_at > ? RETURNING key_hash",
    key,
    now,
  );
  if (approved) return null;
  const ticket = await seal(env, "approval", {
    action: key,
    actor,
    message,
    expires: Date.now() + approvalLifetime,
  });
  return `${origin}/admin/agent-review?ticket=${encodeURIComponent(ticket)}`;
}

export async function readMcpApproval(request: Request, env: AppEnv, ticket: string) {
  assertMcpHost(request, env);
  const identity = await requireAdmin(request, env);
  const approval = await open(env, "approval", ticket);
  if (!identity.operatorRole || identity.id !== approval.actor) {
    throw new AppError("FORBIDDEN", "Sign in with the account that requested this action.");
  }
  return approval;
}

export async function approveMcpAction(request: Request, env: AppEnv, ticket: string) {
  requireBrowserOrigin(request);
  const approval = await readMcpApproval(request, env, ticket);
  const now = new Date().toISOString();
  const saved = await first(
    env.DB,
    `INSERT INTO idempotency_keys (key_hash, request_hash, response_json, status_code, expires_at, created_at)
     VALUES (?, ?, '{}', 200, ?, ?)
     ON CONFLICT(key_hash) DO UPDATE SET status_code = 200, expires_at = excluded.expires_at,
       created_at = excluded.created_at WHERE idempotency_keys.expires_at <= excluded.created_at
     RETURNING key_hash`,
    approval.action,
    approval.action,
    new Date(approval.expires).toISOString(),
    now,
  );
  if (!saved) throw new AppError("CONFLICT", "This staging action was already approved.");
}
