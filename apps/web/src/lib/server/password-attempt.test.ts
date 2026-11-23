import { AppError } from "@kaiyue/contracts";
import { describe, expect, it } from "vitest";
import { createTestEnv } from "../../../../../tests/helpers/memory-d1.ts";
import { JSON_LIMIT_BYTES, errorResponse } from "./http.ts";
import {
  PASSWORD_LOCKOUT_FAILURES,
  PASSWORD_LOCKOUT_MESSAGE,
  PASSWORD_LOCKOUT_MS,
  beginPasswordAttempt,
  clearPasswordAttempts,
  handlePasswordSignIn,
  isPasswordSignInPath,
  passwordAttemptBuckets,
  passwordAttemptSource,
  peekSignInEmail,
  rejectIfPasswordLocked,
  trustClientForwardedIp,
} from "./password-attempt.ts";

const secret = "test-only-isolated-d1-secret-0123456789abcdef";
const email = "lockout-staff@example.invalid";

function attemptRequest(ip: string, extraHeaders?: Record<string, string>) {
  return new Request("https://admin-staging.kaiyuemacau.com/api/auth/sign-in/email", {
    method: "POST",
    headers: { "cf-connecting-ip": ip, ...extraHeaders },
  });
}

async function storedCount(env: ReturnType<typeof createTestEnv>, bucket: string) {
  return env.DB.prepare("SELECT count, window_start FROM rate_limits WHERE bucket = ?")
    .bind(bucket)
    .first<{ count: number; window_start: string }>();
}

describe("password attempt lockout", () => {
  it("treats trailing slashes as the shared password sign-in path", () => {
    expect(isPasswordSignInPath("/api/auth/sign-in/email")).toBe(true);
    expect(isPasswordSignInPath("/api/auth/sign-in/email/")).toBe(true);
    expect(isPasswordSignInPath("/api/auth/sign-up/email")).toBe(false);
  });

  it("prefers cf-connecting-ip and ignores client XFF on hosted Cloudflare", () => {
    const hosted = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" });
    const local = createTestEnv({ ENVIRONMENT: "development" });
    const withCf = attemptRequest("203.0.113.9", { "x-forwarded-for": "198.51.100.1, 10.0.0.1" });
    expect(passwordAttemptSource(withCf, hosted)).toBe("203.0.113.9");
    expect(trustClientForwardedIp(hosted, withCf)).toBe(false);
    expect(
      passwordAttemptSource(
        new Request("https://admin-staging.kaiyuemacau.com/login", {
          headers: { "x-forwarded-for": "198.51.100.2, 10.0.0.1" },
        }),
        hosted,
      ),
    ).toBe("untrusted");
    const localForwarded = new Request("http://localhost:4321/login", {
      headers: { "x-forwarded-for": "198.51.100.3, 10.0.0.1" },
    });
    expect(trustClientForwardedIp(local, localForwarded)).toBe(true);
    expect(passwordAttemptSource(localForwarded, local)).toBe("198.51.100.3");
    expect(
      trustClientForwardedIp(
        local,
        new Request("https://kaiyue-travel.example.workers.dev/login", {
          headers: { "x-forwarded-for": "198.51.100.4" },
        }),
      ),
    ).toBe(false);
  });

  it("stores hashed account and IP buckets, never the email or IP", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.10");
    await beginPasswordAttempt(env, request, ` ${email.toUpperCase()} `);
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.10");
    const rows = await env.DB.prepare("SELECT bucket FROM rate_limits").all<{ bucket: string }>();
    const stored = (rows.results ?? []).map((row) => row.bucket);
    expect(stored).toEqual(expect.arrayContaining([buckets.account, buckets.ip]));
    expect(stored.join(" ")).not.toMatch(/lockout-staff|203\.0\.113\.10|aaaaaa/i);
    expect(buckets.account).toMatch(/^signin:acct:[0-9a-f]{64}$/);
    expect(buckets.ip).toMatch(/^signin:ip:[0-9a-f]{64}$/);
  });

  it("reserves two failures then locks the third reservation's next attempt", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.11");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    const first = await beginPasswordAttempt(env, request, email, now);
    const second = await beginPasswordAttempt(env, request, email, now + 1_000);
    const third = await beginPasswordAttempt(env, request, email, now + 2_000);
    expect(first.count).toBe(1);
    expect(second.count).toBe(2);
    expect(third.count).toBe(3);
    expect(() => rejectIfPasswordLocked(first, now)).not.toThrow();
    expect(() => rejectIfPasswordLocked(second, now + 1_000)).not.toThrow();
    expect(() => rejectIfPasswordLocked(third, now + 2_000)).toThrowError(AppError);
    await expect(beginPasswordAttempt(env, request, email, now + 3_000)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429,
      message: PASSWORD_LOCKOUT_MESSAGE,
      retryAfter: 299,
    });
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.11");
    const row = await storedCount(env, buckets.account!);
    expect(row?.count).toBe(PASSWORD_LOCKOUT_FAILURES);
    expect(row?.window_start).toBe(third.windowStart);
  });

  it("does not verify a locked attempt or extend window_start", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.12");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    await beginPasswordAttempt(env, request, email, now);
    await beginPasswordAttempt(env, request, email, now + 1_000);
    const third = await beginPasswordAttempt(env, request, email, now + 2_000);
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.12");
    await expect(beginPasswordAttempt(env, request, email, now + 60_000)).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryAfter: 242,
    });
    const after = await storedCount(env, buckets.account!);
    expect(after?.count).toBe(3);
    expect(after?.window_start).toBe(third.windowStart);
  });

  it("expires after five minutes and treats the next attempt as the first", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.13");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    await beginPasswordAttempt(env, request, email, now);
    await beginPasswordAttempt(env, request, email, now + 1_000);
    await beginPasswordAttempt(env, request, email, now + 2_000);
    await expect(beginPasswordAttempt(env, request, email, now + 3_000)).rejects.toMatchObject({
      status: 429,
    });
    const restored = await beginPasswordAttempt(
      env,
      request,
      email,
      now + 2_000 + PASSWORD_LOCKOUT_MS + 1,
    );
    expect(restored.count).toBe(1);
  });

  it("clears both buckets after a successful sign-in", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.14");
    await beginPasswordAttempt(env, request, email);
    await beginPasswordAttempt(env, request, email);
    await clearPasswordAttempts(env, request, email);
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.14");
    expect(await storedCount(env, buckets.account!)).toBeNull();
    expect(await storedCount(env, buckets.ip)).toBeNull();
    const next = await beginPasswordAttempt(env, request, email);
    expect(next.count).toBe(1);
  });

  it("locks the account across IP rotation and the IP across account rotation", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    const ipA = attemptRequest("203.0.113.15");
    const ipB = attemptRequest("203.0.113.16");
    await beginPasswordAttempt(env, ipA, email, now);
    await beginPasswordAttempt(env, ipB, email, now + 1);
    await beginPasswordAttempt(env, ipA, email, now + 2);
    await expect(
      beginPasswordAttempt(env, attemptRequest("203.0.113.17"), email, now + 3),
    ).rejects.toMatchObject({ status: 429 });

    const other = "other-lockout@example.invalid";
    const shared = attemptRequest("203.0.113.18");
    await beginPasswordAttempt(env, shared, "a@example.invalid", now);
    await beginPasswordAttempt(env, shared, "b@example.invalid", now + 1);
    await beginPasswordAttempt(env, shared, "c@example.invalid", now + 2);
    await expect(beginPasswordAttempt(env, shared, other, now + 3)).rejects.toMatchObject({
      status: 429,
    });
    const otherBuckets = await passwordAttemptBuckets(env, other, "203.0.113.18");
    expect(await storedCount(env, otherBuckets.account!)).toBeNull();
  });

  it("keeps the first two failures until a third attempt even after five minutes", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.21");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    await beginPasswordAttempt(env, request, email, now);
    await beginPasswordAttempt(env, request, email, now + 1_000);
    const third = await beginPasswordAttempt(
      env,
      request,
      email,
      now + PASSWORD_LOCKOUT_MS + 60_000,
    );
    expect(third.count).toBe(3);
  });

  it("does not let parallel reservations exceed three", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.19");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => beginPasswordAttempt(env, request, email, now)),
    );
    const reserved = results.filter((result) => result.status === "fulfilled");
    const locked = results.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof AppError &&
        result.reason.code === "RATE_LIMITED",
    );
    expect(reserved).toHaveLength(PASSWORD_LOCKOUT_FAILURES);
    expect(locked).toHaveLength(5);
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.19");
    expect((await storedCount(env, buckets.account!))?.count).toBe(3);
  });

  it("sets Retry-After on the generic 429 response", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = attemptRequest("203.0.113.20");
    const now = Date.parse("2026-11-19T12:00:00.000Z");
    await beginPasswordAttempt(env, request, email, now);
    await beginPasswordAttempt(env, request, email, now + 1);
    await beginPasswordAttempt(env, request, email, now + 2);
    try {
      await beginPasswordAttempt(env, request, email, now + 3);
      throw new Error("expected lockout");
    } catch (error) {
      const response = errorResponse(error, "req_lockout");
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("300");
      const body = (await response.json()) as {
        error?: { message?: string; code?: string; retryAfter?: number };
      };
      expect(body.error?.code).toBe("RATE_LIMITED");
      expect(body.error?.message).toBe(PASSWORD_LOCKOUT_MESSAGE);
      expect(body.error?.retryAfter).toBe(300);
      expect(JSON.stringify(body)).not.toMatch(/lockout-staff|example\.invalid/i);
    }
  });
});

function signInUrl() {
  return "https://admin-staging.kaiyuemacau.com/api/auth/sign-in/email";
}

function chunkedSignInRequest(
  enqueue: (controller: ReadableStreamDefaultController<Uint8Array>) => void,
  onCancel: () => void,
) {
  return new Request(signInUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.90" },
    duplex: "half",
    body: new ReadableStream<Uint8Array>({
      pull(controller) {
        enqueue(controller);
      },
      cancel() {
        onCancel();
      },
    }),
  } as RequestInit);
}

describe("password sign-in body bound", () => {
  it("peeks a normalized email from a small JSON body", async () => {
    const request = new Request(signInUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: ` ${email.toUpperCase()} `, password: "aaaaaa" }),
    });
    await expect(peekSignInEmail(request)).resolves.toBe(email);
  });

  it("still reserves the limiter for a small JSON sign-in body", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = new Request(signInUrl(), {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.92" },
      body: JSON.stringify({ email, password: "wrong-password" }),
    });
    const response = await handlePasswordSignIn(request, env);
    expect(response.status).not.toBe(413);
    const buckets = await passwordAttemptBuckets(env, email, "203.0.113.92");
    expect(await storedCount(env, buckets.account!)).not.toBeNull();
  });

  it("returns 413 for oversized ASCII without swallowing into auth", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const request = new Request(signInUrl(), {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.91" },
      body: JSON.stringify({
        email,
        password: "a".repeat(JSON_LIMIT_BYTES),
      }),
    });
    const response = await handlePasswordSignIn(request, env);
    expect(response.status).toBe(413);
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toBe("VALIDATION_FAILED");
    expect(body.error?.message).toBe("Request is too large.");
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM rate_limits").first<{
      n: number;
    }>();
    expect(Number(rows?.n ?? -1)).toBe(0);
  });

  it("uses UTF-8 byte length so multibyte JSON under the character limit is still 413", async () => {
    const pad = "€".repeat(5_459);
    const payload = `{"email":"${email}","pad":"${pad}"}`;
    expect(payload.length).toBeLessThanOrEqual(JSON_LIMIT_BYTES);
    expect(new TextEncoder().encode(payload).byteLength).toBeGreaterThan(JSON_LIMIT_BYTES);
    const request = new Request(signInUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
    });
    await expect(peekSignInEmail(request)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      status: 413,
    });
  });

  it("cancels a chunked body as soon as the byte bound is exceeded", async () => {
    const chunk = new Uint8Array(4_096).fill(0x61);
    let pulls = 0;
    let cancelled = false;
    const request = chunkedSignInRequest(
      (controller) => {
        pulls += 1;
        if (pulls > 8) {
          controller.error(new Error("source read past the sign-in byte bound"));
          return;
        }
        controller.enqueue(chunk);
      },
      () => {
        cancelled = true;
      },
    );
    await expect(peekSignInEmail(request)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
    expect(pulls).toBe(5);
  });

  it("does not delegate a chunked oversize POST to auth or the limiter", async () => {
    const env = createTestEnv({ BETTER_AUTH_SECRET: secret });
    const chunk = new Uint8Array(4_096).fill(0x61);
    let pulls = 0;
    let cancelled = false;
    const request = chunkedSignInRequest(
      (controller) => {
        pulls += 1;
        if (pulls > 8) {
          controller.error(new Error("auth delegated an unbounded sign-in body"));
          return;
        }
        controller.enqueue(chunk);
      },
      () => {
        cancelled = true;
      },
    );
    const response = await handlePasswordSignIn(request, env);
    expect(response.status).toBe(413);
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThanOrEqual(5);
    const rows = await env.DB.prepare("SELECT COUNT(*) AS n FROM rate_limits").first<{
      n: number;
    }>();
    expect(Number(rows?.n ?? -1)).toBe(0);
  });
});
