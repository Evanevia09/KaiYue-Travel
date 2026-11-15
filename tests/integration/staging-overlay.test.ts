import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const uatPath = fileURLToPath(
  new URL("../../docs/records/wrangler.staging-artifact.jsonc", import.meta.url),
);
const trialPath = fileURLToPath(
  new URL("../../docs/records/wrangler.admin-trial-artifact.jsonc", import.meta.url),
);
const productionPath = fileURLToPath(
  new URL("../../docs/records/wrangler.production-artifact.jsonc", import.meta.url),
);
const ledgerPath = fileURLToPath(
  new URL("../../scripts/build-complete-ledger.mjs", import.meta.url),
);

type OverlayConfig = {
  do_not_upload?: boolean;
  name: string;
  account_id: string;
  keep_vars: boolean;
  d1_databases: Array<{ database_id: string; database_name?: string }>;
  r2_buckets: Array<{ bucket_name: string }>;
  assets?: { run_worker_first: boolean };
  vars?: Record<string, string>;
  protected_host?: string;
};

function parseOverlay(path: string): { text: string; config: OverlayConfig } {
  const text = readFileSync(path, "utf8");
  return { text, config: JSON.parse(text.replace(/^\s*\/\/.*$/gm, "")) as OverlayConfig };
}

const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";
const trialSentinel = "00000000-0000-4000-8000-00000000a1a1";

describe("protected official UAT baseline", () => {
  it("records UAT bindings as DO_NOT_UPLOAD and is not a trial Worker", () => {
    const { text, config } = parseOverlay(uatPath);
    expect(text).toMatch(/DO_NOT_UPLOAD/);
    expect(config.do_not_upload).toBe(true);
    expect(config.name).toBe("kaiyue-travel-staging");
    expect(config.d1_databases[0]?.database_id).toBe(stagingD1);
    expect(config.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-staging");
    expect(config.keep_vars).toBe(true);
    expect(config.protected_host).toBe("kaiyue-travel-staging.kai-yue.workers.dev");
    expect(JSON.stringify(config)).not.toContain(productionD1);
    expect(JSON.stringify(config)).not.toContain("kaiyue-travel-admin-trial");
  });
});

describe("isolated admin trial overlay plan", () => {
  it("uses a new Worker/D1/R2/host and does not bind UAT or production", () => {
    const { text, config } = parseOverlay(trialPath);
    expect(text).toMatch(/Not approved/);
    expect(config.name).toBe("kaiyue-travel-admin-trial");
    expect(config.keep_vars).toBe(false);
    expect(config.d1_databases[0]?.database_name).toBe("kaiyue-travel-admin-trial");
    expect(config.d1_databases[0]?.database_id).toBe(trialSentinel);
    expect(config.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-admin-trial");
    expect(config.vars?.ENVIRONMENT).toBe("preview");
    expect(config.vars?.PUBLIC_SITE_URL).toBe(
      "https://kaiyue-travel-admin-trial.kai-yue.workers.dev",
    );
    expect(config.vars?.DEV_ADMIN_BYPASS).toBe("false");
    expect(JSON.stringify(config)).not.toContain(stagingD1);
    expect(JSON.stringify(config)).not.toContain(productionD1);
    expect(JSON.stringify(config)).not.toContain(obsoleteD1);
    expect(JSON.stringify(config)).not.toContain("kaiyue-travel-staging");
    expect(JSON.stringify(config)).not.toContain("daniel@kaiyuemacau.com");
    expect(config.vars).not.toHaveProperty("ADMIN_EMAILS");
    expect(config.vars).not.toHaveProperty("ADMIN_PRIMARY_EMAIL");
    expect(config.vars).not.toHaveProperty("ADMIN_STAGING_TEST_PASSWORD_MIN");
    expect(config.vars).not.toHaveProperty("TEMP_ADMIN_EXPIRES_AT");
  });

  it("keeps production overlay on live bindings", () => {
    const { config } = parseOverlay(productionPath);
    expect(config.name).toBe("kaiyue-travel");
    expect(config.d1_databases[0]?.database_id).toBe(productionD1);
    expect(config.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-production");
    expect(JSON.stringify(config)).not.toContain(stagingD1);
    expect(JSON.stringify(config)).not.toContain("kaiyue-travel-admin-trial");
  });

  it("refuses to freeze a non-production ledger", () => {
    const staging = spawnSync(process.execPath, [ledgerPath, "--env", "staging"], {
      encoding: "utf8",
    });
    expect(staging.status).toBe(1);
    const trial = spawnSync(process.execPath, [ledgerPath, "--env", "trial"], {
      encoding: "utf8",
    });
    expect(trial.status).toBe(1);
  });
});
