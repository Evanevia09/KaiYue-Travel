import { AppError, sha256Hex } from "@kaiyue/contracts";
import { STAGING_ADMIN_HOST, resolveHostRole } from "./admin-gate.ts";
import { requireAdmin } from "./auth.ts";
import { first } from "./db.ts";
import type { AppEnv } from "./env.ts";
import { mailSite } from "./notification-policy.ts";

const origin = `https://${STAGING_ADMIN_HOST}`;
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const sessionCookieName = "__Secure-better-auth.session_token";
const tokenLifetime = 30 * 60 * 1000;
const approvalLifetime = 10 * 60 * 1000;

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

export async function issueMcpToken(request: Request, env: AppEnv) {
  assertMcpHost(request, env);
  requireBrowserOrigin(request);
  const identity = await requireAdmin(request, env);
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));
  if (!identity.operatorRole || !cookie) {
    throw new AppError("FORBIDDEN", "A staging staff password session is required.");
  }
  return seal(env, "session", { cookie, actor: identity.id, expires: Date.now() + tokenLifetime });
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
