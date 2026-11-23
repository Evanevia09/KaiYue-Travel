import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const overlayPath = fileURLToPath(
  new URL("../../docs/records/wrangler.production-artifact.jsonc", import.meta.url),
);
type OverlayConfig = {
  name: string;
  account_id: string;
  keep_vars: boolean;
  d1_databases: Array<{ database_id: string }>;
  r2_buckets: Array<{ bucket_name: string }>;
  assets: { run_worker_first: boolean | string[] };
  vars: Record<string, string>;
};

const overlayText = readFileSync(overlayPath, "utf8");
const overlayConfig = JSON.parse(overlayText.replace(/^\s*\/\/.*$/gm, "")) as OverlayConfig;
const gitWrangler = readFileSync(
  fileURLToPath(new URL("../../wrangler.jsonc", import.meta.url)),
  "utf8",
);
const ledgerPath = fileURLToPath(
  new URL("../../scripts/build-complete-ledger.mjs", import.meta.url),
);
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";

describe("production overlay candidate", () => {
  it("uses production D1/R2, fail-closed vars, and Worker-first assets", () => {
    expect(overlayConfig.name).toBe("kaiyue-travel");
    expect(overlayConfig.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(overlayConfig.d1_databases[0].database_id).toBe(productionD1);
    expect(overlayConfig.r2_buckets[0].bucket_name).toBe("kaiyue-offers-production");
    expect(overlayConfig.assets.run_worker_first).toBe(true);
    expect(overlayConfig.vars.DEV_ADMIN_BYPASS).toBe("false");
    expect(overlayConfig.keep_vars).toBe(true);
    expect(overlayText).toMatch(/run_worker_first true/);
  });

  it("does not encode staging bindings, temp-admin, 6-char, allowlist, or secrets", () => {
    const vars = overlayConfig.vars;
    expect(vars).not.toHaveProperty("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(vars).not.toHaveProperty("TEMP_ADMIN_EXPIRES_AT");
    expect(vars).not.toHaveProperty("ADMIN_EMAILS");
    expect(vars).not.toHaveProperty("ADMIN_PRIMARY_EMAIL");
    expect(vars).not.toHaveProperty("BETTER_AUTH_SECRET");
    expect(vars).not.toHaveProperty("ACCESS_TEAM_DOMAIN");
    expect(vars).not.toHaveProperty("ACCESS_AUD");
    expect(JSON.stringify(overlayConfig)).not.toContain(stagingD1);
    expect(JSON.stringify(overlayConfig)).not.toContain(obsoleteD1);
    expect(JSON.stringify(overlayConfig)).not.toContain("41386f");
    expect(JSON.stringify(overlayConfig)).not.toContain("admin-test@kaiyue.test");
    expect(JSON.stringify(overlayConfig)).not.toContain("uat-admin-20261114@kaiyue.test");
    // 2026-11-15 package has no ADMIN_EMAILS. Production mail dest is t315u
    // NOTIFY_STAFF_TO on deploy/production/wrangler.jsonc, not this artifact.
    expect(JSON.stringify(overlayConfig)).not.toContain("daniel@kaiyuemacau.com");
    expect(overlayConfig.assets.run_worker_first).toBe(true);
  });

  it("keeps git wrangler.jsonc fail-closed without any D1 binding", () => {
    expect(gitWrangler).not.toContain(obsoleteD1);
    expect(gitWrangler).not.toContain(stagingD1);
    expect(gitWrangler).not.toContain(productionD1);
    expect(gitWrangler).not.toContain("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(gitWrangler).not.toContain("TEMP_ADMIN_EXPIRES_AT");
    expect(gitWrangler).not.toContain("BETTER_AUTH_SECRET");
  });

  it("refuses to freeze a staging ledger from this production-candidate script", () => {
    const staging = spawnSync(process.execPath, [ledgerPath, "--env", "staging"], {
      encoding: "utf8",
    });
    expect(staging.status).toBe(1);
    expect(staging.stderr).toMatch(/--env production/);
  });
});
