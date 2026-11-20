import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { ACCESS_ADMIN_HOST } from "../../apps/web/src/lib/server/admin-gate.ts";
import { VERIFIED_PRODUCTION_PRIMARY_EMAIL } from "../../apps/web/src/lib/server/admin-primary.ts";
import {
  ADMIN_PASSWORD_MIN_LENGTH,
  adminPasswordMinLength,
  createAdminSessionAuth,
} from "../../apps/web/src/lib/server/admin-session.ts";
import { requireAdmin } from "../../apps/web/src/lib/server/auth.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const provisioner = join(repoRoot, "scripts/provision-primary-admin.mjs");
const origin = `https://${ACCESS_ADMIN_HOST}`;
const superEmail = "super-operator@example.invalid";
const staffEmail = "staff-operator@example.invalid";
const outsiderEmail = "outsider@example.invalid";
const password = "production-operator-test-password";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";

const migration = (name: string) =>
  readFileSync(join(repoRoot, "migrations", name), "utf8").replace(/^\s*--.*$/gm, "");

function cookieJar(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((part) => part.split(";")[0] ?? "")
    .filter((part) => part.includes("="))
    .join("; ");
}

function jsonHeaders(cookie?: string): HeadersInit {
  return { "content-type": "application/json", origin, ...(cookie ? { cookie } : {}) };
}

describe("production overlay", () => {
  const text = readFileSync(join(repoRoot, "deploy/production/wrangler.jsonc"), "utf8");
  const config = JSON.parse(text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1")) as {
    name: string;
    account_id: string;
    main: string;
    keep_vars: boolean;
    assets: { directory: string; run_worker_first: unknown };
    d1_databases: Array<{ database_id: string; database_name: string }>;
    r2_buckets: Array<{ bucket_name: string }>;
    send_email?: Array<{
      name: string;
      allowed_sender_addresses?: string[];
      allowed_destination_addresses?: string[];
      destination_address?: string;
    }>;
    vars: Record<string, string>;
  };

  it("targets production bindings with the wrapped Worker entry and Worker-first HTML", () => {
    expect(config.name).toBe("kaiyue-travel");
    expect(config.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(config.main).toBe("../../apps/web/dist/server/entry.mjs");
    expect(config.assets.directory).toBe("../../apps/web/dist/client");
    expect(config.assets.run_worker_first).toBe(true);
    expect(config.d1_databases).toEqual([
      expect.objectContaining({
        database_id: productionD1,
        database_name: "kaiyue-travel-production",
      }),
    ]);
    expect(config.r2_buckets).toEqual([
      { binding: "OFFERS_BUCKET", bucket_name: "kaiyue-offers-production" },
    ]);
  });

  it("keeps vars to the reviewed set with mail prepared, switch off, and no staging knobs", () => {
    expect(config.vars).toEqual({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://kaiyuemacau.com",
      BUSINESS_TIMEZONE: "Asia/Macau",
      BOOKING_NOTICE_HOURS: "24",
      WHATSAPP_NUMBER: "+85363128081",
      DEV_ADMIN_BYPASS: "false",
      NOTIFICATIONS_ENABLED: "false",
      NOTIFY_FROM_EMAIL: "bookings@notify.kaiyuemacau.com",
      NOTIFY_FROM_NAME: "Kai Yue Travel",
      NOTIFY_STAFF_TO: "daniel@kaiyuemacau.com",
    });
    expect(config.vars).not.toHaveProperty("MCP_STAGING_DIRECT_WRITES");
    expect(config.vars).not.toHaveProperty("STAGING_QUOTE_EMAIL_ENABLED");
    expect(config.vars).not.toHaveProperty("ADMIN_EMAILS");
    expect(config.vars).not.toHaveProperty("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(config.vars).not.toHaveProperty("NOTIFY_ALLOWED_RECIPIENTS");
    expect(config.keep_vars).toBe(false);
    expect(config.send_email).toEqual([
      {
        name: "EMAIL",
        allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"],
      },
    ]);
    expect(config.send_email?.[0]).not.toHaveProperty("allowed_destination_addresses");
    expect(config.send_email?.[0]).not.toHaveProperty("destination_address");
    for (const forbidden of [
      stagingD1,
      obsoleteD1,
      "scalingsmb@gmail.com",
      "kaiyue-offers-staging",
    ]) {
      expect(JSON.stringify(config), forbidden).not.toContain(forbidden);
    }
  });
});

let platform: Awaited<ReturnType<typeof getPlatformProxy>>;
let env: AppEnv;

async function signUp(email: string): Promise<void> {
  const setup = createAdminSessionAuth(env, true, new Request(`${origin}/api/auth/ok`));
  const response = await setup.handler(
    new Request(`${origin}/api/auth/sign-up/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ name: email, email, password }),
    }),
  );
  expect(response.status).toBe(200);
}

async function signIn(email: string, target = env, pass = password): Promise<string> {
  const auth = createAdminSessionAuth(target, false, new Request(`${origin}/api/auth/ok`));
  const response = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password: pass }),
    }),
  );
  expect(response.status).toBe(200);
  return cookieJar(response);
}

const admin = (cookie: string, target = env) =>
  requireAdmin(new Request(`${origin}/admin`, { headers: { cookie } }), target);

const api = (path: string, cookie: string, init: RequestInit = {}, target = env) =>
  handleApi(new Request(`${origin}${path}`, { ...init, headers: jsonHeaders(cookie) }), target);

async function userId(email: string): Promise<string> {
  const row = await env.DB.prepare('SELECT id FROM "user" WHERE email = ?')
    .bind(email)
    .first<{ id: string }>();
  return row?.id ?? "";
}

beforeAll(async () => {
  platform = await getPlatformProxy({
    configPath: fileURLToPath(new URL("../../apps/web/wrangler.jsonc", import.meta.url)),
    persist: false,
  });
  env = {
    ...(platform.env as AppEnv),
    ENVIRONMENT: "production",
    PUBLIC_SITE_URL: "https://kaiyuemacau.com",
    BETTER_AUTH_SECRET: secret,
    DEV_ADMIN_BYPASS: "false",
    ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    ADMIN_EMAILS: `${superEmail},${staffEmail},${outsiderEmail}`,
    ADMIN_PRIMARY_EMAIL: superEmail,
  };
  for (const name of [
    "0004_admin_auth.sql",
    "0009_admin_operator.sql",
    "0010_admin_operator_last_super.sql",
  ]) {
    await env.DB.exec(migration(name));
  }
  for (const email of [superEmail, outsiderEmail]) {
    await signUp(email);
  }
}, 30_000);

afterAll(async () => {
  await platform?.dispose();
});

describe("production admin host operator admission", () => {
  it("keeps the production minimum at 12 even when the staging test floor is set", () => {
    expect(adminPasswordMinLength(env, new Request(`${origin}/login`))).toBe(
      ADMIN_PASSWORD_MIN_LENGTH,
    );
    expect(ADMIN_PASSWORD_MIN_LENGTH).toBe(12);
  });

  it("fails closed before bootstrap even with ADMIN_EMAILS and ADMIN_PRIMARY_EMAIL set", async () => {
    const cookie = await signIn(superEmail);
    await expect(admin(cookie)).rejects.toMatchObject({ code: "FORBIDDEN" });
  }, 30_000);

  it("admits roles after bootstrap, separates staff from Users, and denies missing or disabled rows", async () => {
    const superId = await userId(superEmail);
    await env.DB.prepare(
      `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
       VALUES (?, 'super_admin', 1, ?, ?, 'production-bootstrap')`,
    )
      .bind(superId, new Date().toISOString(), new Date().toISOString())
      .run();

    const superCookie = await signIn(superEmail);
    expect((await admin(superCookie)).operatorRole).toBe("super_admin");
    const superProfile = await api("/api/v1/admin/profile", superCookie);
    expect(((await superProfile.json()) as { role: string }).role).toBe("super_admin");
    expect((await api("/api/v1/admin/users", superCookie)).status).toBe(200);

    const otherPrimary = {
      ...env,
      ADMIN_PRIMARY_EMAIL: "someone-else@example.invalid",
      ADMIN_EMAILS: "",
    };
    const superElsewhere = await signIn(superEmail, otherPrimary);
    expect((await admin(superElsewhere, otherPrimary)).operatorRole).toBe("super_admin");

    const shortStaff = await api("/api/v1/admin/users", superCookie, {
      method: "POST",
      body: JSON.stringify({
        name: "Staff",
        email: staffEmail,
        password: "short6",
        confirmPassword: "short6",
      }),
    });
    expect(shortStaff.status).toBe(422);
    const created = await api("/api/v1/admin/users", superCookie, {
      method: "POST",
      body: JSON.stringify({
        name: "Staff",
        email: staffEmail,
        password,
        confirmPassword: password,
      }),
    });
    expect(created.status).toBe(201);
    const staffId = ((await created.json()) as { item: { id: string } }).item.id;

    const staffCookie = await signIn(staffEmail, otherPrimary);
    expect((await admin(staffCookie, otherPrimary)).operatorRole).toBe("staff");
    const staffProfile = await api("/api/v1/admin/profile", staffCookie, {}, otherPrimary);
    expect(staffProfile.status).toBe(200);
    expect(((await staffProfile.json()) as { role: string }).role).toBe("staff");
    expect((await api("/api/v1/admin/users", staffCookie, {}, otherPrimary)).status).toBe(403);

    const outsiderCookie = await signIn(outsiderEmail);
    await expect(admin(outsiderCookie)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const shortChange = await api("/api/v1/admin/profile/password", superCookie, {
      method: "POST",
      body: JSON.stringify({
        currentPassword: password,
        newPassword: "short6",
        confirmPassword: "short6",
      }),
    });
    expect(shortChange.status).toBe(422);

    const disabled = await api(`/api/v1/admin/users/${staffId}`, superCookie, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });
    expect(disabled.status).toBe(200);
    await expect(admin(staffCookie, otherPrimary)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const lastSuper = await api(`/api/v1/admin/users/${superId}`, superCookie, {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    });
    expect(lastSuper.status).toBe(403);
    await expect(
      env.DB.prepare("DELETE FROM admin_operator WHERE user_id = ?").bind(superId).run(),
    ).rejects.toThrow(/last enabled super admin/);
  }, 60_000);
});

function provision(args: string[], extraEnv: Record<string, string> = {}) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env, ...extraEnv };
  delete childEnv.BETTER_AUTH_SECRET;
  return spawnSync(process.execPath, [provisioner, ...args], { encoding: "utf8", env: childEnv });
}

function writeCreate(dir: string, name = "create.sql") {
  const out = join(dir, name);
  const result = provision(["--write-sql", "--env", "production", "--out", out], {
    PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
    PRIMARY_ADMIN_PASSWORD: password,
  });
  expect(result.status, result.stderr).toBe(0);
  return readFileSync(out, "utf8");
}

function writeBootstrap(dir: string, name: string) {
  const out = join(dir, name);
  const result = provision(["--write-bootstrap-sql", "--env", "production", "--out", out], {
    PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
  });
  expect(result.status, result.stderr).toBe(0);
  return readFileSync(out, "utf8");
}

function productionDb(withSidecar = true) {
  const db = new DatabaseSync(":memory:");
  db.exec(migration("0004_admin_auth.sql"));
  if (withSidecar) {
    db.exec(migration("0009_admin_operator.sql"));
    db.exec(migration("0010_admin_operator_last_super.sql"));
  }
  return db;
}

function snapshot(db: DatabaseSync) {
  return JSON.stringify(
    ["user", "account", "admin_operator", "operator_audit_events"].map((table) =>
      db.prepare(`SELECT * FROM "${table}" ORDER BY 1`).all(),
    ),
  );
}

describe("production provisioner and first super_admin bootstrap", () => {
  it("hashes a 12+ password with Better Auth without needing BETTER_AUTH_SECRET", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-prod-create-"));
    const sql = writeCreate(dir);
    const hash = sql.match(/NULL, NULL, NULL, NULL, NULL, NULL, '([^']+)'/)?.[1] ?? "";
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(sql).not.toContain(password);
    const crypto = (await import(
      pathToFileURL(join(repoRoot, "apps/web/node_modules/better-auth/dist/crypto/index.mjs")).href
    )) as { verifyPassword: (input: { hash: string; password: string }) => Promise<boolean> };
    expect(await crypto.verifyPassword({ hash, password })).toBe(true);

    const short = provision(
      ["--write-sql", "--env", "production", "--out", join(dir, "short.sql")],
      {
        PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
        PRIMARY_ADMIN_PASSWORD: "short-11-ch",
      },
    );
    expect(short.status).toBe(1);
  });

  it("bootstraps exactly one audited super_admin and replays as a no-op", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-prod-boot-"));
    const db = productionDb();
    db.exec(writeCreate(dir));
    db.exec(writeBootstrap(dir, "boot-1.sql"));
    const rows = db.prepare("SELECT role, enabled, updated_by FROM admin_operator").all();
    expect(rows).toEqual([{ role: "super_admin", enabled: 1, updated_by: "production-bootstrap" }]);
    expect(db.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").get()).toEqual({ n: 1 });
    expect(
      db.prepare("SELECT name FROM sqlite_master WHERE name LIKE '_primary_operator_%'").all(),
    ).toEqual([]);

    const before = snapshot(db);
    db.exec(writeBootstrap(dir, "boot-2.sql"));
    expect(snapshot(db)).toBe(before);
  });

  it("completes the audit once when replayed after an interruption", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-prod-int-"));
    const db = productionDb();
    db.exec(writeCreate(dir));
    const sql = writeBootstrap(dir, "boot.sql");
    db.exec(sql.split("INSERT INTO operator_audit_events")[0] ?? "");
    expect(db.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").get()).toEqual({ n: 0 });
    db.exec(writeBootstrap(dir, "boot-retry.sql"));
    expect(db.prepare("SELECT COUNT(*) AS n FROM admin_operator").get()).toEqual({ n: 1 });
    expect(db.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").get()).toEqual({ n: 1 });
  });

  it("fails closed with no data change on unsupported prestates", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-prod-refuse-"));
    const now = "2026-11-16T00:00:00.000Z";

    const noUser = productionDb();
    const noUserBefore = snapshot(noUser);
    expect(() => noUser.exec(writeBootstrap(dir, "no-user.sql"))).toThrow(
      /CHECK constraint failed/,
    );
    expect(snapshot(noUser)).toBe(noUserBefore);

    const noCredential = productionDb();
    noCredential.exec(
      `INSERT INTO "user" VALUES ('u1', 'Owner', '${VERIFIED_PRODUCTION_PRIMARY_EMAIL}', 1, NULL, '${now}', '${now}')`,
    );
    const noCredentialBefore = snapshot(noCredential);
    expect(() => noCredential.exec(writeBootstrap(dir, "no-cred.sql"))).toThrow(
      /CHECK constraint failed/,
    );
    expect(snapshot(noCredential)).toBe(noCredentialBefore);

    const otherSuper = productionDb();
    otherSuper.exec(writeCreate(dir, "create-other.sql"));
    otherSuper.exec(
      `INSERT INTO "user" VALUES ('other', 'Other', 'other@example.invalid', 1, NULL, '${now}', '${now}')`,
    );
    otherSuper.exec(
      `INSERT INTO admin_operator VALUES ('other', 'super_admin', 1, '${now}', '${now}', 'x')`,
    );
    const otherBefore = snapshot(otherSuper);
    expect(() => otherSuper.exec(writeBootstrap(dir, "other.sql"))).toThrow(
      /CHECK constraint failed/,
    );
    expect(snapshot(otherSuper)).toBe(otherBefore);

    const ownerStaff = productionDb();
    ownerStaff.exec(writeCreate(dir, "create-staff.sql"));
    ownerStaff.exec(
      `INSERT INTO "user" VALUES ('other', 'Other', 'other@example.invalid', 1, NULL, '${now}', '${now}')`,
    );
    ownerStaff.exec(
      `INSERT INTO admin_operator VALUES ('other', 'super_admin', 1, '${now}', '${now}', 'x')`,
    );
    ownerStaff.exec(
      `INSERT INTO admin_operator SELECT id, 'staff', 1, '${now}', '${now}', 'x' FROM "user" WHERE email = '${VERIFIED_PRODUCTION_PRIMARY_EMAIL}'`,
    );
    const staffBefore = snapshot(ownerStaff);
    expect(() => ownerStaff.exec(writeBootstrap(dir, "staff.sql"))).toThrow(
      /CHECK constraint failed/,
    );
    expect(snapshot(ownerStaff)).toBe(staffBefore);

    const noSidecar = productionDb(false);
    noSidecar.exec(writeCreate(dir, "create-nosidecar.sql"));
    expect(() => noSidecar.exec(writeBootstrap(dir, "nosidecar.sql"))).toThrow(/no such table/);
    expect(noSidecar.prepare('SELECT COUNT(*) AS n FROM "user"').get()).toEqual({ n: 1 });
  });

  it("refuses bootstrap for non-production targets and other emails", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-prod-deny-"));
    const trial = provision(
      ["--write-bootstrap-sql", "--env", "trial", "--out", join(dir, "t.sql")],
      {
        PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
      },
    );
    expect(trial.status).toBe(1);
    const other = provision(
      ["--write-bootstrap-sql", "--env", "production", "--out", join(dir, "o.sql")],
      { PRIMARY_ADMIN_EMAIL: "someone-else@example.invalid" },
    );
    expect(other.status).toBe(1);
  });
});
