import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const wranglerPath = fileURLToPath(new URL("../../wrangler.jsonc", import.meta.url));
const wrangler = readFileSync(wranglerPath, "utf8");
const overlayPath = fileURLToPath(
  new URL("../../docs/records/wrangler.staging-artifact.jsonc", import.meta.url),
);
const overlay = readFileSync(overlayPath, "utf8");
const guardPath = fileURLToPath(new URL("../../scripts/require-wrangler-env.mjs", import.meta.url));
const ciPath = fileURLToPath(new URL("../../.github/workflows/ci.yml", import.meta.url));
const ci = readFileSync(ciPath, "utf8");
const opsPath = fileURLToPath(new URL("../../docs/08-delivery-and-operations.md", import.meta.url));
const ops = readFileSync(opsPath, "utf8");
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";
const placeholderD1 = "00000000-0000-4000-8000-000000000001";

describe("wrangler live targets", () => {
  it("does not make production the accidental top-level Worker", () => {
    expect(wrangler).toMatch(/"name": "kaiyue-travel-env-required"/);
    expect(wrangler).toMatch(/"name": "kaiyue-travel-staging"/);
    expect(wrangler).toMatch(/"name": "kaiyue-travel"/);
    expect(wrangler).toMatch(/"production"/);
    expect(wrangler).toContain(stagingD1);
    expect(wrangler).toContain(productionD1);
    expect(wrangler).not.toMatch(new RegExp(`"database_id": "${obsoleteD1}"`));
  });

  it("keeps wrangler preview off live staging D1 and allowlist vars", () => {
    const previews = wrangler.slice(wrangler.indexOf('"previews"'));
    expect(previews).not.toContain(stagingD1);
    expect(previews).not.toContain(productionD1);
    expect(previews).not.toContain("daniel@kaiyuemacau.com");
    expect(previews).not.toContain("TEMP_ADMIN_EXPIRES_AT");
    expect(previews).toContain("kaiyue-travel-preview-local");
  });

  it("refuses wrangler uploads without an explicit staging or production env", () => {
    const missing = spawnSync(process.execPath, [guardPath], { encoding: "utf8" });
    expect(missing.status).toBe(1);
    expect(missing.stderr).toMatch(/--env staging/);
    const staging = spawnSync(process.execPath, [guardPath, "--env", "staging"], {
      encoding: "utf8",
    });
    expect(staging.status).toBe(0);
    const production = spawnSync(process.execPath, [guardPath], {
      encoding: "utf8",
      env: { ...process.env, CLOUDFLARE_ENV: "production" },
    });
    expect(production.status).toBe(0);
  });

  it("keeps GitHub Actions test CI off wrangler upload and production env", () => {
    expect(ci).toMatch(/pnpm test/);
    expect(ci).toMatch(/pnpm build/);
    expect(ci).not.toMatch(/wrangler/);
    expect(ci).not.toMatch(/CLOUDFLARE_ENV/);
    expect(ci).toMatch(/Workers Builds: kaiyue-travel/);
  });

  it("keeps the no-env wrangler target on placeholder D1, not live", () => {
    const topLevel = wrangler.slice(0, wrangler.indexOf('"env"'));
    expect(topLevel).toContain(placeholderD1);
    expect(topLevel).not.toContain(stagingD1);
    expect(topLevel).not.toContain(productionD1);
    expect(topLevel).toContain('"ENVIRONMENT": "unspecified"');
  });

  it("keeps the six-character password flag on staging only", () => {
    const envIdx = wrangler.indexOf('"env"');
    const staging = wrangler.slice(wrangler.indexOf('"staging"'), wrangler.indexOf('"production"'));
    const production = wrangler.slice(
      wrangler.indexOf('"production"'),
      wrangler.indexOf('"previews"'),
    );
    const topLevel = wrangler.slice(0, envIdx);
    const previews = wrangler.slice(wrangler.indexOf('"previews"'));
    expect(staging).toContain('"ADMIN_STAGING_TEST_PASSWORD_MIN": "6"');
    expect(staging).toContain("daniel@kaiyuemacau.com");
    expect(staging).not.toContain("uat-admin-20261114@kaiyue.test");
    expect(production).not.toContain('"ADMIN_STAGING_TEST_PASSWORD_MIN"');
    expect(production).not.toContain("uat-admin-20261114@kaiyue.test");
    expect(topLevel).not.toContain('"ADMIN_STAGING_TEST_PASSWORD_MIN": "6"');
    expect(previews).not.toContain('"ADMIN_STAGING_TEST_PASSWORD_MIN"');
  });

  it("regenerates the staging overlay for the new runtime instead of reusing fa5184c", () => {
    expect(overlay).toContain('"run_worker_first": true');
    expect(overlay).toContain('"ADMIN_STAGING_TEST_PASSWORD_MIN": "6"');
    expect(overlay).toContain("daniel@kaiyuemacau.com,uat-admin-20261114@kaiyue.test");
    expect(overlay).toContain(stagingD1);
    expect(overlay).toContain("kaiyue-offers-staging");
    expect(overlay).toContain('"TEMP_ADMIN_EXPIRES_AT": "2026-11-24T15:59:59+08:00"');
    expect(overlay).not.toContain(productionD1);
    expect(overlay).not.toContain(obsoleteD1);
    expect(overlay).toContain('"DEV_ADMIN_BYPASS": "false"');
  });

  it("documents staging-only Workers Builds commands, not production deploy", () => {
    expect(ops).toContain(
      "npx wrangler versions upload --env staging --name kaiyue-travel-staging",
    );
    expect(ops).toContain("CLOUDFLARE_ENV=staging");
    expect(ops).toContain("npx wrangler preview");
    expect(ops).not.toMatch(/npx wrangler deploy --env production/);
  });
});
