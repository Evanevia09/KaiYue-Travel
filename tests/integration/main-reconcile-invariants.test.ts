import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ACCESS_ADMIN_HOST } from "../../apps/web/src/lib/server/admin-gate.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
}

describe("main reconciliation invariants", () => {
  it("keeps dedicated Access admin host and min password length 12", () => {
    expect(ACCESS_ADMIN_HOST).toBe("admin.kaiyuemacau.com");
    const session = readFileSync(
      join(repoRoot, "apps/web/src/lib/server/admin-session.ts"),
      "utf8",
    );
    expect(session).toMatch(/ADMIN_PASSWORD_MIN_LENGTH = 12/);
    expect(session).toMatch(/minPasswordLength:\s*ADMIN_PASSWORD_MIN_LENGTH/);
    expect(session).not.toMatch(/adminPasswordMinLength/);
    expect(session).not.toMatch(/ADMIN_STAGING_TEST_PASSWORD_MIN/);
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
});
