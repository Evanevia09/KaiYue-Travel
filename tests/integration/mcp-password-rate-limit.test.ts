import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import {
  PRODUCTION_ADMIN_HOST,
  STAGING_ADMIN_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { createAdminSessionAuth } from "../../apps/web/src/lib/server/admin-session.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { handleMcpSession } from "../../apps/web/src/lib/server/mcp-access.ts";
import {
  PASSWORD_LOCKOUT_MESSAGE,
  PASSWORD_LOCKOUT_MS,
  RATE_LIMITS_TABLE_SQL,
  handlePasswordSignIn,
  passwordAttemptBuckets,
} from "../../apps/web/src/lib/server/password-attempt.ts";

const stagingOrigin = `https://${STAGING_ADMIN_HOST}`;
const productionOrigin = `https://${PRODUCTION_ADMIN_HOST}`;
const staffEmail = "mcp-lockout-staff@example.invalid";
const altEmail = "mcp-lockout-alt@example.invalid";
const password = "aaaaaa";
const wrongPassword = "wrong-password";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";
const lockIp = "203.0.113.40";
const altIp = "203.0.113.41";

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;

function execMigration(target: AppEnv, name: string) {
  const sql = readFileSync(
    fileURLToPath(new URL(`../../migrations/${name}`, import.meta.url)),
    "utf8",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return target.DB.exec(sql);
}

async function signUp(email: string): Promise<string> {
  const setupAuth = createAdminSessionAuth(env, true, new Request(`${stagingOrigin}/api/auth/ok`));
  const created = await setupAuth.handler(
    new Request(`${stagingOrigin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: stagingOrigin },
      body: JSON.stringify({ name: "MCP Lockout Test", email, password }),
    }),
  );
  expect(created.status).toBe(200);
  const row = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  expect(row?.id).toBeTruthy();
  return row!.id;
}

async function provision(userId: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, 'staff', 1, ?, ?, 'test')`,
  )
    .bind(userId, now, now)
    .run();
}

function mcpRequest(email: string, secretValue: string, ip: string, host = stagingOrigin) {
  return new Request(`${host}/api/v1/admin/mcp-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({ email, password: secretValue }),
  });
}

function signInRequest(email: string, secretValue: string, ip: string, host = stagingOrigin) {
  return new Request(`${host}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: host,
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({ email, password: secretValue }),
  });
}

async function sessionCount() {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM session").first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function clearLockout(email: string, ip: string) {
  const buckets = await passwordAttemptBuckets(env, email, ip);
  const keys = [buckets.account, buckets.ip].filter((key): key is string => Boolean(key));
  if (keys.length === 0) return;
  await env.DB.prepare(
    `DELETE FROM rate_limits WHERE bucket IN (${keys.map(() => "?").join(", ")})`,
  )
    .bind(...keys)
    .run();
}

describe("password sign-in lockout for MCP and shared auth", () => {
  beforeAll(async () => {
    platform = await getPlatformProxy({
      configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
      persist: false,
    });
    env = {
      ...(platform.env as AppEnv),
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
      BETTER_AUTH_SECRET: secret,
      ADMIN_EMAILS: `${staffEmail},${altEmail}`,
      ADMIN_PRIMARY_EMAIL: staffEmail,
      DEV_ADMIN_BYPASS: "false",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    };
    await env.DB.exec(RATE_LIMITS_TABLE_SQL);
    await execMigration(env, "0004_admin_auth.sql");
    await execMigration(env, "0009_admin_operator.sql");
    await execMigration(env, "0010_admin_operator_last_super.sql");
    const staffId = await signUp(staffEmail);
    const altId = await signUp(altEmail);
    await provision(staffId);
    await provision(altId);
  }, 30_000);

  afterAll(async () => {
    await platform?.dispose();
  });

  it("returns 401 twice, locks on the third failure, and blocks the correct password", async () => {
    await clearLockout(staffEmail, lockIp);
    const first = await handleMcpSession(mcpRequest(staffEmail, wrongPassword, lockIp), env);
    const second = await handleMcpSession(mcpRequest(staffEmail, wrongPassword, lockIp), env);
    const third = await handleMcpSession(mcpRequest(staffEmail, wrongPassword, lockIp), env);
    expect(first.status).toBe(401);
    expect(second.status).toBe(401);
    expect(third.status).toBe(429);
    expect(third.headers.get("Retry-After")).toBeTruthy();
    expect(Number(third.headers.get("Retry-After"))).toBeGreaterThanOrEqual(1);
    expect(Number(third.headers.get("Retry-After"))).toBeLessThanOrEqual(300);
    const thirdBody = (await third.json()) as { error?: { message?: string; code?: string } };
    expect(thirdBody.error?.code).toBe("RATE_LIMITED");
    expect(thirdBody.error?.message).toBe(PASSWORD_LOCKOUT_MESSAGE);

    const sessionsBefore = await sessionCount();
    const blocked = await handleMcpSession(mcpRequest(staffEmail, password, lockIp), env);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(await sessionCount()).toBe(sessionsBefore);
    const blockedBody = (await blocked.json()) as { error?: { message?: string } };
    expect(JSON.stringify(blockedBody)).not.toMatch(/mcp-lockout-staff|aaaaaa/i);
  }, 30_000);

  it("lets the third attempt succeed after two failures, then resets the window", async () => {
    const ip = "203.0.113.42";
    await clearLockout(staffEmail, ip);
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    const success = await handleMcpSession(mcpRequest(staffEmail, password, ip), env);
    expect(success.status).toBe(200);
    const again = await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env);
    expect(again.status).toBe(401);
  }, 30_000);

  it("restores access after the five-minute lock expires", async () => {
    const ip = "203.0.113.43";
    await clearLockout(staffEmail, ip);
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      429,
    );
    const buckets = await passwordAttemptBuckets(env, staffEmail, ip);
    const expired = new Date(Date.now() - PASSWORD_LOCKOUT_MS - 1_000).toISOString();
    await env.DB.prepare("UPDATE rate_limits SET window_start = ? WHERE bucket IN (?, ?)")
      .bind(expired, buckets.account, buckets.ip)
      .run();
    const restored = await handleMcpSession(mcpRequest(staffEmail, password, ip), env);
    expect(restored.status).toBe(200);
  }, 30_000);

  it("does not let parallel MCP sign-ins exceed three password checks", async () => {
    const ip = "203.0.113.44";
    await clearLockout(staffEmail, ip);
    const sessionsBefore = await sessionCount();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env),
      ),
    );
    const statuses = responses.map((response) => response.status);
    const unauthorized = statuses.filter((status) => status === 401).length;
    const limited = statuses.filter((status) => status === 429).length;
    expect(unauthorized + limited).toBe(8);
    expect(unauthorized).toBeLessThanOrEqual(2);
    expect(limited).toBeGreaterThanOrEqual(6);
    expect(statuses.includes(200)).toBe(false);
    const buckets = await passwordAttemptBuckets(env, staffEmail, ip);
    const row = await env.DB.prepare("SELECT count FROM rate_limits WHERE bucket = ?")
      .bind(buckets.account)
      .first<{ count: number }>();
    expect(row?.count).toBe(3);
    expect(await sessionCount()).toBe(sessionsBefore);
  }, 30_000);

  it("blocks the shared /api/auth/sign-in/email route with the same buckets", async () => {
    const ip = "203.0.113.45";
    await clearLockout(staffEmail, ip);
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      401,
    );
    expect((await handleMcpSession(mcpRequest(staffEmail, wrongPassword, ip), env)).status).toBe(
      429,
    );

    const bypass = await handlePasswordSignIn(signInRequest(staffEmail, password, ip), env);
    expect(bypass.status).toBe(429);
    expect(bypass.headers.get("Retry-After")).toBeTruthy();
    const body = (await bypass.json()) as { error?: { message?: string } };
    expect(body.error?.message).toBe(PASSWORD_LOCKOUT_MESSAGE);

    await clearLockout(altEmail, altIp);
    expect(
      (await handlePasswordSignIn(signInRequest(altEmail, wrongPassword, altIp), env)).status,
    ).toBe(401);
    expect(
      (await handlePasswordSignIn(signInRequest(altEmail, wrongPassword, altIp), env)).status,
    ).toBe(401);
    const third = await handlePasswordSignIn(signInRequest(altEmail, wrongPassword, altIp), env);
    expect(third.status).toBe(429);
    const mcpBypass = await handleMcpSession(mcpRequest(altEmail, password, altIp), env);
    expect(mcpBypass.status).toBe(429);
  }, 30_000);

  it("keeps production MCP closed with 404 even after a staging lockout", async () => {
    const production = await handleMcpSession(
      mcpRequest(staffEmail, password, lockIp, productionOrigin),
      env,
    );
    expect(production.status).toBe(404);
  }, 30_000);
});
