import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HTML_WORKER_FIRST_PATHS } from "../../apps/web/src/lib/server/admin-gate.ts";
import {
  evaluateSchemaContract,
  hashMigrationFiles,
} from "../../scripts/official-staging-schema-check.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const overlayPath = join(repoRoot, "deploy/official-staging/wrangler.jsonc");
const constantsPath = join(repoRoot, "deploy/official-staging/constants.json");
const contractPath = join(repoRoot, "deploy/official-staging/schema-contract.json");
const workflowPath = join(repoRoot, ".github/workflows/official-staging.yml");
const productionWorkflowPath = join(repoRoot, ".github/workflows/production.yml");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");
const gitWranglerPath = join(repoRoot, "wrangler.jsonc");
const schemaCheckPath = join(repoRoot, "scripts/official-staging-schema-check.mjs");
const packageJsonPath = join(repoRoot, "package.json");
const migrationsDir = join(repoRoot, "migrations");

function parseJsonc(text: string) {
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, "")) as Record<string, unknown>;
}

const overlayText = readFileSync(overlayPath, "utf8");
const overlay = parseJsonc(overlayText) as {
  name: string;
  account_id: string;
  keep_vars: boolean;
  main: string;
  d1_databases: Array<{ database_id: string }>;
  r2_buckets: Array<{ bucket_name: string }>;
  vars: Record<string, string>;
  assets: { run_worker_first: string[] };
};

type SchemaContract = {
  kind: string;
  live_d1_query: boolean;
  not_a_live_d1_readback: boolean;
  target: { d1_id: string; worker_name: string; account_id: string };
  attested_applied: { migration_files: string[] };
  required_migration_files: Array<{ file: string; sha256: string }>;
  required_objects: string[];
  ci_must_not: string[];
};

type StagingConstants = {
  d1_id: string;
  worker_name: string;
  account_id: string;
  wrangler_version: string;
  github_environment: string;
  github_environment_required_reviewers: boolean;
  production_github_environment_required_reviewers: boolean;
  attested_applied_migrations: string[];
  required_schema_migrations: string[];
  required_schema_tables: string[];
  github_secret_names: string[];
  forbidden_github_secret_names: string[];
};

const constants = JSON.parse(readFileSync(constantsPath, "utf8")) as StagingConstants;
const contract = JSON.parse(readFileSync(contractPath, "utf8")) as SchemaContract;
const workflow = readFileSync(workflowPath, "utf8");
const productionWorkflow = readFileSync(productionWorkflowPath, "utf8");
const ciWorkflow = readFileSync(ciWorkflowPath, "utf8");
const gitWrangler = readFileSync(gitWranglerPath, "utf8");
const schemaCheck = readFileSync(schemaCheckPath, "utf8");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  devDependencies: { wrangler: string };
};

describe("official staging CI/CD source", () => {
  it("keeps the generated overlay on official staging bindings and Worker-first HTML", () => {
    expect(overlay.name).toBe("kaiyue-travel-staging");
    expect(overlay.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(overlay.keep_vars).toBe(false);
    expect(overlay.main).toContain("apps/web/dist/server/entry.mjs");
    expect(overlay.d1_databases[0]?.database_id).toBe("043cd0ff-a1e6-4b5e-98c1-968c286e0c70");
    expect(overlay.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-staging");
    expect(overlay.assets.run_worker_first).toEqual([...HTML_WORKER_FIRST_PATHS]);
    expect(overlay.vars.ADMIN_STAGING_TEST_PASSWORD_MIN).toBe("6");
    expect(overlay.vars).not.toHaveProperty("BETTER_AUTH_SECRET");
    expect(overlayText).not.toContain("06cf879d-8fea-4088-8881-7d382e1b8c11");
    expect(overlayText).not.toContain("069aa442-30c9-4454-ab3a-26eb372b3a1f");
  });

  it("leaves git wrangler.jsonc on the obsolete D1 and uploads through the overlay script", () => {
    expect(gitWrangler).toContain("069aa442-30c9-4454-ab3a-26eb372b3a1f");
    expect(gitWrangler).not.toContain("043cd0ff-a1e6-4b5e-98c1-968c286e0c70");
    const upload = readFileSync(join(repoRoot, "scripts/official-staging-upload.mjs"), "utf8");
    expect(upload).toContain("OVERLAY_PATH");
    expect(upload).toContain("versions");
    expect(upload).toContain("upload");
    expect(upload).not.toMatch(/\bdeploy\b/);
    expect(workflow).toContain("official-staging-upload.mjs");
    expect(workflow).toContain("official-staging-activate.mjs");
  });

  it("pins Wrangler 4.132.0 and GitHub Actions SHAs", () => {
    expect(packageJson.devDependencies.wrangler).toBe("4.132.0");
    expect(constants.wrangler_version).toBe("4.132.0");
    expect(workflow).toContain("11bd71901bbe5b1630ceea73d27597364c9af683");
    expect(workflow).toContain("49933ea5288caeca8642d1e84afbd3f7d6820020");
    expect(workflow).toContain("a7487c7e89a18df4991f7f222e4898a00d66ddda");
    expect(workflow).toContain("contents: read");
  });

  it("uploads then activates on official-staging only, never wrangler deploy or main", () => {
    expect(workflow).toContain("branches: [official-staging]");
    expect(workflow).toContain("versions upload");
    expect(workflow).toContain("versions deploy");
    expect(workflow).toContain("github.ref == 'refs/heads/official-staging'");
    expect(workflow).toContain("github.ref != 'refs/heads/official-staging'");
    expect(workflow).not.toMatch(/\bwrangler deploy\b/);
    expect(workflow).not.toContain("branches: [main]");
    expect(workflow).not.toContain("branches: [staging]");
    expect(ciWorkflow).not.toContain("wrangler");
    expect(ciWorkflow).not.toContain("CLOUDFLARE_API_TOKEN");
  });

  it("uses GitHub environment staging with no per-run approval; production stays fail-closed", () => {
    expect(constants.github_environment).toBe("staging");
    expect(constants.github_environment_required_reviewers).toBe(false);
    expect(constants.production_github_environment_required_reviewers).toBe(true);
    expect(workflow).toContain("environment: staging");
    expect(workflow).not.toContain("environment: official-staging");
    expect(workflow).not.toContain("reviewers:");
    expect(productionWorkflow).toMatch(/owner reviewer/i);
    expect(productionWorkflow).toContain("fail-closed");
    expect(productionWorkflow).not.toContain("CLOUDFLARE_");
  });

  it("keeps Worker secrets off GitHub and only names Cloudflare token secrets", () => {
    for (const name of constants.github_secret_names) {
      expect(workflow).toContain(`secrets.${name}`);
    }
    for (const name of constants.forbidden_github_secret_names) {
      expect(workflow).not.toContain(`secrets.${name}`);
    }
  });

  it("uses a source schema contract instead of querying D1", () => {
    expect(contract.live_d1_query).toBe(false);
    expect(contract.not_a_live_d1_readback).toBe(true);
    expect(contract.target.d1_id).toBe(constants.d1_id);
    expect(contract.target.worker_name).toBe(constants.worker_name);
    expect(contract.ci_must_not).toEqual(
      expect.arrayContaining(["d1 execute", "d1 migrations apply", "D1 Edit"]),
    );
    const disk = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    expect(constants.attested_applied_migrations).toEqual([
      "0001_init.sql",
      "0002_booking_communication_workflow.sql",
      "0003_dispatch_inventory.sql",
      "0004_admin_auth.sql",
      "0005_special_offers.sql",
      "0006_offer_photo_variants.sql",
      "0007_booking_offer.sql",
      "0008_booking_tour_guide.sql",
      "0009_admin_operator.sql",
      "0010_admin_operator_last_super.sql",
    ]);
    expect(contract.required_migration_files.map((row) => row.file)).toEqual(
      constants.attested_applied_migrations,
    );
    expect(contract.attested_applied.migration_files).toEqual(
      constants.attested_applied_migrations,
    );
    expect(disk).toEqual(constants.attested_applied_migrations);
    for (const row of contract.required_migration_files) {
      const digest = createHash("sha256")
        .update(readFileSync(join(migrationsDir, row.file)))
        .digest("hex");
      expect(digest).toBe(row.sha256);
    }
    for (const name of constants.required_schema_migrations) {
      expect(contract.required_migration_files.map((row) => row.file)).toContain(name);
    }
    for (const name of constants.required_schema_tables) {
      expect(contract.required_objects).toContain(name);
    }
    expect(schemaCheck).not.toContain("wranglerBin");
    expect(schemaCheck).not.toContain("spawnSync");
    expect(workflow).not.toContain("d1 execute");
    expect(workflow).not.toContain("d1 migrations apply");
    expect(workflow).not.toContain("wrangler d1");
  });

  it("keeps production automation fail-closed and unconnected", () => {
    expect(existsSync(productionWorkflowPath)).toBe(true);
    expect(productionWorkflow).toContain("fail-closed");
    expect(productionWorkflow).toContain("if: false");
    expect(productionWorkflow).toContain("environment: production");
    expect(productionWorkflow).not.toContain("CLOUDFLARE_");
    expect(productionWorkflow).not.toMatch(/\bwrangler\b/);
    expect(productionWorkflow).not.toContain("branches: [main]");
    expect(productionWorkflow).toContain("exit 1");
  });

  it("passes overlay generation, schema contract, and guard without Cloudflare credentials", () => {
    const overlayCheck = spawnSync(
      process.execPath,
      [join(repoRoot, "scripts/official-staging-overlay.mjs"), "--check"],
      { encoding: "utf8", cwd: repoRoot },
    );
    expect(overlayCheck.status, overlayCheck.stderr).toBe(0);
    const schema = spawnSync(process.execPath, [schemaCheckPath], {
      encoding: "utf8",
      cwd: repoRoot,
    });
    expect(schema.status, schema.stderr).toBe(0);
    expect(schema.stdout).toMatch(/live D1 not queried/);
    const guard = spawnSync(
      process.execPath,
      [join(repoRoot, "scripts/official-staging-guard.mjs")],
      {
        encoding: "utf8",
        cwd: repoRoot,
      },
    );
    expect(guard.status, guard.stderr).toBe(0);
  });
});

describe("official staging schema contract tamper guards", () => {
  function baseInput() {
    const diskFiles = readdirSync(migrationsDir)
      .filter((name) => name.endsWith(".sql"))
      .sort();
    return {
      contract: structuredClone(contract),
      constants: structuredClone(constants),
      diskFiles,
      fileHashes: hashMigrationFiles(migrationsDir, diskFiles),
      workflowText: workflow,
    };
  }

  it("accepts the attested 0001–0010 contract and rejects live-D1 or list/hash tampers", () => {
    expect(evaluateSchemaContract(baseInput())).toEqual([]);

    const liveQuery = baseInput();
    liveQuery.contract.live_d1_query = true;
    expect(evaluateSchemaContract(liveQuery).join("\n")).toMatch(/not a live D1 readback/);

    const hashTamper = baseInput();
    hashTamper.contract.required_migration_files[0].sha256 = "0".repeat(64);
    expect(evaluateSchemaContract(hashTamper).join("\n")).toMatch(/hash/);

    const dropFile = baseInput();
    dropFile.contract.required_migration_files = dropFile.contract.required_migration_files.slice(
      0,
      9,
    );
    dropFile.contract.attested_applied.migration_files =
      dropFile.contract.attested_applied.migration_files.slice(0, 9);
    expect(evaluateSchemaContract(dropFile).join("\n")).toMatch(/0001/);

    const extraFile = baseInput();
    extraFile.diskFiles = [...extraFile.diskFiles, "0011_extra.sql"];
    expect(evaluateSchemaContract(extraFile).join("\n")).toMatch(/0011_extra/);

    const reorder = baseInput();
    const files = [...reorder.contract.required_migration_files];
    [files[8], files[9]] = [files[9], files[8]];
    reorder.contract.required_migration_files = files;
    reorder.contract.attested_applied.migration_files = files.map((row) => row.file);
    expect(evaluateSchemaContract(reorder).join("\n")).toMatch(/order/);
  });
});
