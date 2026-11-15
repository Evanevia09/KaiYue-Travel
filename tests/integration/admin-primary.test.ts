import { DatabaseSync } from "node:sqlite";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLE_PRIMARY,
  ADMIN_ROLE_STAFF,
  TRIAL_OPERATOR_EMAIL,
  VERIFIED_PRODUCTION_PRIMARY_EMAIL,
  effectiveAdminRole,
  primaryAdminEmail,
} from "../../apps/web/src/lib/server/admin-primary.ts";
import { passwordSignupGate } from "../../apps/web/src/lib/server/admin-signup.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const provisioner = join(repoRoot, "scripts/provision-primary-admin.mjs");
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const authMigration = readFileSync(join(repoRoot, "migrations/0004_admin_auth.sql"), "utf8");
const password = "local-only-provision-password";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

function writeSql(out: string, envName = "production", email = VERIFIED_PRODUCTION_PRIMARY_EMAIL) {
  return spawnSync(process.execPath, [provisioner, "--write-sql", "--env", envName, "--out", out], {
    encoding: "utf8",
    env: {
      ...process.env,
      PRIMARY_ADMIN_EMAIL: email,
      PRIMARY_ADMIN_PASSWORD: password,
      BETTER_AUTH_SECRET: secret,
    },
  });
}

function openAuthDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(authMigration.replace(/^\s*--.*$/gm, ""));
  return db;
}

function counts(db: DatabaseSync, email: string) {
  const user = db
    .prepare(`SELECT COUNT(*) AS count FROM "user" WHERE lower("email") = lower(?)`)
    .get(email) as { count: number };
  const credential = db
    .prepare(
      `SELECT COUNT(*) AS count FROM "account" AS a
       JOIN "user" AS u ON u."id" = a."userId"
       WHERE lower(u."email") = lower(?) AND a."providerId" = 'credential'`,
    )
    .get(email) as { count: number };
  return { users: Number(user.count), credentials: Number(credential.count) };
}

describe("primary operator model", () => {
  it("treats env match as primary and ignores anyone else", () => {
    const env = { ADMIN_PRIMARY_EMAIL: "primary-operator@example.invalid" };
    expect(primaryAdminEmail(env)).toBe("primary-operator@example.invalid");
    expect(effectiveAdminRole("primary-operator@example.invalid", env)).toBe(ADMIN_ROLE_PRIMARY);
    expect(effectiveAdminRole("staff-operator@example.invalid", env)).toBe(ADMIN_ROLE_STAFF);
    expect(primaryAdminEmail({})).toBeNull();
    expect(effectiveAdminRole("anyone@example.invalid", {})).toBe(ADMIN_ROLE_STAFF);
  });
});

describe("production password signup denial", () => {
  it("returns 404 on the dedicated production host and rejects cross-origin local setup", async () => {
    const production = createTestEnv({
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: "https://kaiyuemacau.com",
      ADMIN_SETUP_TOKEN: "x".repeat(32),
      ADMIN_EMAILS: "primary-operator@example.invalid",
    });
    const denied = await passwordSignupGate(
      production,
      new Request("https://admin.kaiyuemacau.com/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://admin.kaiyuemacau.com",
          "x-admin-setup-token": "x".repeat(32),
        },
        body: JSON.stringify({
          email: "primary-operator@example.invalid",
          password: "production-host-test-password",
        }),
      }),
    );
    expect(denied).toEqual({ ok: false, status: 404, message: "Not found" });

    const local = createTestEnv({
      ENVIRONMENT: "development",
      PUBLIC_SITE_URL: "http://localhost:4321",
      ADMIN_SETUP_TOKEN: "y".repeat(32),
      ADMIN_EMAILS: "local-auth-test@example.invalid",
    });
    const crossOrigin = await passwordSignupGate(
      local,
      new Request("http://localhost:4321/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://evil.example",
          "x-admin-setup-token": "y".repeat(32),
        },
        body: JSON.stringify({ email: "local-auth-test@example.invalid" }),
      }),
    );
    expect(crossOrigin).toEqual({ ok: false, status: 403, message: "Forbidden" });
  });
});

describe("secret-safe primary CREATE helper", () => {
  it("prints a CREATE plan and a bounded preflight without secrets", () => {
    const plan = spawnSync(process.execPath, [provisioner, "--plan"], { encoding: "utf8" });
    expect(plan.status).toBe(0);
    expect(plan.stdout).toContain("CREATE");
    expect(plan.stdout).toContain(productionD1);
    expect(plan.stdout).toContain("Re-read before apply");
    expect(plan.stdout).toContain("Vault cannot export");
    expect(plan.stdout).toContain("batch()");
    expect(plan.stdout).not.toMatch(/password\s*=/i);

    const preflight = spawnSync(
      process.execPath,
      [provisioner, "--preflight", "--env", "production"],
      {
        encoding: "utf8",
      },
    );
    expect(preflight.status).toBe(0);
    expect(preflight.stdout).toContain("user_count");
    expect(preflight.stdout).toContain("credential_count");
    expect(preflight.stdout).toContain(VERIFIED_PRODUCTION_PRIMARY_EMAIL);
    expect(preflight.stdout).not.toContain("INSERT");
  });

  it("writes INSERT SQL exclusively at 0600 and omits the hash from stdout", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-primary-"));
    const out = join(dir, "create.sql");
    const result = writeSql(out);
    expect(result.status).toBe(0);
    const sql = readFileSync(out, "utf8");
    expect(sql).toContain(`INSERT INTO "user"`);
    expect(sql).toContain("CHECK (ok = 1)");
    expect(sql).toContain("_primary_operator_create_guard");
    expect(sql).not.toContain("INSERT OR REPLACE");
    expect(sql).not.toContain(password);
    expect(sql).not.toContain('"role"');
    expect(lstatSync(out).mode & 0o777).toBe(0o600);
    expect(result.stdout).not.toContain(password);
    expect(result.stdout).toContain("password and hash omitted");
  });

  it("refuses existing 0644 files, symlinks, stdout, and untargeted emails", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-primary-refuse-"));
    const existing = join(dir, "existing.sql");
    writeFileSync(existing, "-- old\n", { mode: 0o644 });
    chmodSync(existing, 0o644);
    const existingResult = writeSql(existing);
    expect(existingResult.status).toBe(1);
    expect(existingResult.stderr).toMatch(/existing file or symlink/);
    expect(readFileSync(existing, "utf8")).toBe("-- old\n");

    const target = join(dir, "target.sql");
    const link = join(dir, "link.sql");
    writeFileSync(target, "-- target\n");
    symlinkSync(target, link);
    const linkResult = writeSql(link);
    expect(linkResult.status).toBe(1);
    expect(linkResult.stderr).toMatch(/existing file or symlink/);

    const stdout = writeSql("-");
    expect(stdout.status).toBe(1);
    expect(stdout.stderr).toMatch(/stdout/);

    const wrong = writeSql(join(dir, "wrong.sql"), "production", "someone-else@example.invalid");
    expect(wrong.status).toBe(1);
    expect(existsSync(join(dir, "wrong.sql"))).toBe(false);
  });

  it("creates a trial fixture identity and refuses Daniel on --env trial", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-trial-"));
    const out = join(dir, "trial.sql");
    const ok = writeSql(out, "trial", TRIAL_OPERATOR_EMAIL);
    expect(ok.status).toBe(0);
    const sql = readFileSync(out, "utf8");
    expect(sql).toContain(TRIAL_OPERATOR_EMAIL);
    expect(sql).not.toContain(VERIFIED_PRODUCTION_PRIMARY_EMAIL);
    const denied = writeSql(join(dir, "daniel.sql"), "trial", VERIFIED_PRODUCTION_PRIMARY_EMAIL);
    expect(denied.status).toBe(1);
  });
});

describe("CREATE SQL atomicity on SQLite", () => {
  it("commits user and credential together in a transaction and raises on forbidden states", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-sql-"));
    const out = join(dir, "create.sql");
    expect(writeSql(out).status).toBe(0);
    const sql = readFileSync(out, "utf8");
    const db = openAuthDb();
    db.exec("BEGIN");
    db.exec(sql);
    db.exec("COMMIT");
    expect(counts(db, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({ users: 1, credentials: 1 });
    const leftover = db
      .prepare(`SELECT name FROM sqlite_master WHERE name = '_primary_operator_create_guard'`)
      .all();
    expect(leftover).toEqual([]);

    const repeat = join(dir, "repeat.sql");
    expect(writeSql(repeat).status).toBe(0);
    expect(() => db.exec(readFileSync(repeat, "utf8"))).toThrow(/CHECK constraint failed/);
    expect(counts(db, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({ users: 1, credentials: 1 });
  });

  it("refuses a preexisting user without a credential and a case variant", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-sql-pre-"));
    const out = join(dir, "create.sql");
    expect(writeSql(out).status).toBe(0);
    const db = openAuthDb();
    db.exec(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
      VALUES ('existing-user', 'Existing', 'daniel@kaiyuemacau.com', 1, NULL, '2026-01-01', '2026-01-01')`);
    expect(() => db.exec(readFileSync(out, "utf8"))).toThrow(/CHECK constraint failed/);
    expect(counts(db, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({ users: 1, credentials: 0 });

    const variant = openAuthDb();
    variant.exec(`INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
      VALUES ('case-user', 'Existing', 'Daniel@KaiYueMacau.com', 1, NULL, '2026-01-01', '2026-01-01')`);
    expect(() => variant.exec(readFileSync(out, "utf8"))).toThrow(/CHECK constraint failed/);
    expect(counts(variant, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({
      users: 1,
      credentials: 0,
    });
  });

  it("documents sequential interruption: user row can exist without a credential and CREATE refuses to continue", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-sql-int-"));
    const out = join(dir, "create.sql");
    expect(writeSql(out).status).toBe(0);
    const sql = readFileSync(out, "utf8");
    const firstInsert = sql.split('INSERT INTO "account"')[0];
    const db = openAuthDb();
    db.exec(firstInsert ?? "");
    expect(counts(db, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({ users: 1, credentials: 0 });
    const retry = join(dir, "retry.sql");
    expect(writeSql(retry).status).toBe(0);
    expect(() => db.exec(readFileSync(retry, "utf8"))).toThrow(/CHECK constraint failed/);
    expect(counts(db, VERIFIED_PRODUCTION_PRIMARY_EMAIL)).toEqual({ users: 1, credentials: 0 });
  });
});
