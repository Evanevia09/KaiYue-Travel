import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OPERATOR_CONFLICT_MESSAGE,
  handlePatchOperator,
  handleResetOperatorPassword,
} from "../../apps/web/src/lib/server/admin-operator.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { createTestEnv, setD1BeforeBatch, setD1StatementFailure } from "../helpers/memory-d1.ts";

const ownerId = "f0af3b28-7b2c-47d5-b619-9239a29c41f9";
const ownerEmail = "scalingsmb@gmail.com";
const extraUserId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const lastSuperSql = readFileSync(
  fileURLToPath(new URL("../../migrations/0010_admin_operator_last_super.sql", import.meta.url)),
  "utf8",
);
const operatorSql = readFileSync(
  fileURLToPath(new URL("../../migrations/0009_admin_operator.sql", import.meta.url)),
  "utf8",
);
const authSql = readFileSync(
  fileURLToPath(new URL("../../migrations/0004_admin_auth.sql", import.meta.url)),
  "utf8",
);
const gatedProvisionSql = readFileSync(
  fileURLToPath(new URL("../../scripts/provision-staging-operators.sql", import.meta.url)),
  "utf8",
);
const unsafeProvisionSql = readFileSync(
  fileURLToPath(new URL("../fixtures/unsafe-legacy-sequential-provision.sql", import.meta.url)),
  "utf8",
);
const rollbackSql = readFileSync(
  fileURLToPath(new URL("../../scripts/rollback-staging-operators.sql", import.meta.url)),
  "utf8",
);
const preflightSql = readFileSync(
  fileURLToPath(new URL("../../scripts/preflight-staging-operators.sql", import.meta.url)),
  "utf8",
);
const ownerSkipProvisionSql = readFileSync(
  fileURLToPath(new URL("../fixtures/owner-skip-regardless-provision.sql", import.meta.url)),
  "utf8",
);
const identityPreflightSql = readFileSync(
  fileURLToPath(new URL("../../scripts/preflight-staging-identity.sql", import.meta.url)),
  "utf8",
);
const migrationPreflightSql = readFileSync(
  fileURLToPath(new URL("../../scripts/preflight-staging-migrations.sql", import.meta.url)),
  "utf8",
);
const bootstrapOrder = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../scripts/staging-operator-bootstrap-order.json", import.meta.url)),
    "utf8",
  ),
) as {
  steps: Array<{ id: string; file?: string; files?: string[]; mode: string }>;
};

function sqlStatements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function execSequential(db: DatabaseSync, sql: string): { error?: string; failedAt?: string } {
  for (const statement of sqlStatements(sql)) {
    try {
      db.exec(statement);
    } catch (error) {
      return { error: String(error), failedAt: statement.slice(0, 120) };
    }
  }
  return {};
}

function seedUsers(db: DatabaseSync, ownerEmailValue: string): void {
  db.exec(authSql);
  db.exec(operatorSql);
  const now = "2026-11-15T00:00:00.000Z";
  db.prepare(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     VALUES (?, ?, ?, 1, NULL, ?, ?)`,
  ).run(ownerId, "Owner", ownerEmailValue, now, now);
  db.prepare(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     VALUES (?, ?, ?, 1, NULL, ?, ?)`,
  ).run(extraUserId, "Extra", "extra-staff@example.invalid", now, now);
}

function seedOperator(
  db: DatabaseSync,
  userId: string,
  role: "super_admin" | "staff",
  enabled: number,
  updatedAt = "2026-11-15T00:00:00.000Z",
): void {
  db.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, 'test')`,
  ).run(userId, role, enabled, updatedAt, updatedAt);
}

function preflightRow(db: DatabaseSync): {
  user_id: string;
  email: string;
  owner_role: string | null;
  owner_enabled: number | null;
  operator_count: number;
  enabled_super_count: number;
  supported_prestate: number;
} {
  return db.prepare(sqlStatements(preflightSql)[0]!).get() as {
    user_id: string;
    email: string;
    owner_role: string | null;
    owner_enabled: number | null;
    operator_count: number;
    enabled_super_count: number;
    supported_prestate: number;
  };
}

function operatorCounts(db: DatabaseSync): { supers: number; staff: number; total: number } {
  const supers = Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1",
        )
        .get() as { n: number }
    ).n,
  );
  const staff = Number(
    (
      db.prepare("SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'staff'").get() as {
        n: number;
      }
    ).n,
  );
  const total = Number(
    (db.prepare("SELECT COUNT(*) AS n FROM admin_operator").get() as { n: number }).n,
  );
  return { supers, staff, total };
}

function seedTwoSupers(db: DatabaseSync): { a: string; b: string } {
  db.exec(authSql);
  db.exec(operatorSql);
  const now = "2026-11-15T00:00:00.000Z";
  db.prepare(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     VALUES (?, 'A', 'a@example.invalid', 1, NULL, ?, ?)`,
  ).run("user-a", now, now);
  db.prepare(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     VALUES (?, 'B', 'b@example.invalid', 1, NULL, ?, ?)`,
  ).run("user-b", now, now);
  db.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
  ).run("user-a", now, now);
  db.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
  ).run("user-b", now, now);
  return { a: "user-a", b: "user-b" };
}

async function insertMemoryOperator(
  env: AppEnv,
  userId: string,
  email: string,
  role: "super_admin" | "staff",
): Promise<void> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
     VALUES (?, ?, ?, 1, NULL, ?, ?)`,
  )
    .bind(userId, email, email, now, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO "account" (
       "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
       "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
     ) VALUES (?, ?, 'credential', ?, NULL, NULL, NULL, NULL, NULL, NULL, 'hash', ?, ?)`,
  )
    .bind(`account-${userId}`, userId, userId, now, now)
    .run();
  await env.DB.prepare(
    `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
     VALUES (?, ?, 1, ?, ?, 'test')`,
  )
    .bind(userId, role, now, now)
    .run();
}

async function insertMemorySession(env: AppEnv, userId: string, sessionId: string): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
  )
    .bind(sessionId, expiresAt, `token-${sessionId}`, now, now, userId)
    .run();
}

function patchRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:4321/api/v1/admin/users/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("last-enabled super-admin DB invariant", () => {
  it("lets interleaved count-then-update remove every super, while the 0010 trigger keeps one", () => {
    const naive = new DatabaseSync(":memory:");
    const ids = seedTwoSupers(naive);
    const countA = Number(
      (
        naive
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(ids.a) as { n: number }
      ).n,
    );
    const countB = Number(
      (
        naive
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(ids.b) as { n: number }
      ).n,
    );
    expect(countA).toBe(1);
    expect(countB).toBe(1);
    naive.prepare("UPDATE admin_operator SET role = 'staff' WHERE user_id = ?").run(ids.a);
    naive.prepare("UPDATE admin_operator SET role = 'staff' WHERE user_id = ?").run(ids.b);
    expect(operatorCounts(naive).supers).toBe(0);

    const guarded = new DatabaseSync(":memory:");
    const guardedIds = seedTwoSupers(guarded);
    guarded.exec(lastSuperSql);
    const gCountA = Number(
      (
        guarded
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(guardedIds.a) as { n: number }
      ).n,
    );
    const gCountB = Number(
      (
        guarded
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(guardedIds.b) as { n: number }
      ).n,
    );
    expect(gCountA).toBe(1);
    expect(gCountB).toBe(1);
    guarded.prepare("UPDATE admin_operator SET role = 'staff' WHERE user_id = ?").run(guardedIds.a);
    expect(() =>
      guarded
        .prepare("UPDATE admin_operator SET role = 'staff' WHERE user_id = ?")
        .run(guardedIds.b),
    ).toThrow(/last enabled super admin/i);
    expect(operatorCounts(guarded).supers).toBe(1);
  });

  it("aborts deleting the last enabled super_admin even after a stale concurrent count", () => {
    const db = new DatabaseSync(":memory:");
    const ids = seedTwoSupers(db);
    db.exec(lastSuperSql);
    const countA = Number(
      (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(ids.a) as { n: number }
      ).n,
    );
    const countB = Number(
      (
        db
          .prepare(
            "SELECT COUNT(*) AS n FROM admin_operator WHERE role = 'super_admin' AND enabled = 1 AND user_id != ?",
          )
          .get(ids.b) as { n: number }
      ).n,
    );
    expect(countA).toBe(1);
    expect(countB).toBe(1);
    db.prepare("DELETE FROM admin_operator WHERE user_id = ?").run(ids.a);
    expect(() => db.prepare("DELETE FROM admin_operator WHERE user_id = ?").run(ids.b)).toThrow(
      /last enabled super admin/i,
    );
    expect(operatorCounts(db).supers).toBe(1);
  });
});

describe("staging bootstrap sequential auto-commit", () => {
  it("encodes identity then migrations then operator preflight then single-file bootstrap", () => {
    expect(bootstrapOrder.steps.map((step) => step.id)).toEqual([
      "identity",
      "migration-list",
      "migrate",
      "operator-preflight",
      "bootstrap",
    ]);
    expect(bootstrapOrder.steps[0]?.file).toBe("scripts/preflight-staging-identity.sql");
    expect(bootstrapOrder.steps[1]?.file).toBe("scripts/preflight-staging-migrations.sql");
    expect(bootstrapOrder.steps[2]?.files).toEqual([
      "migrations/0009_admin_operator.sql",
      "migrations/0010_admin_operator_last_super.sql",
    ]);
    expect(bootstrapOrder.steps[3]?.file).toBe("scripts/preflight-staging-operators.sql");
    expect(bootstrapOrder.steps[4]?.mode).toBe("wrangler-d1-execute-file-single-invocation");
    expect(identityPreflightSql).not.toMatch(/admin_operator/);
    expect(identityPreflightSql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|CREATE)\b/i);
    expect(migrationPreflightSql).toMatch(/sqlite_master/);
    expect(migrationPreflightSql).not.toMatch(/FROM admin_operator/);
    expect(migrationPreflightSql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|CREATE)\b/i);
    expect(gatedProvisionSql).toMatch(/staging-operator-bootstrap-order\.json/);
  });

  it("runs identity and migration-list prechecks before the operator table exists", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    db.exec("DROP TABLE admin_operator");
    db.exec("DROP TABLE operator_audit_events");
    const identity = db.prepare(sqlStatements(identityPreflightSql)[0]!).get() as {
      identity_ok: number;
      email: string;
    };
    expect(Number(identity.identity_ok)).toBe(1);
    expect(identity.email).toBe(ownerEmail);
    const migrationList = db.prepare(sqlStatements(migrationPreflightSql)[0]!).get() as {
      admin_operator_table: number;
      last_super_update_trigger: number;
    };
    expect(Number(migrationList.admin_operator_table)).toBe(0);
    expect(Number(migrationList.last_super_update_trigger)).toBe(0);
    expect(() => db.prepare(sqlStatements(preflightSql)[0]!).get()).toThrow(/no such table/i);
  });

  it("keeps operator preflight SELECT-only and reports supported_prestate", () => {
    expect(preflightSql).toMatch(/SELECT[\s\S]*u\."id" AS user_id/);
    expect(preflightSql).toMatch(/supported_prestate/);
    expect(preflightSql).toMatch(/operator_count/);
    expect(preflightSql).toMatch(/enabled_super_count/);
    expect(preflightSql).toMatch(/AFTER identity precheck/);
    expect(preflightSql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|CREATE)\b/i);
  });

  it("gates INSERT on empty or owner-only-enabled-matching-super prestate", () => {
    expect(gatedProvisionSql).toMatch(/_staging_operator_bootstrap_prestate/);
    expect(gatedProvisionSql).toMatch(/\(SELECT COUNT\(\*\) FROM admin_operator\) = 0/);
    expect(gatedProvisionSql).toMatch(/wrangler d1 execute --file/);
    expect(gatedProvisionSql).toMatch(/Fresh empty is the/);
  });

  it("leaves staff rows when the legacy two-INSERT script hits a CHECK failure", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, "wrong-owner@example.invalid");
    const result = execSequential(db, unsafeProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 1, total: 1 });
  });

  it("inserts zero operator rows when the gated INSERT hits the same CHECK failure", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, "wrong-owner@example.invalid");
    const result = execSequential(db, gatedProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 0, total: 0 });
  });

  it("provisions the matching owner as the only super_admin and rolls back staff without dropping tables", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    db.exec(lastSuperSql);
    const provisioned = execSequential(db, gatedProvisionSql);
    expect(provisioned.error).toBeUndefined();
    expect(operatorCounts(db)).toEqual({ supers: 1, staff: 1, total: 2 });
    const rollback = execSequential(db, rollbackSql);
    expect(rollback.error).toBeUndefined();
    expect(operatorCounts(db)).toEqual({ supers: 1, staff: 0, total: 1 });
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('admin_operator', 'operator_audit_events') ORDER BY name",
      )
      .all() as Array<{ name: string }>;
    expect(tables.map((row) => row.name)).toEqual(["admin_operator", "operator_audit_events"]);
  });

  it("succeeds on fresh empty operator prestate (not a previously proven failure)", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    db.exec(lastSuperSql);
    const preflight = preflightRow(db);
    expect(Number(preflight.operator_count)).toBe(0);
    expect(Number(preflight.supported_prestate)).toBe(1);
    const provisioned = execSequential(db, gatedProvisionSql);
    expect(provisioned.error).toBeUndefined();
    expect(operatorCounts(db)).toEqual({ supers: 1, staff: 1, total: 2 });
  });

  it("replays a complete valid state with zero new writes", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    db.exec(lastSuperSql);
    expect(execSequential(db, gatedProvisionSql).error).toBeUndefined();
    expect(operatorCounts(db)).toEqual({ supers: 1, staff: 1, total: 2 });
    const replayPreflight = preflightRow(db);
    expect(Number(replayPreflight.supported_prestate)).toBe(1);
    expect(Number(replayPreflight.operator_count)).toBe(2);
    expect(execSequential(db, gatedProvisionSql).error).toBeUndefined();
    expect(operatorCounts(db)).toEqual({ supers: 1, staff: 1, total: 2 });
  });

  it("writes nothing when the existing owner row has the wrong role", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    seedOperator(db, ownerId, "staff", 1);
    expect(Number(preflightRow(db).supported_prestate)).toBe(0);
    const before = operatorCounts(db);
    const result = execSequential(db, gatedProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(result.failedAt).toMatch(/_staging_operator_bootstrap_prestate/);
    expect(operatorCounts(db)).toEqual(before);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 1, total: 1 });
  });

  it("writes nothing when the existing owner super_admin is disabled", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    seedOperator(db, ownerId, "super_admin", 0);
    expect(Number(preflightRow(db).supported_prestate)).toBe(0);
    const result = execSequential(db, gatedProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 0, total: 1 });
    const owner = db
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get(ownerId) as { role: string; enabled: number };
    expect(owner.role).toBe("super_admin");
    expect(Number(owner.enabled)).toBe(0);
  });

  it("writes nothing when an extra enabled super_admin already exists", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    seedOperator(db, ownerId, "super_admin", 1);
    seedOperator(db, extraUserId, "super_admin", 1);
    expect(Number(preflightRow(db).enabled_super_count)).toBe(2);
    expect(Number(preflightRow(db).supported_prestate)).toBe(0);
    const result = execSequential(db, gatedProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 2, staff: 0, total: 2 });
  });

  it("writes nothing on interrupted prestate where staff exists and the owner row is missing", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    seedOperator(db, extraUserId, "staff", 1);
    expect(Number(preflightRow(db).supported_prestate)).toBe(0);
    const result = execSequential(db, gatedProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 1, total: 1 });
    const owner = db
      .prepare("SELECT COUNT(*) AS n FROM admin_operator WHERE user_id = ?")
      .get(ownerId) as { n: number };
    expect(Number(owner.n)).toBe(0);
  });

  it("shows the 927bf1d owner-skip INSERT can add staff before CHECK fails", () => {
    const db = new DatabaseSync(":memory:");
    seedUsers(db, ownerEmail);
    seedOperator(db, ownerId, "staff", 1);
    const result = execSequential(db, ownerSkipProvisionSql);
    expect(result.error).toMatch(/CHECK constraint failed/i);
    expect(operatorCounts(db)).toEqual({ supers: 0, staff: 2, total: 2 });
  });
});

describe("fail-closed operator security batches", () => {
  it("rolls back a role change when the audit insert is injected to fail", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "staff");
    await insertMemorySession(env, "staff-1", "session-staff-1");
    setD1StatementFailure(env.DB, (sql) => /INSERT INTO operator_audit_events/i.test(sql));
    await expect(
      handlePatchOperator(
        patchRequest({ role: "super_admin" }),
        env,
        { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
        "staff-1",
        "req-role-fail",
      ),
    ).rejects.toThrow(/injected statement failure/);
    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("staff");
    expect(Number(stored?.enabled)).toBe(1);
    const sessions = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ n: number }>();
    expect(Number(sessions?.n)).toBe(1);
    const audits = await env.DB.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").first<{
      n: number;
    }>();
    expect(Number(audits?.n)).toBe(0);
  });

  it("rolls back a password reset when the audit insert is injected to fail", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "staff");
    await insertMemorySession(env, "staff-1", "session-staff-1");
    const before = await env.DB.prepare('SELECT password FROM "account" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ password: string }>();
    setD1StatementFailure(env.DB, (sql) => /INSERT INTO operator_audit_events/i.test(sql));
    await expect(
      handleResetOperatorPassword(
        new Request("http://localhost:4321/api/v1/admin/users/staff-1/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            password: "local-only-reset-password-2026",
            confirmPassword: "local-only-reset-password-2026",
          }),
        }),
        env,
        { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
        "staff-1",
        "req-reset-fail",
      ),
    ).rejects.toThrow(/injected statement failure/);
    const after = await env.DB.prepare('SELECT password FROM "account" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ password: string }>();
    expect(after?.password).toBe(before?.password);
    const sessions = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ n: number }>();
    expect(Number(sessions?.n)).toBe(1);
  });
});

describe("partial PATCH field-specific CAS", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets naive SET-both undo a concurrent disable, while field-specific CAS leaves it disabled", () => {
    const snapshotAt = "2026-11-15T00:00:00.000Z";
    const naive = new DatabaseSync(":memory:");
    naive.exec(authSql);
    naive.exec(operatorSql);
    naive.exec(lastSuperSql);
    const now = snapshotAt;
    naive
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'A', 'a@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-a", now, now);
    naive
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'B', 'b@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-b", now, now);
    naive
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
      )
      .run("user-a", now, now);
    naive
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'staff', 1, ?, ?, 'test')`,
      )
      .run("user-b", now, now);
    naive
      .prepare("UPDATE admin_operator SET enabled = 0, updated_at = ? WHERE user_id = ?")
      .run("2026-11-15T00:00:01.000Z", "user-b");
    naive
      .prepare(
        `UPDATE admin_operator
         SET role = ?, enabled = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ?`,
      )
      .run("super_admin", 1, "2026-11-15T00:00:02.000Z", "stale", "user-b");
    const naiveRow = naive
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get("user-b") as { role: string; enabled: number };
    expect(naiveRow.role).toBe("super_admin");
    expect(Number(naiveRow.enabled)).toBe(1);

    const cas = new DatabaseSync(":memory:");
    cas.exec(authSql);
    cas.exec(operatorSql);
    cas.exec(lastSuperSql);
    cas
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'A', 'a@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-a", now, now);
    cas
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'B', 'b@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-b", now, now);
    cas
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
      )
      .run("user-a", now, now);
    cas
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'staff', 1, ?, ?, 'test')`,
      )
      .run("user-b", now, now);
    cas
      .prepare("UPDATE admin_operator SET enabled = 0, updated_at = ? WHERE user_id = ?")
      .run("2026-11-15T00:00:01.000Z", "user-b");
    const casResult = cas
      .prepare(
        `UPDATE admin_operator
         SET role = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ? AND role = ? AND enabled = ? AND updated_at = ?`,
      )
      .run("super_admin", "2026-11-15T00:00:02.000Z", "stale", "user-b", "staff", 1, snapshotAt);
    expect(Number(casResult.changes)).toBe(0);
    const casRow = cas
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get("user-b") as { role: string; enabled: number };
    expect(casRow.role).toBe("staff");
    expect(Number(casRow.enabled)).toBe(0);
  });

  it("lets naive SET-both restore a concurrently demoted role, while field-specific CAS does not", () => {
    const snapshotAt = "2026-11-15T00:00:00.000Z";
    const naive = new DatabaseSync(":memory:");
    const ids = seedTwoSupers(naive);
    naive.exec(lastSuperSql);
    naive
      .prepare("UPDATE admin_operator SET role = 'staff', updated_at = ? WHERE user_id = ?")
      .run("2026-11-15T00:00:01.000Z", ids.b);
    naive
      .prepare(
        `UPDATE admin_operator
         SET role = ?, enabled = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ?`,
      )
      .run("super_admin", 0, "2026-11-15T00:00:02.000Z", "stale", ids.b);
    const naiveRow = naive
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get(ids.b) as { role: string; enabled: number };
    expect(naiveRow.role).toBe("super_admin");
    expect(Number(naiveRow.enabled)).toBe(0);

    const cas = new DatabaseSync(":memory:");
    const casIds = seedTwoSupers(cas);
    cas.exec(lastSuperSql);
    cas
      .prepare("UPDATE admin_operator SET role = 'staff', updated_at = ? WHERE user_id = ?")
      .run("2026-11-15T00:00:01.000Z", casIds.b);
    const casResult = cas
      .prepare(
        `UPDATE admin_operator
         SET enabled = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ? AND role = ? AND enabled = ? AND updated_at = ?`,
      )
      .run(0, "2026-11-15T00:00:02.000Z", "stale", casIds.b, "super_admin", 1, snapshotAt);
    expect(Number(casResult.changes)).toBe(0);
    const casRow = cas
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get(casIds.b) as { role: string; enabled: number };
    expect(casRow.role).toBe("staff");
    expect(Number(casRow.enabled)).toBe(1);
  });

  it("keeps enabled unchanged on a role-only PATCH", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "staff");
    await env.DB.prepare("UPDATE admin_operator SET enabled = 0 WHERE user_id = ?")
      .bind("staff-1")
      .run();
    const response = await handlePatchOperator(
      patchRequest({ role: "super_admin" }),
      env,
      { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
      "staff-1",
      "req-role-only",
    );
    expect(response.status).toBe(200);
    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("super_admin");
    expect(Number(stored?.enabled)).toBe(0);
  });

  it("keeps role unchanged on an enabled-only PATCH", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "super_admin");
    const response = await handlePatchOperator(
      patchRequest({ enabled: false }),
      env,
      { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
      "staff-1",
      "req-enabled-only",
    );
    expect(response.status).toBe(200);
    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("super_admin");
    expect(Number(stored?.enabled)).toBe(0);
  });

  it("returns CONFLICT without audit or session revoke when a concurrent disable races a promotion", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "staff");
    await insertMemorySession(env, "staff-1", "session-staff-1");
    setD1BeforeBatch(env.DB, (sqlite) => {
      sqlite
        .prepare(
          "UPDATE admin_operator SET enabled = 0, updated_at = 'concurrent-disable' WHERE user_id = ?",
        )
        .run("staff-1");
    });
    await expect(
      handlePatchOperator(
        patchRequest({ role: "super_admin" }),
        env,
        { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
        "staff-1",
        "req-stale-promote",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", message: OPERATOR_CONFLICT_MESSAGE });
    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("staff");
    expect(Number(stored?.enabled)).toBe(0);
    const sessions = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ n: number }>();
    expect(Number(sessions?.n)).toBe(1);
    const audits = await env.DB.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").first<{
      n: number;
    }>();
    expect(Number(audits?.n)).toBe(0);
  });

  it("returns CONFLICT without restoring a concurrently demoted role on enabled-only PATCH", async () => {
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "super_admin");
    await insertMemorySession(env, "staff-1", "session-staff-1");
    setD1BeforeBatch(env.DB, (sqlite) => {
      sqlite
        .prepare(
          "UPDATE admin_operator SET role = 'staff', updated_at = 'concurrent-demote' WHERE user_id = ?",
        )
        .run("staff-1");
    });
    await expect(
      handlePatchOperator(
        patchRequest({ enabled: false }),
        env,
        { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
        "staff-1",
        "req-stale-disable",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", message: OPERATOR_CONFLICT_MESSAGE });
    const stored = await env.DB.prepare(
      "SELECT role, enabled FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number }>();
    expect(stored?.role).toBe("staff");
    expect(Number(stored?.enabled)).toBe(1);
    const sessions = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ n: number }>();
    expect(Number(sessions?.n)).toBe(1);
    const audits = await env.DB.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").first<{
      n: number;
    }>();
    expect(Number(audits?.n)).toBe(0);
  });

  it("lets equal-timestamp audit match steal a concurrent write, while write-token ownership does not", () => {
    const t = "2026-11-15T12:00:00.000Z";
    const naive = new DatabaseSync(":memory:");
    naive.exec(authSql);
    naive.exec(operatorSql);
    naive.exec(lastSuperSql);
    naive
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'A', 'a@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-a", t, t);
    naive
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'B', 'b@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-b", t, t);
    naive
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
      )
      .run("user-a", t, t);
    naive
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'staff', 1, ?, ?, 'test')`,
      )
      .run("user-b", t, t);
    naive
      .prepare(
        `INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
         VALUES (?, ?, 'tok', ?, ?, NULL, NULL, ?)`,
      )
      .run("session-b", t, t, t, "user-b");
    naive
      .prepare(
        "UPDATE admin_operator SET enabled = 0, updated_at = ?, updated_by = ? WHERE user_id = ?",
      )
      .run(t, "writer-b", "user-b");
    const stale = naive
      .prepare(
        `UPDATE admin_operator
         SET role = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ? AND role = ? AND enabled = ? AND updated_at = ?`,
      )
      .run("super_admin", t, "writer-a", "user-b", "staff", 1, t);
    expect(Number(stale.changes)).toBe(0);
    naive
      .prepare(
        `INSERT INTO operator_audit_events
           (id, user_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         SELECT ?, ?, 'operator_role_changed', 'super-1', 'staff', 'super_admin', 'req-a', ?
         WHERE EXISTS (SELECT 1 FROM admin_operator WHERE user_id = ? AND updated_at = ?)`,
      )
      .run("audit-naive", "user-b", t, "user-b", t);
    naive
      .prepare(
        `DELETE FROM "session"
         WHERE "userId" = ?
           AND EXISTS (SELECT 1 FROM admin_operator WHERE user_id = ? AND updated_at = ?)`,
      )
      .run("user-b", "user-b", t);
    expect(
      Number(
        (naive.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").get() as { n: number }).n,
      ),
    ).toBe(1);
    expect(
      Number(
        (
          naive.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?').get("user-b") as {
            n: number;
          }
        ).n,
      ),
    ).toBe(0);

    const owned = new DatabaseSync(":memory:");
    owned.exec(authSql);
    owned.exec(operatorSql);
    owned.exec(lastSuperSql);
    owned
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'A', 'a@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-a", t, t);
    owned
      .prepare(
        `INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
         VALUES (?, 'B', 'b@example.invalid', 1, NULL, ?, ?)`,
      )
      .run("user-b", t, t);
    owned
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'super_admin', 1, ?, ?, 'test')`,
      )
      .run("user-a", t, t);
    owned
      .prepare(
        `INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
         VALUES (?, 'staff', 1, ?, ?, 'test')`,
      )
      .run("user-b", t, t);
    owned
      .prepare(
        `INSERT INTO "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
         VALUES (?, ?, 'tok', ?, ?, NULL, NULL, ?)`,
      )
      .run("session-b", t, t, t, "user-b");
    owned
      .prepare(
        "UPDATE admin_operator SET enabled = 0, updated_at = ?, updated_by = ? WHERE user_id = ?",
      )
      .run(t, "writer-b", "user-b");
    const ownedStale = owned
      .prepare(
        `UPDATE admin_operator
         SET role = ?, updated_at = ?, updated_by = ?
         WHERE user_id = ? AND role = ? AND enabled = ? AND updated_at = ?`,
      )
      .run("super_admin", t, "writer-a", "user-b", "staff", 1, t);
    expect(Number(ownedStale.changes)).toBe(0);
    owned
      .prepare(
        `INSERT INTO operator_audit_events
           (id, user_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         SELECT ?, ?, 'operator_role_changed', 'super-1', 'staff', 'super_admin', 'req-a', ?
         WHERE EXISTS (SELECT 1 FROM admin_operator WHERE user_id = ? AND updated_by = ?)`,
      )
      .run("audit-owned", "user-b", t, "user-b", "writer-a");
    owned
      .prepare(
        `DELETE FROM "session"
         WHERE "userId" = ?
           AND EXISTS (SELECT 1 FROM admin_operator WHERE user_id = ? AND updated_by = ?)`,
      )
      .run("user-b", "user-b", "writer-a");
    expect(
      Number(
        (owned.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").get() as { n: number }).n,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          owned.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?').get("user-b") as {
            n: number;
          }
        ).n,
      ),
    ).toBe(1);
    const ownedRow = owned
      .prepare("SELECT role, enabled FROM admin_operator WHERE user_id = ?")
      .get("user-b") as { role: string; enabled: number };
    expect(ownedRow.role).toBe("staff");
    expect(Number(ownedRow.enabled)).toBe(0);
  });

  it("returns CONFLICT without audit or revoke when a concurrent write reuses the frozen clock", async () => {
    const frozen = "2026-11-15T12:00:00.000Z";
    vi.useFakeTimers();
    vi.setSystemTime(new Date(frozen));
    const env = createTestEnv();
    await insertMemoryOperator(env, "super-1", "super@example.invalid", "super_admin");
    await insertMemoryOperator(env, "staff-1", "staff@example.invalid", "staff");
    await insertMemorySession(env, "staff-1", "session-staff-1");
    setD1BeforeBatch(env.DB, (sqlite) => {
      sqlite
        .prepare(
          "UPDATE admin_operator SET enabled = 0, updated_at = ?, updated_by = ? WHERE user_id = ?",
        )
        .run(frozen, "concurrent-b", "staff-1");
    });
    await expect(
      handlePatchOperator(
        patchRequest({ role: "super_admin" }),
        env,
        { id: "super-1", email: "super@example.invalid", operatorRole: "super_admin" },
        "staff-1",
        "req-frozen-clock",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT", message: OPERATOR_CONFLICT_MESSAGE });
    const stored = await env.DB.prepare(
      "SELECT role, enabled, updated_at, updated_by FROM admin_operator WHERE user_id = ?",
    )
      .bind("staff-1")
      .first<{ role: string; enabled: number; updated_at: string; updated_by: string }>();
    expect(stored?.role).toBe("staff");
    expect(Number(stored?.enabled)).toBe(0);
    expect(stored?.updated_at).toBe(frozen);
    expect(stored?.updated_by).toBe("concurrent-b");
    const sessions = await env.DB.prepare('SELECT COUNT(*) AS n FROM "session" WHERE "userId" = ?')
      .bind("staff-1")
      .first<{ n: number }>();
    expect(Number(sessions?.n)).toBe(1);
    const audits = await env.DB.prepare("SELECT COUNT(*) AS n FROM operator_audit_events").first<{
      n: number;
    }>();
    expect(Number(audits?.n)).toBe(0);
  });
});
