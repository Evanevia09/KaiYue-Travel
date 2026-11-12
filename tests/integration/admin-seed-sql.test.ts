import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildAdminCredentialSql } from "../../scripts/lib/admin-seed-sql.mjs";
import { createTestEnv } from "../helpers/memory-d1.ts";

const email = "operator@example.invalid";

describe("admin credential seed SQL", () => {
  it("is idempotent for the same email when ids change", async () => {
    const env = createTestEnv();
    const first = buildAdminCredentialSql({
      email,
      name: "First",
      passwordHash: "hash-one",
      now: "2026-01-01T00:00:00.000Z",
      userId: "user-1",
      accountId: "acct-1",
    });
    const second = buildAdminCredentialSql({
      email,
      name: "Second",
      passwordHash: "hash-two",
      now: "2026-01-02T00:00:00.000Z",
      userId: "user-2",
      accountId: "acct-2",
    });
    await env.DB.exec(first);
    await env.DB.exec(second);
    const users = await env.DB.prepare('SELECT id, name, email FROM "user" WHERE email = ?')
      .bind(email)
      .all<{ id: string; name: string; email: string }>();
    expect(users.results).toHaveLength(1);
    expect(users.results[0]?.id).toBe("user-1");
    expect(users.results[0]?.name).toBe("Second");
    const accounts = await env.DB.prepare(
      'SELECT id, password, userId, providerId FROM "account"',
    ).all<{ id: string; password: string; userId: string; providerId: string }>();
    expect(accounts.results).toHaveLength(1);
    expect(accounts.results[0]?.id).toBe("acct-1");
    expect(accounts.results[0]?.userId).toBe("user-1");
    expect(accounts.results[0]?.password).toBe("hash-two");
  });

  it("does not use INSERT OR REPLACE by random id", () => {
    const sql = buildAdminCredentialSql({
      email,
      name: "Op",
      passwordHash: "hash",
      now: "2026-01-01T00:00:00.000Z",
      userId: "user-1",
      accountId: "acct-1",
    });
    expect(sql).not.toMatch(/INSERT OR REPLACE/i);
    expect(sql).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM "user" WHERE "email"/);
  });
});

describe("seed CLI", () => {
  it("refuses to run without a password and does not require BETTER_AUTH_SECRET", () => {
    const script = fileURLToPath(
      new URL("../../scripts/seed-preview-test-admin.mjs", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: {
        ...process.env,
        ADMIN_SEED_EMAIL: email,
        ADMIN_SEED_PASSWORD: "",
      },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/provision-admin-local/);
    expect(result.stderr).not.toMatch(/BETTER_AUTH_SECRET \(>=32\)/);
  });
});
