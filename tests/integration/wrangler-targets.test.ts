import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const wranglerPath = fileURLToPath(new URL("../../wrangler.jsonc", import.meta.url));
const wrangler = readFileSync(wranglerPath, "utf8");
const guardPath = fileURLToPath(new URL("../../scripts/require-wrangler-env.mjs", import.meta.url));
const stagingD1 = "043cd0ff-a1e6-4b5e-98c1-968c286e0c70";
const productionD1 = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const obsoleteD1 = "069aa442-30c9-4454-ab3a-26eb372b3a1f";

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
});
