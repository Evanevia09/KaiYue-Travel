import { mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADMIN_ROLE_PRIMARY,
  ADMIN_ROLE_STAFF,
  VERIFIED_PRODUCTION_PRIMARY_EMAIL,
  effectiveAdminRole,
  primaryAdminEmail,
} from "../../apps/web/src/lib/server/admin-primary.ts";
import { passwordSignupGate } from "../../apps/web/src/lib/server/admin-signup.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const provisioner = join(repoRoot, "scripts/provision-primary-admin.mjs");
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";

describe("primary operator model", () => {
  it("treats env match as primary and ignores a persisted primary for anyone else", () => {
    const env = { ADMIN_PRIMARY_EMAIL: "primary-operator@example.invalid" };
    expect(primaryAdminEmail(env)).toBe("primary-operator@example.invalid");
    expect(effectiveAdminRole("primary-operator@example.invalid", ADMIN_ROLE_STAFF, env)).toBe(
      ADMIN_ROLE_PRIMARY,
    );
    expect(effectiveAdminRole("staff-operator@example.invalid", ADMIN_ROLE_PRIMARY, env)).toBe(
      ADMIN_ROLE_STAFF,
    );
    expect(effectiveAdminRole("staff-operator@example.invalid", null, env)).toBe(ADMIN_ROLE_STAFF);
  });

  it("does not label an unset allowlist as a primary operator", () => {
    expect(primaryAdminEmail({})).toBeNull();
    expect(effectiveAdminRole("anyone@example.invalid", null, {})).toBe(ADMIN_ROLE_STAFF);
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
  it("prints a CREATE plan for the 14:18 production baseline without secrets", () => {
    const result = spawnSync(process.execPath, [provisioner, "--plan"], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("CREATE");
    expect(result.stdout).toContain(productionD1);
    expect(result.stdout).toContain("user count 0");
    expect(result.stdout).toContain("No role column");
    expect(result.stdout).toContain("minPasswordLength 12");
    expect(result.stdout).toContain("Do not inherit ADMIN_STAGING_TEST_PASSWORD_MIN=6");
    expect(result.stdout).not.toMatch(/password\s*=/i);
    expect(result.stderr).toBe("");
  });

  it("writes INSERT SQL to a file and omits the hash from stdout", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-primary-"));
    const out = join(dir, "create.sql");
    const password = "local-only-provision-password";
    const result = spawnSync(process.execPath, [provisioner, "--write-sql", "--out", out], {
      encoding: "utf8",
      env: {
        ...process.env,
        PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
        PRIMARY_ADMIN_PASSWORD: password,
        BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
      },
    });
    expect(result.status).toBe(0);
    const sql = readFileSync(out, "utf8");
    expect(sql).toContain(`INSERT INTO "user"`);
    expect(sql).toContain(productionD1);
    expect(sql).toContain("WHERE NOT EXISTS");
    expect(sql).not.toContain("INSERT OR REPLACE");
    expect(sql).not.toContain(password);
    expect(sql).not.toContain('"role"');
    const quoted = [...sql.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? "");
    const hash = quoted.find(
      (value) =>
        value.length > 24 &&
        value !== productionD1 &&
        !value.includes("@") &&
        !value.startsWith("20"),
    );
    expect(hash).toBeTruthy();
    expect(result.stdout.includes(hash ?? "missing-hash")).toBe(false);
    expect(result.stdout).not.toContain(password);
    expect(result.stdout).toContain("password and hash omitted");
  });

  it("refuses an untargeted email and refuses stdout SQL", () => {
    const wrong = spawnSync(
      process.execPath,
      [provisioner, "--write-sql", "--out", "ignored.sql"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PRIMARY_ADMIN_EMAIL: "someone-else@example.invalid",
          PRIMARY_ADMIN_PASSWORD: "local-only-provision-password",
          BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
        },
      },
    );
    expect(wrong.status).toBe(1);
    expect(wrong.stderr).toMatch(/verified production primary operator/);

    const stdout = spawnSync(process.execPath, [provisioner, "--write-sql", "--out", "-"], {
      encoding: "utf8",
      env: {
        ...process.env,
        PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
        PRIMARY_ADMIN_PASSWORD: "local-only-provision-password",
        BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
      },
    });
    expect(stdout.status).toBe(1);
    expect(stdout.stderr).toMatch(/stdout/);
  });

  it("stamps only the verified email after 0009 without a password", () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-primary-stamp-"));
    const out = join(dir, "stamp.sql");
    const result = spawnSync(
      process.execPath,
      [provisioner, "--write-sql", "--stamp-role", "--out", out],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PRIMARY_ADMIN_EMAIL: VERIFIED_PRODUCTION_PRIMARY_EMAIL,
        },
      },
    );
    expect(result.status).toBe(0);
    const sql = readFileSync(out, "utf8");
    expect(sql).toContain(`UPDATE "user" SET "role" = 'primary'`);
    expect(sql).toContain('WHERE lower("email")');
    expect(sql).toContain(VERIFIED_PRODUCTION_PRIMARY_EMAIL);
    expect(sql).not.toContain('UPDATE "user" SET "role" = \'primary\';');
  });
});

describe("additive 0009", () => {
  it("adds role with staff default and does not rewrite 0004", () => {
    const migration = readFileSync(
      join(repoRoot, "migrations/0009_admin_primary_role.sql"),
      "utf8",
    );
    const baseline = readFileSync(join(repoRoot, "migrations/0004_admin_auth.sql"), "utf8");
    expect(migration).toMatch(/ALTER TABLE "user" ADD COLUMN "role"/);
    expect(migration).toMatch(/DEFAULT 'staff'/);
    expect(baseline).not.toMatch(/role/);
  });
});
