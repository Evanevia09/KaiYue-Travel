import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HTML_RUN_WORKER_FIRST,
  INSUFFICIENT_HTML_WORKER_FIRST_PATHS,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { evaluateOfficialStagingSmoke } from "../../scripts/official-staging-smoke-lib.mjs";
import {
  deploymentsStatusArgv,
  evaluateActivationReadback,
  versionsDeployArgv,
} from "../../scripts/official-staging-activate.mjs";
import {
  evaluateCandidate,
  extractRunWorkerFirst,
  versionsViewArgv,
} from "../../scripts/official-staging-candidate-check.mjs";
import {
  classifyCloudflareAccountId,
  classifyCloudflareApiToken,
  prepareWranglerSpawn,
  wranglerBin,
  wranglerCredentialError,
} from "../../scripts/official-staging-lib.mjs";
import { versionsUploadArgv } from "../../scripts/official-staging-upload.mjs";
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
  assets: { run_worker_first: boolean | string[] };
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
  public_site_url: string;
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
  html_run_worker_first: boolean;
  admin_site_url: string;
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
  packageManager: string;
  devDependencies: { wrangler: string };
};

describe("official staging CI/CD source", () => {
  it("keeps the generated overlay on official staging bindings and Worker-first HTML", () => {
    expect(overlay.name).toBe("kaiyue-travel-staging");
    expect(overlay.account_id).toBe("33ecc75158a1cdd23ba1a62eb70c5103");
    expect(overlay.keep_vars).toBe(false);
    expect(overlay.main).toContain("apps/web/dist/server/entry.mjs");
    expect(
      JSON.parse(readFileSync(join(repoRoot, "apps/web/package.json"), "utf8")).scripts.build,
    ).toContain("wrap-worker-entry.mjs");
    expect(overlay.d1_databases[0]?.database_id).toBe("043cd0ff-a1e6-4b5e-98c1-968c286e0c70");
    expect(overlay.r2_buckets[0]?.bucket_name).toBe("kaiyue-offers-staging");
    expect(overlay.assets.run_worker_first).toBe(true);
    expect(constants.html_run_worker_first).toBe(HTML_RUN_WORKER_FIRST);
    expect(constants.vars.ENVIRONMENT).toBe("production");
    expect(constants.admin_site_url).toBe("https://admin-staging.kaiyuemacau.com");
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
    expect(versionsUploadArgv(constants)[0]).toBe("versions");
    expect(versionsUploadArgv(constants)[1]).toBe("upload");
  });

  it("uses packageManager pnpm@10.15.0 and does not override it in official-staging.yml", () => {
    expect(packageJson.packageManager).toBe("pnpm@10.15.0");
    expect(workflow).not.toMatch(/version:\s*["']?10\.28\.0/);
    const pnpmSetups = [
      ...workflow.matchAll(/uses: pnpm\/action-setup@[^\n]+\n(?: {8}with:\n(?: {10}.+\n)+)?/g),
    ];
    expect(pnpmSetups).toHaveLength(4);
    for (const match of pnpmSetups) {
      expect(match[0]).not.toMatch(/version:/);
    }
  });

  it("builds checks and upload with the staging PUBLIC_SITE_URL and without the token", () => {
    const astroConfig = readFileSync(join(repoRoot, "apps/web/astro.config.mjs"), "utf8");
    expect(constants.public_site_url).toBe("https://staging.kaiyuemacau.com");
    expect(astroConfig).toContain("process.env.PUBLIC_SITE_URL");
    expect(astroConfig).toContain("http://localhost:4321");
    const buildSteps = workflow.split(/\n {6}- /).filter((step) => /run: pnpm build\b/.test(step));
    expect(buildSteps).toHaveLength(2);
    for (const step of buildSteps) {
      expect(step).toContain(`PUBLIC_SITE_URL: ${constants.public_site_url}`);
      expect(step).not.toContain("CLOUDFLARE_API_TOKEN");
    }
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
const recordedVersionPath = join(repoRoot, "tests/fixtures/official-staging-version-72e580d0.json");
const recordedDeploymentPath = join(
  repoRoot,
  "tests/fixtures/official-staging-deployment-28f8b40b.json",
);

type RecordedVersion = {
  id: string;
  resources: {
    script_runtime: {
      compatibility_date: string;
      compatibility_flags: string[];
      assets?: { raw_run_worker_first?: string[] | boolean };
    };
    assets?: unknown;
    bindings: Array<Record<string, unknown>>;
  };
};

function validCandidate(): RecordedVersion {
  return structuredClone(JSON.parse(readFileSync(recordedVersionPath, "utf8")) as RecordedVersion);
}

describe("official staging uploaded-version candidate gate", () => {
  it("accepts the recorded versions-view shape with raw_run_worker_first and ASSETS name/type only", () => {
    const recorded = validCandidate();
    expect(recorded.id).toBe(CANDIDATE_VERSION_ID);
    expect(recorded.resources.assets).toBeUndefined();
    expect(recorded.resources.script_runtime.assets?.raw_run_worker_first).toBe(true);
    expect(recorded.resources.bindings.find((row) => row.name === "ASSETS")).toEqual({
      type: "assets",
      name: "ASSETS",
    });
    expect(recorded.resources.bindings.find((row) => row.name === "BETTER_AUTH_SECRET")).toEqual({
      type: "secret_text",
      name: "BETTER_AUTH_SECRET",
    });
    expect(extractRunWorkerFirst(recorded, { type: "assets", name: "ASSETS" })).toBe(true);
    expect(evaluateCandidate(recorded, constants, CANDIDATE_VERSION_ID)).toEqual([]);
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

  it("rejects the historical Worker-first path array that stayed host-agnostic asset-cacheable", () => {
    const version = validCandidate();
    if (!version.resources.script_runtime.assets) {
      throw new Error("fixture missing script_runtime.assets");
    }
    version.resources.script_runtime.assets.raw_run_worker_first = [
      ...INSUFFICIENT_HTML_WORKER_FIRST_PATHS,
    ];
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /run_worker_first/,
    );
  });

  it("rejects a missing run_worker_first true on the recorded shape", () => {
    const version = validCandidate();
    delete version.resources.script_runtime.assets;
    expect(evaluateCandidate(version, constants, CANDIDATE_VERSION_ID).join("\n")).toMatch(
      /run_worker_first/,
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
    const recordedDeployment = JSON.parse(readFileSync(recordedDeploymentPath, "utf8")) as {
      id: string;
      versions: Array<{ version_id: string; percentage: number }>;
    };
    expect(evaluateActivationReadback(recordedDeployment, CANDIDATE_VERSION_ID)).toEqual([]);

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

describe("official staging pinned Wrangler 4.132.0 command construction", () => {
  function wranglerHelp(args: string[]) {
    return spawnSync(process.execPath, [wranglerBin(), ...args, "--help"], {
      encoding: "utf8",
      cwd: repoRoot,
      env: { ...process.env, CLOUDFLARE_API_TOKEN: "", CLOUDFLARE_ACCOUNT_ID: "" },
    });
  }

  it("registers deployments status --json and versions view/upload/deploy on the pin", () => {
    expect(packageJson.devDependencies.wrangler).toBe("4.132.0");
    const wranglerPkg = JSON.parse(
      readFileSync(join(repoRoot, "node_modules/wrangler/package.json"), "utf8"),
    ) as { version: string };
    expect(wranglerPkg.version).toBe("4.132.0");

    const statusHelp = wranglerHelp(["deployments", "status"]);
    expect(statusHelp.status, statusHelp.stderr).toBe(0);
    expect(statusHelp.stdout).toMatch(/wrangler deployments status/);
    expect(statusHelp.stdout).toMatch(/--json/);

    const versionsHelp = wranglerHelp(["versions"]);
    expect(versionsHelp.status, versionsHelp.stderr).toBe(0);
    expect(versionsHelp.stdout).toMatch(/wrangler versions view/);
    expect(versionsHelp.stdout).toMatch(/wrangler versions upload/);
    expect(versionsHelp.stdout).toMatch(/wrangler versions deploy/);
    expect(versionsHelp.stdout).not.toMatch(/wrangler versions deployments/);

    const nested = wranglerHelp(["versions", "deployments", "status"]);
    expect(nested.stdout).not.toMatch(/wrangler versions deployments status/);
    expect(nested.stdout).toMatch(/wrangler versions/);
  });

  it("builds argv that match those registered commands", () => {
    const uploadArgv = versionsUploadArgv(constants);
    const viewArgv = versionsViewArgv(constants, CANDIDATE_VERSION_ID);
    const deployArgv = versionsDeployArgv(constants, CANDIDATE_VERSION_ID);
    const statusArgv = deploymentsStatusArgv(constants);

    expect(uploadArgv.slice(0, 2)).toEqual(["versions", "upload"]);
    expect(viewArgv.slice(0, 3)).toEqual(["versions", "view", CANDIDATE_VERSION_ID]);
    expect(viewArgv).toContain("--json");
    expect(deployArgv.slice(0, 3)).toEqual(["versions", "deploy", `${CANDIDATE_VERSION_ID}@100%`]);
    expect(statusArgv.slice(0, 2)).toEqual(["deployments", "status"]);
    expect(statusArgv[0]).not.toBe("versions");
    expect(statusArgv).toContain("--json");
    expect(statusArgv).toEqual([
      "deployments",
      "status",
      "--name",
      constants.worker_name,
      "--config",
      overlayPath,
      "--json",
    ]);
  });
});

const DUMMY_TOKEN = "DUMMY.CF.TOKEN.NOTREAL_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DUMMY_FRAGMENTS = [
  "DUMMY.CF.TOKEN.NOTREAL",
  "aaaaaaaaaaaaaaaa",
  "Bearer DUMMY",
  "Authorization:",
];
const CREDENTIALED_SCRIPTS = [
  "official-staging-upload.mjs",
  "official-staging-candidate-check.mjs",
  "official-staging-activate.mjs",
] as const;

function assertNoSecretFragments(output: string) {
  for (const fragment of DUMMY_FRAGMENTS) {
    expect(output).not.toContain(fragment);
  }
  expect(output).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{8,}/);
  expect(output).not.toMatch(/Headers\.set:/);
}

function childEnv(overrides: Record<string, string | undefined>) {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CF_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  delete env.CLOUDFLARE_API_KEY;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }
  env.CLOUDFLARE_API_BASE_URL = "http://127.0.0.1:9";
  env.CF_API_BASE_URL = "http://127.0.0.1:9";
  env.CLOUDFLARE_BASE_URL = "http://127.0.0.1:9";
  return env;
}

function runCredentialedScript(script: string, env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [join(repoRoot, "scripts", script)], {
    encoding: "utf8",
    cwd: repoRoot,
    env,
    timeout: 15000,
  });
}

describe("official staging fail-closed Cloudflare credential format gate", () => {
  it("accepts a clean dummy token and matching overlay account id without spawning", () => {
    expect(classifyCloudflareApiToken(DUMMY_TOKEN)).toBe("ok");
    expect(classifyCloudflareAccountId(constants.account_id, constants.account_id)).toBe("ok");
    const env = {
      CLOUDFLARE_API_TOKEN: DUMMY_TOKEN,
      CLOUDFLARE_ACCOUNT_ID: constants.account_id,
    };
    expect(wranglerCredentialError(env, constants.account_id)).toBeNull();
    const prepared = prepareWranglerSpawn(["versions", "upload"], env, constants.account_id);
    expect(prepared.ok).toBe(true);
    expect(prepared.error).toBeNull();
    expect(prepared.command).toBe(process.execPath);
    expect(prepared.args?.[0]).toBe(wranglerBin());
    expect(prepared.args?.slice(1)).toEqual(["versions", "upload"]);
  });

  it("classifies missing, control, non-latin1, quoted, and copy-snippet tokens categorically", () => {
    expect(classifyCloudflareApiToken(undefined)).toBe("missing");
    expect(classifyCloudflareApiToken("")).toBe("missing");
    expect(classifyCloudflareApiToken("   ")).toBe("missing");
    expect(classifyCloudflareApiToken(`\n${DUMMY_TOKEN}`)).toBe("malformed");
    expect(
      classifyCloudflareApiToken(`${DUMMY_TOKEN.slice(0, 20)}\n${DUMMY_TOKEN.slice(20)}`),
    ).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN}\n`)).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN}\r\n`)).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN}\r`)).toBe("malformed");
    expect(
      classifyCloudflareApiToken(`${DUMMY_TOKEN.slice(0, 20)}\0${DUMMY_TOKEN.slice(20)}`),
    ).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN}\u2026`)).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN}令`)).toBe("malformed");
    expect(classifyCloudflareApiToken(` ${DUMMY_TOKEN}`)).toBe("malformed");
    expect(classifyCloudflareApiToken(`${DUMMY_TOKEN} `)).toBe("malformed");
    expect(classifyCloudflareApiToken(`Bearer ${DUMMY_TOKEN}`)).toBe("copied_snippet");
    expect(classifyCloudflareApiToken(`Authorization: Bearer ${DUMMY_TOKEN}`)).toBe(
      "copied_snippet",
    );
    expect(classifyCloudflareApiToken(`"${DUMMY_TOKEN}"`)).toBe("copied_snippet");
    expect(classifyCloudflareApiToken(`'${DUMMY_TOKEN}'`)).toBe("copied_snippet");
    expect(classifyCloudflareApiToken("```\n" + DUMMY_TOKEN + "\n```")).toBe("copied_snippet");
    expect(
      classifyCloudflareApiToken(`${DUMMY_TOKEN.slice(0, 20)}\n    ${DUMMY_TOKEN.slice(20)}`),
    ).toBe("malformed");
  });

  it("does not echo dummy token or header fragments in categorical errors", () => {
    const cases = [
      { CLOUDFLARE_API_TOKEN: undefined, CLOUDFLARE_ACCOUNT_ID: constants.account_id },
      { CLOUDFLARE_API_TOKEN: `\n${DUMMY_TOKEN}`, CLOUDFLARE_ACCOUNT_ID: constants.account_id },
      {
        CLOUDFLARE_API_TOKEN: `${DUMMY_TOKEN.slice(0, 20)}\n${DUMMY_TOKEN.slice(20)}`,
        CLOUDFLARE_ACCOUNT_ID: constants.account_id,
      },
      { CLOUDFLARE_API_TOKEN: `${DUMMY_TOKEN}\r\n`, CLOUDFLARE_ACCOUNT_ID: constants.account_id },
      {
        CLOUDFLARE_API_TOKEN: `${DUMMY_TOKEN.slice(0, 12)}\0${DUMMY_TOKEN.slice(12)}`,
        CLOUDFLARE_ACCOUNT_ID: constants.account_id,
      },
      { CLOUDFLARE_API_TOKEN: `${DUMMY_TOKEN}\u2026`, CLOUDFLARE_ACCOUNT_ID: constants.account_id },
      {
        CLOUDFLARE_API_TOKEN: `Bearer ${DUMMY_TOKEN}`,
        CLOUDFLARE_ACCOUNT_ID: constants.account_id,
      },
      { CLOUDFLARE_API_TOKEN: `"${DUMMY_TOKEN}"`, CLOUDFLARE_ACCOUNT_ID: constants.account_id },
      { CLOUDFLARE_API_TOKEN: DUMMY_TOKEN, CLOUDFLARE_ACCOUNT_ID: undefined },
      { CLOUDFLARE_API_TOKEN: DUMMY_TOKEN, CLOUDFLARE_ACCOUNT_ID: "not-the-overlay-account" },
    ];
    for (const env of cases) {
      const message = wranglerCredentialError(env, constants.account_id);
      expect(message).toEqual(expect.any(String));
      expect(message).toMatch(/refusing to call Wrangler/);
      expect(message).not.toMatch(/length|index|U\+/i);
      assertNoSecretFragments(message ?? "");
      const prepared = prepareWranglerSpawn(["versions", "upload"], env, constants.account_id);
      expect(prepared.ok).toBe(false);
      expect(prepared.command).toBeNull();
      expect(prepared.args).toBeNull();
      assertNoSecretFragments(prepared.error ?? "");
    }
  });

  it("refuses malformed env in upload, candidate-check, and activate without starting Wrangler", () => {
    const invalidEnv = childEnv({
      CLOUDFLARE_API_TOKEN: `${DUMMY_TOKEN.slice(0, 20)}\n    ${DUMMY_TOKEN.slice(20)}`,
      CLOUDFLARE_ACCOUNT_ID: constants.account_id,
      WORKER_VERSION_ID: CANDIDATE_VERSION_ID,
    });
    for (const script of CREDENTIALED_SCRIPTS) {
      const result = runCredentialedScript(script, invalidEnv);
      const output = `${result.stdout}\n${result.stderr}`;
      expect(result.status, output).toBe(1);
      expect(output).toMatch(/CLOUDFLARE_API_TOKEN is not a usable HTTP credential/);
      expect(output).toMatch(/refusing to call Wrangler/);
      expect(output).not.toMatch(/wrangler 4\.132\.0/);
      expect(output).not.toMatch(/Worker Version ID:/);
      assertNoSecretFragments(output);
    }
  });

  it("keeps the credential gate on every token-bearing script and leaves production credential-free", () => {
    for (const script of CREDENTIALED_SCRIPTS) {
      const source = readFileSync(join(repoRoot, "scripts", script), "utf8");
      expect(source).toContain("spawnWrangler");
      expect(source).not.toMatch(/spawnSync\(/);
    }
    const lib = readFileSync(join(repoRoot, "scripts/official-staging-lib.mjs"), "utf8");
    expect(lib).toContain("wranglerCredentialError");
    expect(lib).toContain("prepareWranglerSpawn");
    expect(lib).toMatch(/refusing to call Wrangler/);
    expect(lib).not.toMatch(/\.trim\(/);
    expect(productionWorkflow).not.toContain("CLOUDFLARE_");
    expect(ciWorkflow).not.toContain("CLOUDFLARE_API_TOKEN");
  });
});

describe("official staging HTTP smoke contract", () => {
  const publicHome = { status: 200, body: "marketing", location: "" };
  const publicLogin = { status: 403, body: "FORBIDDEN", location: "" };
  const adminLogin = { status: 200, body: "Admin sign in", location: "" };
  const expectedAdminOrigin = "https://admin-staging.kaiyuemacau.com";
  const passing = {
    publicHome,
    publicLogin,
    adminLogin,
    expectedAdminOrigin,
  };

  it("fails when admin-staging / is cached marketing HTML", () => {
    expect(
      evaluateOfficialStagingSmoke({
        ...passing,
        adminRoot: {
          status: 200,
          body: "Private chauffeur across the Greater Bay Area",
          location: "",
        },
      }),
    ).toMatch(/admin-staging \//);
  });

  it("passes only when admin-staging / redirects to that origin's exact /login", () => {
    expect(
      evaluateOfficialStagingSmoke({
        ...passing,
        adminRoot: { status: 302, body: "", location: "/login" },
      }),
    ).toBeNull();
    expect(
      evaluateOfficialStagingSmoke({
        ...passing,
        adminRoot: {
          status: 302,
          body: "",
          location: "https://admin-staging.kaiyuemacau.com/login",
        },
      }),
    ).toBeNull();
  });

  it("rejects external-host, protocol-relative, wrong-path, and non-redirect login Locations", () => {
    const negatives = [
      { status: 302, body: "", location: "https://unrelated.example/login" },
      { status: 302, body: "", location: "//unrelated.example/login" },
      { status: 302, body: "", location: "/wrong/login" },
      { status: 200, body: "", location: "/login" },
      { status: 302, body: "", location: "" },
    ];
    for (const adminRoot of negatives) {
      expect(
        evaluateOfficialStagingSmoke({ ...passing, adminRoot }),
        `${adminRoot.status} ${adminRoot.location}`,
      ).toMatch(/admin-staging \//);
    }
  });
});
