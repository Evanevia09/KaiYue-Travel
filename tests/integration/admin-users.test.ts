import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { createAdminSessionAuth } from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin } from "../../apps/web/src/lib/server/auth.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";

const site = "http://localhost:4321";
const superEmail = "super-admin-test@example.invalid";
const staffEmail = "staff-user-test@example.invalid";
const createdEmail = "created-staff-test@example.invalid";
const superPassword = "local-only-super-password-2026";
const staffPassword = "local-only-staff-password-2026";
const resetPassword = "local-only-reset-password-2026";
const createdPassword = "local-only-created-password-2026";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;
let superId = "";
let staffId = "";

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

async function execSql(sql: string): Promise<void> {
  const stripped = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  await env.DB.exec(stripped);
}

async function signUp(email: string, password: string, name: string): Promise<Response> {
  const setupAuth = createAdminSessionAuth(env, true, new Request(`${site}/api/auth/ok`));
  return setupAuth.handler(
    new Request(`${site}/api/auth/sign-up/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ name, email, password }),
    }),
  );
}

async function signIn(
  email: string,
  password: string,
): Promise<{ status: number; cookie: string }> {
  const auth = createAdminSessionAuth(env, false, new Request(`${site}/api/auth/ok`));
  const login = await auth.handler(
    new Request(`${site}/api/auth/sign-in/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password }),
    }),
  );
  return { status: login.status, cookie: cookieJar(login) };
}

async function userIdFor(email: string): Promise<string> {
  const row = await env.DB.prepare('SELECT id FROM "user" WHERE lower(email) = ?')
    .bind(email)
    .first<{ id: string }>();
  if (!row?.id) {
    throw new Error(`missing user ${email}`);
  }
  return row.id;
}

async function insertOperator(userId: string, role: "super_admin" | "staff"): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, ?, 1, ?, ?, 'test')`,
  )
    .bind(userId, role, now, now)
    .run();
}

async function api(
  path: string,
  init: { method?: string; cookie?: string; body?: unknown },
): Promise<Response> {
  return handleApi(
    new Request(`${site}${path}`, {
      method: init.method ?? "GET",
      headers: jsonHeaders(init.cookie),
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    }),
    env,
  );
}

async function d1Session(userId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
    .bind(userId)
    .first<{ n: number }>();
  return Number(row?.n ?? 0);
}

async function cachedSession(cookie: string, disableCookieCache = false) {
  const auth = createAdminSessionAuth(env, false, new Request(`${site}/api/auth/ok`));
  return auth.api.getSession({
    headers: new Headers({ cookie }),
    query: disableCookieCache ? { disableCookieCache: true } : undefined,
  });
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
    ADMIN_EMAILS: superEmail,
    DEV_ADMIN_BYPASS: "false",
  };
  await execSql(
    readFileSync(
      fileURLToPath(new URL("../../migrations/0004_admin_auth.sql", import.meta.url)),
      "utf8",
    ),
  );
  await execSql(
    readFileSync(
      fileURLToPath(new URL("../../migrations/0009_admin_operator.sql", import.meta.url)),
      "utf8",
    ),
  );
  expect((await signUp(superEmail, superPassword, "Synthetic Super")).status).toBe(200);
  expect((await signUp(staffEmail, staffPassword, "Synthetic Staff")).status).toBe(200);
  superId = await userIdFor(superEmail);
  staffId = await userIdFor(staffEmail);
  await insertOperator(superId, "super_admin");
  await insertOperator(staffId, "staff");
}, 30_000);

afterAll(async () => {
  await platform?.dispose();
});

describe("super-admin user management", () => {
  it("denies unauthenticated and staff access, while staff keeps the dashboard", async () => {
    const unauth = await api("/api/v1/admin/users", {});
    expect(unauth.status).toBe(401);

    const staff = await signIn(staffEmail, staffPassword);
    expect(staff.status).toBe(200);
    const staffList = await api("/api/v1/admin/users", { cookie: staff.cookie });
    expect(staffList.status).toBe(403);
    const staffCreate = await api("/api/v1/admin/users", {
      method: "POST",
      cookie: staff.cookie,
      body: {
        name: "Denied",
        email: "denied-staff@example.invalid",
        password: createdPassword,
        confirmPassword: createdPassword,
      },
    });
    expect(staffCreate.status).toBe(403);
    const staffPromote = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: staff.cookie,
      body: { role: "super_admin" },
    });
    expect(staffPromote.status).toBe(403);
    const profileRole = await api("/api/v1/admin/profile/role", {
      method: "POST",
      cookie: staff.cookie,
      body: { role: "super_admin" },
    });
    expect(profileRole.status).toBe(403);
    const profile = await api("/api/v1/admin/profile", { cookie: staff.cookie });
    expect(profile.status).toBe(200);
    const profileBody = (await profile.json()) as { role?: string };
    expect(profileBody.role).toBe("staff");
    const staffActor = await requireAdmin(
      new Request(`${site}/api/v1/admin/summary`, { headers: jsonHeaders(staff.cookie) }),
      env,
    );
    expect(staffActor.operatorRole).toBe("staff");
  });

  it("lets a super admin list, create staff, persist roles, and refuse a third role", async () => {
    const superUser = await signIn(superEmail, superPassword);
    expect(superUser.status).toBe(200);
    const listed = await api("/api/v1/admin/users", { cookie: superUser.cookie });
    expect(listed.status).toBe(200);
    const listedBody = (await listed.json()) as {
      items: Array<{ email: string; role: string; enabled: boolean; password?: string }>;
    };
    expect(JSON.stringify(listedBody)).not.toMatch(/"password"\s*:/i);
    expect(listedBody.items.map((item) => item.email).sort()).toEqual([staffEmail, superEmail]);
    expect(listedBody.items.find((item) => item.email === superEmail)?.role).toBe("super_admin");
    expect(listedBody.items.find((item) => item.email === staffEmail)?.role).toBe("staff");

    const created = await api("/api/v1/admin/users", {
      method: "POST",
      cookie: superUser.cookie,
      body: {
        name: "Created Staff",
        email: createdEmail,
        password: createdPassword,
        confirmPassword: createdPassword,
      },
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as {
      item: { id: string; role: string; email: string };
    };
    expect(createdBody.item.role).toBe("staff");
    expect(createdBody.item.email).toBe(createdEmail);
    expect(JSON.stringify(createdBody)).not.toMatch(/"password"\s*:/i);

    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind(createdBody.item.id)
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("staff");
    expect(Number(stored?.enabled)).toBe(1);

    const forbiddenCreate = await api("/api/v1/admin/users", {
      method: "POST",
      cookie: superUser.cookie,
      body: {
        name: "Escalation",
        email: "escalation@example.invalid",
        password: createdPassword,
        confirmPassword: createdPassword,
        role: "super_admin",
      },
    });
    expect(forbiddenCreate.status).toBe(403);

    const thirdRole = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { role: "admin" },
    });
    expect(thirdRole.status).toBe(403);

    const createdLogin = await signIn(createdEmail, createdPassword);
    expect(createdLogin.status).toBe(200);
    const createdDashboard = await api("/api/v1/admin/profile", { cookie: createdLogin.cookie });
    expect(createdDashboard.status).toBe(200);
    const createdUsers = await api("/api/v1/admin/users", { cookie: createdLogin.cookie });
    expect(createdUsers.status).toBe(403);
  });

  it("protects the last enabled super admin and revokes sessions on disable, reset, and privilege change", async () => {
    const superUser = await signIn(superEmail, superPassword);
    const demoteLast = await api(`/api/v1/admin/users/${superId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { role: "staff" },
    });
    expect(demoteLast.status).toBe(403);
    const disableLast = await api(`/api/v1/admin/users/${superId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { enabled: false },
    });
    expect(disableLast.status).toBe(403);

    const firstStaffSession = await signIn(staffEmail, staffPassword);
    const secondStaffSession = await signIn(staffEmail, staffPassword);
    expect(firstStaffSession.status).toBe(200);
    expect(secondStaffSession.status).toBe(200);
    const promote = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { role: "super_admin" },
    });
    expect(promote.status).toBe(200);
    const persisted = await env.DB.prepare("SELECT role FROM admin_operator WHERE user_id = ?")
      .bind(staffId)
      .first<{ role: string }>();
    expect(persisted?.role).toBe("super_admin");
    expect(await d1Session(staffId)).toBe(0);
    expect(await cachedSession(firstStaffSession.cookie, true)).toBeNull();
    expect(await cachedSession(secondStaffSession.cookie, true)).toBeNull();

    const demoteExtra = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { role: "staff" },
    });
    expect(demoteExtra.status).toBe(200);
    const staffRole = await env.DB.prepare("SELECT role FROM admin_operator WHERE user_id = ?")
      .bind(staffId)
      .first<{ role: string }>();
    expect(staffRole?.role).toBe("staff");

    const liveStaff = await signIn(staffEmail, staffPassword);
    const otherStaff = await signIn(staffEmail, staffPassword);
    const disabled = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { enabled: false },
    });
    expect(disabled.status).toBe(200);
    expect(await d1Session(staffId)).toBe(0);
    expect(await cachedSession(liveStaff.cookie, true)).toBeNull();
    expect(await cachedSession(otherStaff.cookie, true)).toBeNull();
    await expect(
      requireAdmin(
        new Request(`${site}/api/v1/admin/summary`, { headers: jsonHeaders(liveStaff.cookie) }),
        env,
      ),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      requireAdmin(
        new Request(`${site}/api/v1/admin/summary`, { headers: jsonHeaders(otherStaff.cookie) }),
        env,
      ),
    ).rejects.toMatchObject({ status: 401 });
    const disabledLogin = await signIn(staffEmail, staffPassword);
    expect(disabledLogin.status).toBe(200);
    await expect(
      requireAdmin(
        new Request(`${site}/api/v1/admin/summary`, {
          headers: jsonHeaders(disabledLogin.cookie),
        }),
        env,
      ),
    ).rejects.toMatchObject({ status: 401 });

    const reenabled = await api(`/api/v1/admin/users/${staffId}`, {
      method: "PATCH",
      cookie: superUser.cookie,
      body: { enabled: true },
    });
    expect(reenabled.status).toBe(200);
    const beforeReset = await signIn(staffEmail, staffPassword);
    const reset = await api(`/api/v1/admin/users/${staffId}/password`, {
      method: "POST",
      cookie: superUser.cookie,
      body: { password: resetPassword, confirmPassword: resetPassword },
    });
    expect(reset.status).toBe(200);
    expect(JSON.stringify(await reset.json())).not.toMatch(/"password"\s*:/i);
    expect(await d1Session(staffId)).toBe(0);
    expect(await cachedSession(beforeReset.cookie, true)).toBeNull();
    const oldPassword = await signIn(staffEmail, staffPassword);
    expect(oldPassword.status).not.toBe(200);
    const newPassword = await signIn(staffEmail, resetPassword);
    expect(newPassword.status).toBe(200);
    expect((await api("/api/v1/admin/profile", { cookie: newPassword.cookie })).status).toBe(200);
    expect((await api("/api/v1/admin/users", { cookie: newPassword.cookie })).status).toBe(403);
  }, 30_000);
});
