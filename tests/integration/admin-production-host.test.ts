import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { ACCESS_ADMIN_HOST } from "../../apps/web/src/lib/server/admin-gate.ts";
import { ADMIN_ROLE_PRIMARY } from "../../apps/web/src/lib/server/admin-primary.ts";
import { passwordSignupGate } from "../../apps/web/src/lib/server/admin-signup.ts";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  createAdminSessionAuth,
} from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin, requireSameOrigin } from "../../apps/web/src/lib/server/auth.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";

const origin = `https://${ACCESS_ADMIN_HOST}`;
const publicOrigin = "https://kaiyuemacau.com";
const primaryEmail = "primary-operator@example.invalid";
const staffEmail = "staff-operator@example.invalid";
const currentPassword = "production-host-test-password";
const nextPassword = "production-host-test-password-b";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;

function cookieJar(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((part) => part.split(";")[0] ?? "")
    .filter((part) => part.includes("="))
    .join("; ");
}

function jsonHeaders(cookie?: string, requestOrigin = origin): HeadersInit {
  return {
    "content-type": "application/json",
    origin: requestOrigin,
    ...(cookie ? { cookie } : {}),
  };
}

function execMigration(target: AppEnv, file: string) {
  const sql = readFileSync(fileURLToPath(new URL(file, import.meta.url)), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  return target.DB.exec(sql);
}

async function signUp(target: AppEnv, email: string, password: string): Promise<Response> {
  const setupAuth = createAdminSessionAuth(target, true, new Request(`${origin}/api/auth/ok`));
  return setupAuth.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ name: "Production Host Operator", email, password }),
    }),
  );
}

async function signIn(
  target: AppEnv,
  email: string,
  password: string,
): Promise<{ status: number; cookie: string }> {
  const auth = createAdminSessionAuth(target, false, new Request(`${origin}/api/auth/ok`));
  const login = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password }),
    }),
  );
  return { status: login.status, cookie: cookieJar(login) };
}

beforeAll(async () => {
  platform = await getPlatformProxy({
    configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
    persist: false,
  });
  env = {
    ...(platform.env as AppEnv),
    ENVIRONMENT: "production",
    PUBLIC_SITE_URL: publicOrigin,
    BETTER_AUTH_SECRET: secret,
    ADMIN_EMAILS: `${primaryEmail},${staffEmail}`,
    ADMIN_PRIMARY_EMAIL: primaryEmail,
    DEV_ADMIN_BYPASS: "false",
    TEMP_ADMIN_EXPIRES_AT: "2020-01-01T00:00:00.000Z",
    ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
  };
  await execMigration(env, "../../migrations/0004_admin_auth.sql");
  await execMigration(env, "../../migrations/0009_admin_operator.sql");
  await execMigration(env, "../../migrations/0010_admin_operator_last_super.sql");
  expect((await signUp(env, primaryEmail, currentPassword)).status).toBe(200);
  expect((await signUp(env, staffEmail, currentPassword)).status).toBe(200);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     SELECT id, 'super_admin', 1, ?, ?, 'production-bootstrap' FROM "user" WHERE email = ?`,
  )
    .bind(now, now, primaryEmail)
    .run();
}, 30_000);

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await platform?.dispose();
});

describe("production dedicated admin host password login", () => {
  it("accepts the bootstrapped super admin and own password change, then rejects other sessions in D1", async () => {
    expect(ADMIN_PASSWORD_MIN_LENGTH).toBe(12);
    expect(currentPassword.length).toBeGreaterThanOrEqual(ADMIN_PASSWORD_MIN_LENGTH);
    expect(ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS).toBe(60);

    const first = await signIn(env, primaryEmail, currentPassword);
    expect(first.status).toBe(200);
    const current = await requireAdmin(
      new Request(`${origin}/admin`, { headers: { cookie: first.cookie } }),
      env,
    );
    expect(current.email).toBe(primaryEmail);

    const profile = await handleApi(
      new Request(`${origin}/api/v1/admin/profile`, { headers: jsonHeaders(first.cookie) }),
      env,
    );
    expect(profile.status).toBe(200);
    const profileBody = (await profile.json()) as { role?: string; email?: string };
    expect(profileBody.email).toBe(primaryEmail);
    expect(profileBody.role).toBe("super_admin");

    const other = await signIn(env, primaryEmail, currentPassword);
    expect(other.status).toBe(200);

    const changed = await handleApi(
      new Request(`${origin}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(first.cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      env,
    );
    expect(changed.status).toBe(200);
    const renewedJar = cookieJar(changed);
    const continued = await requireAdmin(
      new Request(`${origin}/admin`, { headers: { cookie: renewedJar } }),
      env,
    );
    expect(continued.email).toBe(primaryEmail);

    const otherAuth = createAdminSessionAuth(env, false, new Request(`${origin}/admin`));
    const otherWithoutCache = await otherAuth.api.getSession({
      headers: new Headers({ cookie: other.cookie }),
      query: { disableCookieCache: true },
    });
    expect(otherWithoutCache).toBeNull();

    const otherRequest = new Request(`${origin}/admin`, { headers: { cookie: other.cookie } });
    const cacheExpiredAt = Date.now() + (ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS + 1) * 1000;
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(cacheExpiredAt);
    await expect(requireAdmin(otherRequest, env)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    vi.useRealTimers();

    expect((await signIn(env, primaryEmail, currentPassword)).status).not.toBe(200);
  }, 30_000);

  it("rejects accounts without an operator row, unallowlisted, bypass, expired UAT policy inheritance, signup, and cross-origin", async () => {
    const staff = await signIn(env, staffEmail, currentPassword);
    expect(staff.status).toBe(200);
    await expect(
      requireAdmin(new Request(`${origin}/admin`, { headers: { cookie: staff.cookie } }), env),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const unlisted = {
      ...env,
      ADMIN_EMAILS: primaryEmail,
      ADMIN_PRIMARY_EMAIL: primaryEmail,
    };
    const staffOnUnlisted = await signIn(unlisted, staffEmail, currentPassword);
    expect(staffOnUnlisted.status).toBe(200);
    await expect(
      requireAdmin(
        new Request(`${origin}/admin`, { headers: { cookie: staffOnUnlisted.cookie } }),
        {
          ...unlisted,
          ADMIN_EMAILS: primaryEmail,
        },
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const bypassEnv = { ...env, DEV_ADMIN_BYPASS: "true" };
    await expect(requireAdmin(new Request(`${origin}/admin`), bypassEnv)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });

    const signup = await passwordSignupGate(
      env,
      new Request(`${origin}/api/auth/sign-up/email`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          name: "Denied",
          email: primaryEmail,
          password: currentPassword,
        }),
      }),
    );
    expect(signup).toMatchObject({ ok: false, status: 404 });

    const mutation = new Request(`${origin}/api/v1/admin/profile/password`, {
      method: "POST",
      headers: jsonHeaders(undefined, publicOrigin),
      body: JSON.stringify({
        currentPassword: nextPassword,
        newPassword: `${nextPassword}z`,
        confirmPassword: `${nextPassword}z`,
      }),
    });
    expect(() => requireSameOrigin(mutation, env)).toThrow(/Cross-origin/);

    const apex = await handleApi(
      new Request(`${publicOrigin}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: publicOrigin,
        },
        body: JSON.stringify({
          currentPassword: nextPassword,
          newPassword: `${nextPassword}z`,
          confirmPassword: `${nextPassword}z`,
        }),
      }),
      env,
    );
    expect(apex.status).toBe(403);

    const rolePost = await handleApi(
      new Request(`${origin}/api/v1/admin/profile/role`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({ role: ADMIN_ROLE_PRIMARY }),
      }),
      env,
    );
    expect(rolePost.status).toBe(401);
  }, 30_000);

  it("does not let ADMIN_PRIMARY_EMAIL grant or remove operator-row privilege", async () => {
    const spoofed = {
      ...env,
      ADMIN_PRIMARY_EMAIL: staffEmail,
      ADMIN_EMAILS: `${primaryEmail},${staffEmail}`,
    };
    const login = await signIn(spoofed, primaryEmail, nextPassword);
    expect(login.status).toBe(200);
    const superIdentity = await requireAdmin(
      new Request(`${origin}/admin`, { headers: { cookie: login.cookie } }),
      spoofed,
    );
    expect(superIdentity.operatorRole).toBe("super_admin");

    const staffLogin = await signIn(spoofed, staffEmail, currentPassword);
    expect(staffLogin.status).toBe(200);
    await expect(
      requireAdmin(
        new Request(`${origin}/admin`, { headers: { cookie: staffLogin.cookie } }),
        spoofed,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const profile = await handleApi(
      new Request(`${origin}/api/v1/admin/profile`, {
        headers: jsonHeaders(staffLogin.cookie),
      }),
      spoofed,
    );
    expect(profile.status).toBe(401);
  }, 30_000);
});
