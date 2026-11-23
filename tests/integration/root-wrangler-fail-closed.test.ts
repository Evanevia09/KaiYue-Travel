import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const placeholderAccount = "00000000000000000000000000000000";
const realAccounts = [
  "33ecc75158a1cdd23ba1a62eb70c5103",
  "34a7a69b",
  "41386f432b6fa180fe84f51e709b729b",
];
const realD1 = [
  "069aa442-30c9-4454-ab3a-26eb372b3a1f",
  "043cd0ff-a1e6-4b5e-98c1-968c286e0c70",
  "06cf879d-8fea-4088-8881-7d382e1b8c11",
];
const realWorkers = ["kaiyue-travel", "kaiyue-travel-staging"];
const realBuckets = ["kaiyue-offers-staging", "kaiyue-offers-production"];

type WranglerConfig = {
  name: string;
  account_id?: string;
  workers_dev?: boolean;
  preview_urls?: boolean;
  routes?: unknown;
  route?: unknown;
  d1_databases?: { database_id: string; database_name: string }[];
  r2_buckets?: { bucket_name: string }[];
  vars?: Record<string, string>;
  previews?: unknown;
  env?: unknown;
};

function load(relative: string): { text: string; config: WranglerConfig } {
  const text = readFileSync(join(repoRoot, relative), "utf8");
  const config = JSON.parse(
    text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"),
  ) as WranglerConfig;
  return { text, config };
}

function expectUndeployable(config: WranglerConfig) {
  expect(realWorkers).not.toContain(config.name);
  expect(config.name).toMatch(/disabled/);
  expect(config.account_id).toBe(placeholderAccount);
  expect(config.workers_dev).toBe(false);
  expect(config.preview_urls).toBe(false);
  expect(config.routes).toBeUndefined();
  expect(config.route).toBeUndefined();
  expect(config.previews).toBeUndefined();
  expect(config.env).toBeUndefined();
}

describe("default wrangler configs cannot deploy to a real account, Worker, or database", () => {
  it("repo-root wrangler.jsonc is fail-closed with no bindings or vars", () => {
    const { text, config } = load("wrangler.jsonc");
    expectUndeployable(config);
    expect(config.d1_databases).toBeUndefined();
    expect(config.r2_buckets).toBeUndefined();
    expect(config.vars).toBeUndefined();
    for (const value of [...realAccounts, ...realD1, ...realBuckets, "scalingsmb"]) {
      expect(text).not.toContain(value);
    }
  });

  it("apps/web local-dev wrangler.jsonc (copied by Astro build into the deploy redirect) binds local-only ids", () => {
    const { text, config } = load("apps/web/wrangler.jsonc");
    expectUndeployable(config);
    expect(config.vars?.ENVIRONMENT).toBe("development");
    expect(config.vars).not.toHaveProperty("MCP_STAGING_DIRECT_WRITES");
    for (const db of config.d1_databases ?? []) {
      expect(realD1).not.toContain(db.database_id);
    }
    for (const bucket of config.r2_buckets ?? []) {
      expect(realBuckets).not.toContain(bucket.bucket_name);
    }
    for (const value of [...realAccounts, ...realD1, ...realBuckets, "scalingsmb"]) {
      expect(text).not.toContain(value);
    }
  });

  it("only the named overlays target real Workers", () => {
    const staging = load("deploy/official-staging/wrangler.jsonc").config;
    const production = load("deploy/production/wrangler.jsonc").config;
    expect(staging.name).toBe("kaiyue-travel-staging");
    expect(staging.d1_databases?.[0]?.database_id).toBe(realD1[1]);
    expect(production.name).toBe("kaiyue-travel");
    expect(production.account_id).toBe(realAccounts[0]);
    expect(production.d1_databases?.[0]?.database_id).toBe(realD1[2]);
  });
});
