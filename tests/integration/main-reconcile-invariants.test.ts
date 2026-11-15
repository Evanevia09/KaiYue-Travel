import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ACCESS_ADMIN_HOST,
  ADMIN_TRIAL_HOST,
  HTML_WORKER_FIRST_PATHS,
  PRODUCTION_HOSTS,
  STAGING_ADMIN_HOST,
  STAGING_MARKETING_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

describe("main reconciliation invariants", () => {
  it("keeps dedicated admin host and min password length 12", () => {
    expect(ACCESS_ADMIN_HOST).toBe("admin.kaiyuemacau.com");
    expect(STAGING_ADMIN_HOST).toBe("admin-staging.kaiyuemacau.com");
    expect(STAGING_MARKETING_HOST).toBe("staging.kaiyuemacau.com");
    expect(PRODUCTION_HOSTS).not.toContain(ADMIN_TRIAL_HOST);
    expect(PRODUCTION_HOSTS).not.toContain(STAGING_ADMIN_HOST);
    expect(HTML_WORKER_FIRST_PATHS[0]).toBe("/*");
    const session = readFileSync(
      join(repoRoot, "apps/web/src/lib/server/admin-session.ts"),
      "utf8",
    );
    expect(session).toMatch(/ADMIN_PASSWORD_MIN_LENGTH = 12/);
    expect(session).toMatch(/minPasswordLength:\s*adminPasswordMinLength\(env, request\)/);
    expect(session).toMatch(/ADMIN_STAGING_TEST_PASSWORD_MIN/);
    expect(session).not.toMatch(/env\.ENVIRONMENT/);
    expect(session).toMatch(/ADMIN_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS = 60/);
  });

  it("keeps all 41 public photos", () => {
    const files = listFiles(join(repoRoot, "apps/web/public/images"));
    expect(files).toHaveLength(41);
  });

  it("uses source Access env names ACCESS_TEAM_DOMAIN and ACCESS_AUD", () => {
    const envSource = readFileSync(join(repoRoot, "apps/web/src/lib/server/env.ts"), "utf8");
    expect(envSource).toMatch(/ACCESS_TEAM_DOMAIN\?: string/);
    expect(envSource).toMatch(/ACCESS_AUD\?: string/);
    expect(envSource).not.toMatch(/POLICY_AUD/);
  });

  it("does not encode staging 6-char UAT in git wrangler", () => {
    const wrangler = readFileSync(join(repoRoot, "wrangler.jsonc"), "utf8");
    expect(wrangler).not.toContain("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(wrangler).toContain("069aa442-30c9-4454-ab3a-26eb372b3a1f");
  });

  it("does not add a pretend DB role column on top of 0004", () => {
    const auth = readFileSync(join(repoRoot, "migrations/0004_admin_auth.sql"), "utf8");
    expect(auth).not.toMatch(/\brole\b/);
    expect(existsSync(join(repoRoot, "migrations/0009_admin_primary_role.sql"))).toBe(false);
    const operator = readFileSync(join(repoRoot, "migrations/0009_admin_operator.sql"), "utf8");
    expect(operator).toMatch(/CHECK \(role IN \('super_admin', 'staff'\)\)/);
    expect(operator).not.toMatch(/ALTER TABLE "user"/);
    const authSource = readFileSync(join(repoRoot, "apps/web/src/lib/server/auth.ts"), "utf8");
    expect(authSource).not.toMatch(/scalingsmb@gmail.com/);
    expect(authSource).not.toMatch(/first.?user/i);
    const provision = readFileSync(
      join(repoRoot, "scripts/provision-staging-operators.sql"),
      "utf8",
    );
    expect(provision).toMatch(/STAGING-ONLY/);
    expect(provision).toMatch(/043cd0ff-a1e6-4b5e-98c1-968c286e0c70/);
    expect(provision).toMatch(/06cf879d-8fea-4088-8881-7d382e1b8c11/);
    expect(provision).toMatch(/f0af3b28-7b2c-47d5-b619-9239a29c41f9/);
    expect(provision).toMatch(/scalingsmb@gmail.com/);
    expect(provision).not.toMatch(/INSERT INTO "account"/);
    expect(provision).not.toMatch(/"password"/);
    expect(provision).toMatch(/UNION ALL/);
    expect(provision).toMatch(/AND EXISTS \(/);
    const lastSuper = readFileSync(
      join(repoRoot, "migrations/0010_admin_operator_last_super.sql"),
      "utf8",
    );
    expect(lastSuper).toMatch(/RAISE\(ABORT, 'last enabled super admin'\)/);
    const rollback = readFileSync(join(repoRoot, "scripts/rollback-staging-operators.sql"), "utf8");
    expect(rollback).not.toMatch(/DROP TABLE IF EXISTS admin_operator/);
    expect(rollback).not.toMatch(/DROP TABLE IF EXISTS operator_audit_events/);
    expect(rollback).toMatch(/updated_by = 'staging-bootstrap'/);
    expect(existsSync(join(repoRoot, "scripts/preflight-staging-operators.sql"))).toBe(true);
    const authRequire = readFileSync(join(repoRoot, "apps/web/src/lib/server/auth.ts"), "utf8");
    expect(authRequire).toMatch(/session\.session\?\.id/);
    expect(authRequire).toMatch(/\{ id: sessionId \}/);
  });
});
