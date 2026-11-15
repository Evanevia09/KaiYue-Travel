import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const overlayPath = fileURLToPath(
  new URL("../../docs/records/wrangler.staging-artifact.jsonc", import.meta.url),
);
const productionPath = fileURLToPath(
  new URL("../../docs/records/wrangler.production-artifact.jsonc", import.meta.url),
);
type OverlayConfig = {
  name: string;
  account_id: string;
  keep_vars: boolean;
  d1_databases: Array<{ database_id: string }>;
  r2_buckets: Array<{ bucket_name: string }>;
  assets: { run_worker_first: boolean };
  vars: Record<string, string>;
};

const overlayText = readFileSync(overlayPath, "utf8");
const overlayConfig = JSON.parse(overlayText.replace(/^\s*\/\/.*$/gm, "")) as OverlayConfig;
const productionText = readFileSync(productionPath, "utf8");
const productionConfig = JSON.parse(productionText.replace(/^\s*\/\/.*$/gm, "")) as OverlayConfig;
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";

describe("isolated staging overlay candidate", () => {
  it("binds official protected staging D1/R2 and does not copy production", () => {
    expect(overlayConfig.name).toBe("kaiyue-travel-staging");
    expect(overlayConfig.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(overlayConfig.d1_databases[0].database_id).toBe(stagingD1);
    expect(overlayConfig.r2_buckets[0].bucket_name).toBe("kaiyue-offers-staging");
    expect(overlayConfig.assets.run_worker_first).toBe(true);
    expect(overlayConfig.vars.DEV_ADMIN_BYPASS).toBe("false");
    expect(overlayConfig.keep_vars).toBe(true);
    expect(JSON.stringify(overlayConfig)).not.toContain(productionD1);
    expect(JSON.stringify(overlayConfig)).not.toContain("kaiyue-offers-production");
    expect(JSON.stringify(overlayConfig)).not.toContain(obsoleteD1);
  });

  it("omits UAT 6-char, Nov 24 expiry, allowlist, primary email, and secrets", () => {
    const vars = overlayConfig.vars;
    expect(vars).not.toHaveProperty("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(vars).not.toHaveProperty("TEMP_ADMIN_EXPIRES_AT");
    expect(vars).not.toHaveProperty("ADMIN_EMAILS");
    expect(vars).not.toHaveProperty("ADMIN_PRIMARY_EMAIL");
    expect(vars).not.toHaveProperty("BETTER_AUTH_SECRET");
    expect(JSON.stringify(overlayConfig)).not.toContain("daniel@kaiyuemacau.com");
    expect(JSON.stringify(overlayConfig)).not.toContain("2026-11-24");
  });

  it("keeps production overlay on live bindings, not git wrangler and not staging D1", () => {
    expect(productionConfig.name).toBe("kaiyue-travel");
    expect(productionConfig.d1_databases[0].database_id).toBe(productionD1);
    expect(productionConfig.r2_buckets[0].bucket_name).toBe("kaiyue-offers-production");
    expect(productionConfig.assets.run_worker_first).toBe(false);
    expect(JSON.stringify(productionConfig)).not.toContain(stagingD1);
  });
});
