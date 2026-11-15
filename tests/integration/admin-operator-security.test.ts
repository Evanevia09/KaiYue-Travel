import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  handlePatchOperator,
  handleResetOperatorPassword,
} from "../../apps/web/src/lib/server/admin-operator.ts";
import type { AppEnv } from "../../apps/web/src/lib/server/env.ts";
import { createTestEnv, setD1StatementFailure } from "../helpers/memory-d1.ts";

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
  it("keeps preflight SELECT-only", () => {
    expect(preflightSql).toMatch(/SELECT u\."id"/);
    expect(preflightSql).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|CREATE)\b/i);
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
