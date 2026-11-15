import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { ACCESS_ADMIN_HOST } from "../../apps/web/src/lib/server/admin-gate.ts";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS,
  createAdminSessionAuth,
} from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin } from "../../apps/web/src/lib/server/auth.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const site = "http://localhost:4321";
const email = "local-auth-test@example.invalid";
const currentPassword = "local-only-test-password-2026";
const nextPassword = "local-only-test-password-2026b";
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

function jsonHeaders(cookie?: string, origin = site): HeadersInit {
  return {
    "content-type": "application/json",
    origin,
    ...(cookie ? { cookie } : {}),
  };
}

async function signUp(target: AppEnv): Promise<Response> {
  const setupAuth = createAdminSessionAuth(target, true, new Request(`${site}/api/auth/ok`));
  return setupAuth.handler(
    new Request(`${site}/api/auth/sign-up/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ name: "Local Test Operator", email, password: currentPassword }),
    }),
  );
}

async function signIn(
  target: AppEnv,
  password: string,
): Promise<{ status: number; cookie?: string }> {
  const auth = createAdminSessionAuth(target, false, new Request(`${site}/api/auth/ok`));
  const login = await auth.handler(
    new Request(`${site}/api/auth/sign-in/email`, {
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
    ENVIRONMENT: "development",
    PUBLIC_SITE_URL: site,
    BETTER_AUTH_SECRET: secret,
    ADMIN_EMAILS: email,
    DEV_ADMIN_BYPASS: "false",
  };
  const migration = readFileSync(
    fileURLToPath(new URL("../../migrations/0004_admin_auth.sql", import.meta.url)),
    "utf8",
  )
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  await env.DB.exec(migration);
  expect((await signUp(env)).status).toBe(200);
}, 30_000);

afterAll(async () => {
  await platform?.dispose();
});

describe("admin profile password change", () => {
  it("rejects unauthenticated, wrong, short, and escalation attempts, then changes the signed-in user's password", async () => {
    expect(ADMIN_PASSWORD_MIN_LENGTH).toBe(12);

    const unauthenticated = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      env,
    );
    expect(unauthenticated.status).toBe(401);

    const first = await signIn(env, currentPassword);
    expect(first.status).toBe(200);
    const cookie = first.cookie!;
    const second = await signIn(env, currentPassword);
    expect(second.status).toBe(200);
    const otherCookie = second.cookie!;

    const wrong = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword: "local-only-wrong-password",
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      env,
    );
    expect(wrong.status).toBe(422);
    const wrongBody = (await wrong.json()) as { error?: { message?: string } };
    expect(wrongBody.error?.message).toBe("Current password is incorrect.");

    const short = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: "shortpass",
          confirmPassword: "shortpass",
        }),
      }),
      env,
    );
    expect(short.status).toBe(422);

    const escalate = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
          userId: "someone-else",
        }),
      }),
      env,
    );
    expect(escalate.status).toBe(403);

    const roleEscalate = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
          role: "primary",
        }),
      }),
      env,
    );
    expect(roleEscalate.status).toBe(403);

    const rolePost = await handleApi(
      new Request(`${site}/api/v1/admin/profile/role`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({ role: "primary" }),
      }),
      env,
    );
    expect(rolePost.status).toBe(403);

    const unprovisionedUsers = await handleApi(
      new Request(`${site}/api/v1/admin/users`, { headers: jsonHeaders(cookie) }),
      env,
    );
    expect(unprovisionedUsers.status).toBe(403);

    const mismatch = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: `${nextPassword}x`,
        }),
      }),
      env,
    );
    expect(mismatch.status).toBe(422);

    const changed = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(cookie),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      env,
    );
    expect(changed.status).toBe(200);
    const currentJar = cookieJar(changed);
    expect(currentJar).toContain("better-auth.session_token=");

    const currentIdentity = await requireAdmin(
      new Request(`${site}/admin`, { headers: { cookie: currentJar } }),
      env,
    );
    expect(currentIdentity.email).toBe(email);

    expect(ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS).toBe(60);
    const otherAuth = createAdminSessionAuth(env, false, new Request(`${site}/admin`));
    const otherWithoutCache = await otherAuth.api.getSession({
      headers: new Headers({ cookie: otherCookie }),
      query: { disableCookieCache: true },
    });
    expect(otherWithoutCache).toBeNull();

    expect((await signIn(env, currentPassword)).status).not.toBe(200);
    const renewed = await signIn(env, nextPassword);
    expect(renewed.status).toBe(200);
    const identity = await requireAdmin(
      new Request(`${site}/admin`, { headers: { cookie: renewed.cookie! } }),
      env,
    );
    expect(identity.email).toBe(email);
  }, 30_000);

  it("keeps public production hosts fail-closed, including profile password", async () => {
    const production = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" });
    const response = await handleApi(
      new Request("https://kaiyuemacau.com/api/v1/admin/profile/password", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://kaiyuemacau.com",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      production,
    );
    expect(response.status).toBe(403);
  });

  it("does not treat DEV_ADMIN_BYPASS as a password-change identity", async () => {
    const bypass = createTestEnv({
      DEV_ADMIN_BYPASS: "true",
      BETTER_AUTH_SECRET: secret,
      ADMIN_EMAILS: email,
    });
    const response = await handleApi(
      new Request(`${site}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: jsonHeaders(),
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      bypass,
    );
    expect(response.status).toBe(403);
  });

  it("does not open Access-configured dedicated host password routes", async () => {
    const accessEnv = createTestEnv({
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
      ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com",
      ACCESS_AUD: "admin-audience",
    });
    const response = await handleApi(
      new Request(`https://${ACCESS_ADMIN_HOST}/api/v1/admin/profile/password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: `https://${ACCESS_ADMIN_HOST}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword: nextPassword,
          confirmPassword: nextPassword,
        }),
      }),
      accessEnv,
    );
    expect(response.status).toBe(403);
  });
});
