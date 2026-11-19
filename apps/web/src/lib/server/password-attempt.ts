import { AppError, sha256Hex } from "@kaiyue/contracts";
import {
  PASSWORD_LOCKOUT_FAILURES,
  PASSWORD_LOCKOUT_MESSAGE,
  PASSWORD_LOCKOUT_MS,
  PASSWORD_SIGNIN_FAILED,
} from "../password-sign-in-copy.ts";
import { resolveHostRole } from "./admin-gate.ts";
import { normalizeAdminEmail } from "./admin-primary.ts";
import { createAdminSessionAuth } from "./admin-session.ts";
import { requireAdmin } from "./auth.ts";
import { first, run } from "./db.ts";
import type { AppEnv } from "./env.ts";
import { JSON_LIMIT_BYTES, errorResponse, requestIdFrom } from "./http.ts";

export {
  PASSWORD_LOCKOUT_FAILURES,
  PASSWORD_LOCKOUT_MESSAGE,
  PASSWORD_LOCKOUT_MS,
  PASSWORD_SIGNIN_FAILED,
};

/** Existing `rate_limits` table from `migrations/0001_init.sql`. Tests on persist:false D1 must create it. */
export const RATE_LIMITS_TABLE_SQL =
  "CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start TEXT NOT NULL);";

const emailMaxLength = 254;

export type PasswordAttemptReservation = {
  count: number;
  windowStart: string;
};

type RateLimitRow = {
  count: number;
  window_start: string;
};

const incrementSql = `INSERT INTO rate_limits (bucket, count, window_start)
VALUES (?, 1, ?)
ON CONFLICT(bucket) DO UPDATE SET
  count = CASE
    WHEN rate_limits.count >= ? AND rate_limits.window_start <= ? THEN 1
    ELSE rate_limits.count + 1
  END,
  window_start = CASE
    WHEN rate_limits.count >= ? AND rate_limits.window_start <= ? THEN excluded.window_start
    WHEN rate_limits.count + 1 >= ? THEN excluded.window_start
    ELSE rate_limits.window_start
  END
WHERE (rate_limits.count >= ? AND rate_limits.window_start <= ?) OR rate_limits.count < ?
RETURNING count, window_start`;

export function trustClientForwardedIp(
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
  request: Request,
): boolean {
  const role = resolveHostRole(env, request);
  switch (role) {
    case "local": {
      const host = new URL(request.url).hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    }
    case "preview":
    case "staging-admin":
    case "staging-marketing":
    case "production-admin":
    case "production-marketing":
      return false;
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function passwordAttemptSource(
  request: Request,
  env: Pick<AppEnv, "ENVIRONMENT" | "ENV">,
): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim().toLowerCase();
  if (cf) return cf;
  if (!trustClientForwardedIp(env, request)) {
    return "untrusted";
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().toLowerCase();
  if (forwarded) return forwarded;
  return "unknown";
}

export function normalizePasswordAttemptEmail(email: string): string {
  const normalized = normalizeAdminEmail(email);
  if (!normalized || normalized.length > emailMaxLength || normalized.includes("\0")) {
    return "";
  }
  return normalized;
}

async function hashedBucket(secret: string, kind: "acct" | "ip", value: string): Promise<string> {
  return `signin:${kind}:${await sha256Hex(`kaiyue-signin:${kind}:${secret}:${value}`)}`;
}

export async function passwordAttemptBuckets(
  env: AppEnv,
  email: string,
  ip: string,
): Promise<{ account?: string; ip: string }> {
  const secret = env.BETTER_AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new AppError("UNAVAILABLE", "Admin sign-in is not configured.", { expose: false });
  }
  const normalized = normalizePasswordAttemptEmail(email);
  return {
    account: normalized ? await hashedBucket(secret, "acct", normalized) : undefined,
    ip: await hashedBucket(secret, "ip", ip || "unknown"),
  };
}

function retryAfterSeconds(windowStart: string, now: number): number {
  const unlockAt = Date.parse(windowStart) + PASSWORD_LOCKOUT_MS;
  if (!Number.isFinite(unlockAt)) {
    return Math.ceil(PASSWORD_LOCKOUT_MS / 1000);
  }
  return Math.max(1, Math.ceil((unlockAt - now) / 1000));
}

function passwordLockoutError(retryAfter: number): AppError {
  return new AppError("RATE_LIMITED", PASSWORD_LOCKOUT_MESSAGE, { retryAfter });
}

async function lockedRetryAfter(env: AppEnv, bucket: string, now: number): Promise<number> {
  const row = await first<RateLimitRow>(
    env.DB,
    "SELECT count, window_start FROM rate_limits WHERE bucket = ?",
    bucket,
  );
  if (!row || row.count < PASSWORD_LOCKOUT_FAILURES) {
    return Math.ceil(PASSWORD_LOCKOUT_MS / 1000);
  }
  return retryAfterSeconds(row.window_start, now);
}

async function reserveAttempt(
  env: AppEnv,
  bucket: string,
  nowIso: string,
  expiredBefore: string,
): Promise<RateLimitRow | null> {
  return first<RateLimitRow>(
    env.DB,
    incrementSql,
    bucket,
    nowIso,
    PASSWORD_LOCKOUT_FAILURES,
    expiredBefore,
    PASSWORD_LOCKOUT_FAILURES,
    expiredBefore,
    PASSWORD_LOCKOUT_FAILURES,
    PASSWORD_LOCKOUT_FAILURES,
    expiredBefore,
    PASSWORD_LOCKOUT_FAILURES,
  );
}

function combinedReservation(rows: RateLimitRow[]): PasswordAttemptReservation {
  const count = Math.max(...rows.map((row) => row.count));
  const windowStart =
    rows.find((row) => row.count === count)?.window_start ?? rows[0]?.window_start ?? "";
  return { count, windowStart };
}

export async function beginPasswordAttempt(
  env: AppEnv,
  request: Request,
  email: string,
  now = Date.now(),
): Promise<PasswordAttemptReservation> {
  const buckets = await passwordAttemptBuckets(env, email, passwordAttemptSource(request, env));
  const nowIso = new Date(now).toISOString();
  const expiredBefore = new Date(now - PASSWORD_LOCKOUT_MS).toISOString();
  const rows: RateLimitRow[] = [];

  const ip = await reserveAttempt(env, buckets.ip, nowIso, expiredBefore);
  if (!ip) {
    throw passwordLockoutError(await lockedRetryAfter(env, buckets.ip, now));
  }
  rows.push(ip);

  if (buckets.account) {
    const account = await reserveAttempt(env, buckets.account, nowIso, expiredBefore);
    if (!account) {
      throw passwordLockoutError(await lockedRetryAfter(env, buckets.account, now));
    }
    rows.push(account);
  }
  return combinedReservation(rows);
}

export async function clearPasswordAttempts(
  env: AppEnv,
  request: Request,
  email: string,
): Promise<void> {
  const buckets = await passwordAttemptBuckets(env, email, passwordAttemptSource(request, env));
  const keys = [buckets.account, buckets.ip].filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;
  await run(
    env.DB,
    `DELETE FROM rate_limits WHERE bucket IN (${keys.map(() => "?").join(", ")})`,
    ...keys,
  );
}

export function rejectIfPasswordLocked(
  attempt: PasswordAttemptReservation,
  now = Date.now(),
): void {
  if (attempt.count < PASSWORD_LOCKOUT_FAILURES) return;
  throw passwordLockoutError(retryAfterSeconds(attempt.windowStart, now));
}

export function isPasswordSignInPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, "") === "/api/auth/sign-in/email";
}

export async function peekSignInEmail(request: Request): Promise<string> {
  try {
    const text = await request.clone().text();
    if (text.length > JSON_LIMIT_BYTES) return "";
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const email = (body as { email?: unknown }).email;
      if (typeof email === "string") return normalizePasswordAttemptEmail(email);
    }
  } catch {
    // Invalid JSON is not an account-existence signal.
  }
  return "";
}

function passwordSignInFailed(): AppError {
  return new AppError("UNAUTHORIZED", PASSWORD_SIGNIN_FAILED);
}

function sessionCookieFromResponse(response: Response): string | undefined {
  for (const value of response.headers.getSetCookie()) {
    const cookie = value
      .split(";")
      .map((part) => part.trim())
      .find(
        (part) =>
          part.startsWith("__Secure-better-auth.session_token=") ||
          part.startsWith("better-auth.session_token="),
      );
    if (cookie) return cookie;
  }
  return undefined;
}

async function admitPasswordSignIn(request: Request, env: AppEnv, response: Response) {
  const cookie = sessionCookieFromResponse(response);
  if (!cookie) throw passwordSignInFailed();
  await requireAdmin(new Request(request.url, { headers: { cookie } }), env);
}

export async function handlePasswordSignIn(
  request: Request,
  env: AppEnv,
  now = Date.now(),
): Promise<Response> {
  const requestId = requestIdFrom(request);
  try {
    if (request.method !== "POST") {
      return createAdminSessionAuth(env, false, request).handler(request);
    }
    const email = await peekSignInEmail(request);
    const attempt = await beginPasswordAttempt(env, request, email, now);
    const response = await createAdminSessionAuth(env, false, request).handler(request);
    if (response.ok) {
      try {
        await admitPasswordSignIn(request, env, response);
      } catch (error) {
        await response.body?.cancel();
        if (error instanceof AppError && error.code === "RATE_LIMITED") throw error;
        if (
          error instanceof AppError &&
          (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN")
        ) {
          rejectIfPasswordLocked(attempt, now);
          throw passwordSignInFailed();
        }
        throw error;
      }
      await clearPasswordAttempts(env, request, email);
      return response;
    }
    await response.body?.cancel();
    rejectIfPasswordLocked(attempt, now);
    throw passwordSignInFailed();
  } catch (error) {
    return errorResponse(error, requestId);
  }
}
