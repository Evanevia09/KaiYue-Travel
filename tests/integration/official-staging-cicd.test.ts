import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HTML_WORKER_FIRST_PATHS } from "../../apps/web/src/lib/server/admin-gate.ts";
import { evaluateActivationReadback } from "../../scripts/official-staging-activate.mjs";
import { evaluateCandidate } from "../../scripts/official-staging-candidate-check.mjs";
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
  not_tamperproof: boolean;
  target: { d1_id: string; worker_name: string; account_id: string };
  attested_applied: { migration_files: string[] };
  required_migration_files: Array<{ file: string; sha256: string }>;
  required_objects: string[];
  ci_must_not: string[];
};

type StagingConstants = {
  d1_id: string;
  d1_name: string;
  worker_name: string;
  account_id: string;
  r2_bucket: string;
  production_d1: string;
  obsolete_d1: string;
  trial_d1: string;
  wrangler_version: string;
  github_environment: string;
  github_environment_required_reviewers: boolean;
  production_github_environment_required_reviewers: boolean;
  attested_applied_migrations: string[];
  required_schema_migrations: string[];
  required_schema_tables: string[];
  github_secret_names: string[];
  forbidden_github_secret_names: string[];
  compatibility_date: string;
  html_worker_first_paths: string[];
  vars: Record<string, string>;
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
    expect(workflow).toContain("official-staging-candidate-check.mjs");
    expect(workflow).not.toContain("official-staging-binding-check");
    expect(workflow).not.toContain("official-staging-secret-check");
    expect(workflow).not.toContain("secret list");
    expect(upload).toContain("worker_version_id=");
  });

  it("limits CLOUDFLARE_API_TOKEN to upload, candidate-check, and activate steps", () => {
    expect(workflow).not.toMatch(/^ {4}env:\n(?: {6}.+\n)* {6}CLOUDFLARE_API_TOKEN:/m);
    const indents = [...workflow.matchAll(/^( *)CLOUDFLARE_API_TOKEN:/gm)].map(
      (match) => match[1].length,
    );
    expect(indents.length).toBe(3);
    expect(indents.every((spaces) => spaces >= 10)).toBe(true);
    const steps = workflow.split(/\n {6}- /);
    for (const step of steps) {
      if (/official-staging-(upload|candidate-check|activate)\.mjs/.test(step)) {
        expect(step).toContain("CLOUDFLARE_API_TOKEN");
      }
      if (
        /pnpm (install|build|lint|typecheck|test)/.test(step) ||
        /official-staging-(guard|schema-check|smoke)\.mjs/.test(step)
      ) {
        expect(step).not.toContain("CLOUDFLARE_API_TOKEN");
      }
    }
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
    expect(contract.not_tamperproof).toBe(true);
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
    expect(schema.stdout).toMatch(/not tamperproof/);
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

    const tamperClaim = baseInput();
    tamperClaim.contract.not_tamperproof = false;
    expect(evaluateSchemaContract(tamperClaim).join("\n")).toMatch(/not tamperproof/);

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

const CANDIDATE_VERSION_ID = "72e580d0-aeb1-4766-935a-0cb9a27631a4";
const ACTIVATION_DEPLOYMENT_ID = "28f8b40b-0ffa-45aa-ba82-601f9e429e0f";

function validCandidate() {
  return {
    id: CANDIDATE_VERSION_ID,
    resources: {
      script_runtime: {
        compatibility_date: constants.compatibility_date,
        compatibility_flags: ["nodejs_compat"],
      },
      assets: {
        config: {
          run_worker_first: [...constants.html_worker_first_paths] as string[] | boolean,
        },
      },
      bindings: [
        { type: "d1", name: "DB", id: constants.d1_id, database_name: constants.d1_name },
        { type: "r2_bucket", name: "OFFERS_BUCKET", bucket_name: constants.r2_bucket },
        { type: "assets", name: "ASSETS" },
        ...Object.entries(constants.vars).map(([name, text]) => ({
          type: "plain_text",
          name,
          text,
        })),
        { type: "secret_text", name: "BETTER_AUTH_SECRET" },
      ] as Array<Record<string, unknown>>,
    },
  };
}

describe("official staging uploaded-version candidate gate", () => {
  it("accepts exact official binding names/types/IDs, vars, compatibility, Worker-first, and BetterAuth name/type only", () => {
    expect(evaluateCandidate(validCandidate(), constants, CANDIDATE_VERSION_ID)).toEqual([]);
  });

  it("rejects a D1 UUID on the wrong binding name", () => {
    const version = validCandidate();
    const db = version.resources.bindings.find((row) => row.name === "DB");
    if (!db) {
      throw new Error("fixture missing DB");
    }
    db.name = "DATABASE";
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(/DB/);
  });

  it("rejects the wrong R2 binding type", () => {
    const version = validCandidate();
    const r2 = version.resources.bindings.find((row) => row.name === "OFFERS_BUCKET");
    if (!r2) {
      throw new Error("fixture missing OFFERS_BUCKET");
    }
    r2.type = "r2";
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /r2_bucket/,
    );
  });

  it("rejects a missing ASSETS binding", () => {
    const version = validCandidate();
    version.resources.bindings = version.resources.bindings.filter((row) => row.name !== "ASSETS");
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /ASSETS/,
    );
  });

  it("rejects boolean run_worker_first instead of the Worker-first path array", () => {
    const version = validCandidate();
    version.resources.assets.config.run_worker_first = true;
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /Worker-first/,
    );
  });

  it("rejects a missing Worker-first path array", () => {
    const version = validCandidate();
    delete (version.resources as { assets?: unknown }).assets;
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /Worker-first/,
    );
  });

  it("rejects BETTER_AUTH_SECRET as plain_text", () => {
    const version = validCandidate();
    const secret = version.resources.bindings.find((row) => row.name === "BETTER_AUTH_SECRET");
    if (!secret) {
      throw new Error("fixture missing BETTER_AUTH_SECRET");
    }
    secret.type = "plain_text";
    (secret as { text?: string }).text = "not-a-secret-value";
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("rejects a missing BetterAuth secret_text binding on the uploaded version", () => {
    const version = validCandidate();
    version.resources.bindings = version.resources.bindings.filter(
      (row) => row.name !== "BETTER_AUTH_SECRET",
    );
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("rejects BetterAuth metadata that includes a secret value", () => {
    const version = validCandidate();
    const secret = version.resources.bindings.find((row) => row.name === "BETTER_AUTH_SECRET");
    if (!secret) {
      throw new Error("fixture missing BETTER_AUTH_SECRET");
    }
    (secret as { text?: string }).text = "leaked";
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /secret value/,
    );
  });

  it("rejects a missing overlay var", () => {
    const version = validCandidate();
    version.resources.bindings = version.resources.bindings.filter(
      (row) => row.name !== "PUBLIC_SITE_URL",
    );
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /PUBLIC_SITE_URL/,
    );
  });

  it("rejects Access, temp, password, and Resend names", () => {
    const version = validCandidate();
    version.resources.bindings.push({
      type: "plain_text",
      name: "ACCESS_AUD",
      text: "aud",
    });
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /ACCESS_AUD/,
    );
    const resend = validCandidate();
    resend.resources.bindings.push({ type: "secret_text", name: "RESEND_API_KEY" });
    expect(evaluateCandidate(resend, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(/RESEND/);
  });

  it("rejects production D1, wrong compatibility, and malformed bindings", () => {
    const production = validCandidate();
    const db = production.resources.bindings.find((row) => row.name === "DB");
    if (!db) {
      throw new Error("fixture missing DB");
    }
    (db as { id: string }).id = constants.production_d1;
    expect(evaluateCandidate(production, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /forbidden D1|!=/,
    );

    const compat = validCandidate();
    compat.resources.script_runtime.compatibility_date = "2024-01-01";
    compat.resources.script_runtime.compatibility_flags = [];
    const compatErrors = evaluateCandidate(compat, constants, CANDIDATE_VERSION_ID).join("\n");
    expect(compatErrors).toMatch(/compatibility_date/);
    expect(compatErrors).toMatch(/nodejs_compat/);

    expect(
      evaluateCandidate(
        { id: CANDIDATE_VERSION_ID, resources: { bindings: {} } },
        constants,
        CANDIDATE_VERSION_ID,
      ).join("\n"),
    ).toMatch(/bindings must be an array/);
    expect(evaluateCandidate(null as never, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /missing or not an object/,
    );
  });
});

describe("official staging activation readback", () => {
  it("records deployment/version/100% and rejects split or wrong-version traffic", () => {
    expect(
      evaluateActivationReadback(
        {
          id: ACTIVATION_DEPLOYMENT_ID,
          versions: [{ version_id: CANDIDATE_VERSION_ID, percentage: 100 }],
        },
        CANDIDATE_VERSION_ID,
      ),
    ).toEqual([]);

    expect(
      evaluateActivationReadback(
        {
          id: ACTIVATION_DEPLOYMENT_ID,
          versions: [
            { version_id: CANDIDATE_VERSION_ID, percentage: 50 },
            { version_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", percentage: 50 },
          ],
        },
        CANDIDATE_VERSION_ID,
      ).join("\n"),
    ).toMatch(/100%|single 100%/);

    expect(
      evaluateActivationReadback(
        {
          id: ACTIVATION_DEPLOYMENT_ID,
          versions: [{ version_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", percentage: 100 }],
        },
        CANDIDATE_VERSION_ID,
      ).join("\n"),
    ).toMatch(/!= uploaded/);
  });

  it("treats a failed versions deploy as unknown remote traffic and does not assert old traffic remains", () => {
    const activate = readFileSync(join(repoRoot, "scripts/official-staging-activate.mjs"), "utf8");
    expect(activate).toMatch(/may have committed remotely/);
    expect(activate).toMatch(/Remote traffic is unknown/);
    expect(activate).not.toMatch(/previous traffic remains/);
    expect(activate).toMatch(/Do not retry blindly/);
    expect(activate).toMatch(/activation readback: worker/);
    expect(activate).toMatch(/@100%/);
  });
});
