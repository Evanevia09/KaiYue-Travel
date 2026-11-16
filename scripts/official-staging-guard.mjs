import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CI_WORKFLOW_PATH,
  OVERLAY_PATH,
  PRODUCTION_WORKFLOW_PATH,
  REPO_ROOT,
  SCHEMA_CONTRACT_PATH,
  WORKFLOW_PATH,
  fail,
  loadConstants,
  loadGitWrangler,
  loadOverlay,
  loadSchemaContract,
} from "./official-staging-lib.mjs";
import { deploymentsStatusArgv, versionsDeployArgv } from "./official-staging-activate.mjs";
import { versionsViewArgv } from "./official-staging-candidate-check.mjs";
import { renderOverlay } from "./official-staging-overlay.mjs";
import { versionsUploadArgv } from "./official-staging-upload.mjs";

const constants = loadConstants();
const overlay = loadOverlay();
const gitWrangler = loadGitWrangler();
const overlayText = readFileSync(OVERLAY_PATH, "utf8");
const workflow = readFileSync(WORKFLOW_PATH, "utf8");
const productionWorkflow = readFileSync(PRODUCTION_WORKFLOW_PATH, "utf8");
const ciWorkflow = readFileSync(CI_WORKFLOW_PATH, "utf8");
const wranglerPkg = JSON.parse(
  readFileSync(join(REPO_ROOT, "node_modules/wrangler/package.json"), "utf8"),
);
const packageJson = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));

const errors = [];

function check(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

check(overlayText === renderOverlay(constants), "overlay must be generated from constants.json");
check(overlay.name === constants.worker_name, `overlay name must be ${constants.worker_name}`);
check(overlay.account_id === constants.account_id, "overlay account_id mismatch");
check(overlay.keep_vars === false, "overlay keep_vars must be false");
check(overlay.d1_databases?.[0]?.database_id === constants.d1_id, "overlay D1 id mismatch");
check(overlay.d1_databases?.[0]?.database_name === constants.d1_name, "overlay D1 name mismatch");
check(overlay.r2_buckets?.[0]?.bucket_name === constants.r2_bucket, "overlay R2 mismatch");
check(
  overlay.vars?.PUBLIC_SITE_URL === constants.public_site_url,
  "overlay PUBLIC_SITE_URL mismatch",
);
check(overlay.vars?.DEV_ADMIN_BYPASS === "false", "overlay DEV_ADMIN_BYPASS must be false");
check(overlay.main === constants.overlay_main, "overlay main must be Astro server entry");
check(
  JSON.stringify(overlay.assets?.run_worker_first) ===
    JSON.stringify(constants.html_worker_first_paths),
  "overlay run_worker_first paths mismatch",
);
check(
  !("BETTER_AUTH_SECRET" in (overlay.vars ?? {})),
  "overlay must not contain BETTER_AUTH_SECRET",
);
check(!("ACCESS_AUD" in (overlay.vars ?? {})), "overlay must not contain ACCESS_AUD");
check(
  !("ACCESS_TEAM_DOMAIN" in (overlay.vars ?? {})),
  "overlay must not contain ACCESS_TEAM_DOMAIN",
);
check(!("RESEND_API_KEY" in (overlay.vars ?? {})), "overlay must not contain RESEND_API_KEY");
check(!overlayText.includes(constants.production_d1), "overlay must not mention production D1");
check(!overlayText.includes(constants.obsolete_d1), "overlay must not mention obsolete D1");
check(!overlayText.includes(constants.trial_d1), "overlay must not mention trial D1");
check(!overlayText.includes("--keep-vars"), "overlay comments must not instruct --keep-vars");
check(
  !("no_bundle" in overlay),
  "source overlay must bundle from Astro dist, not frozen zip entry.js",
);

check(
  gitWrangler.name === "kaiyue-travel",
  "git wrangler.jsonc remains the non-upload Worker name",
);
check(
  gitWrangler.d1_databases?.[0]?.database_id === constants.obsolete_d1,
  "git wrangler.jsonc still binds obsolete D1 and must never be uploaded",
);

check(
  wranglerPkg.version === constants.wrangler_version,
  `wrangler must be pinned ${constants.wrangler_version}`,
);
check(
  packageJson.devDependencies.wrangler === constants.wrangler_version,
  `package.json wrangler must be exactly ${constants.wrangler_version}`,
);

check(
  workflow.includes(`branches: [${constants.release_branch}]`),
  "workflow must trigger on official-staging only",
);
check(workflow.includes("workflow_dispatch:"), "workflow must allow manual dispatch");
check(
  workflow.includes(`github.ref != 'refs/heads/${constants.release_branch}'`),
  "non-release refs must fail closed",
);
check(
  workflow.includes(`github.ref == 'refs/heads/${constants.release_branch}'`),
  "jobs must no-op off official-staging",
);
check(constants.github_environment === "staging", "GitHub environment name must be staging");
check(
  constants.github_environment_required_reviewers === false,
  "staging env has no required reviewers",
);
check(
  constants.production_github_environment_required_reviewers === true,
  "production GitHub environment must require an owner reviewer in UI",
);
check(
  workflow.includes(`environment: ${constants.github_environment}`),
  "upload/activate must use GitHub environment staging",
);
check(
  !workflow.includes("environment: official-staging"),
  "workflow must not use a GitHub environment named official-staging",
);
check(!/reviewers:/.test(workflow), "staging CD must not encode per-run environment approval");
check(workflow.includes("contents: read"), "workflow permissions must be contents: read");
{
  const uploadArgv = versionsUploadArgv(constants);
  const viewArgv = versionsViewArgv(constants, "72e580d0-aeb1-4766-935a-0cb9a27631a4");
  const deployArgv = versionsDeployArgv(constants, "72e580d0-aeb1-4766-935a-0cb9a27631a4");
  const statusArgv = deploymentsStatusArgv(constants);
  const activate = readFileSync(join(REPO_ROOT, "scripts/official-staging-activate.mjs"), "utf8");
  check(
    uploadArgv[0] === "versions" && uploadArgv[1] === "upload",
    "upload argv must be versions upload",
  );
  check(uploadArgv.includes("--strict"), "upload argv must pass --strict");
  check(
    readFileSync(join(REPO_ROOT, "scripts/official-staging-upload.mjs"), "utf8").includes(
      "worker_version_id=",
    ),
    "upload script must emit worker_version_id",
  );
  for (const name of [
    "official-staging-upload.mjs",
    "official-staging-candidate-check.mjs",
    "official-staging-activate.mjs",
  ]) {
    const source = readFileSync(join(REPO_ROOT, "scripts", name), "utf8");
    check(
      source.includes("spawnWrangler"),
      `${name} must refuse malformed credentials before Wrangler`,
    );
    check(
      !source.includes("spawnSync("),
      `${name} must not spawn Wrangler without the credential gate`,
    );
  }
  check(
    viewArgv[0] === "versions" && viewArgv[1] === "view",
    "candidate argv must be versions view",
  );
  check(viewArgv.includes("--json"), "candidate argv must request JSON");
  check(
    deployArgv[0] === "versions" && deployArgv[1] === "deploy",
    "activate argv must be versions deploy",
  );
  check(
    statusArgv[0] === "deployments" && statusArgv[1] === "status",
    "readback argv must be deployments status, not versions deployments status",
  );
  check(statusArgv.includes("--json"), "readback argv must request JSON");
  check(statusArgv[0] !== "versions", "readback must not use the versions namespace");
  check(
    !/previous traffic remains/.test(activate),
    "activate must not assert that previous traffic remains",
  );
  check(
    activate.includes("may have committed remotely"),
    "activate must treat command failure as possibly committed",
  );
}
check(packageJson.packageManager === "pnpm@10.15.0", "packageManager must remain pnpm@10.15.0");
{
  const pnpmSetups = [
    ...workflow.matchAll(
      /uses: pnpm\/action-setup@[^\n]+\n(?:        with:\n(?:          .+\n)+)?/g,
    ),
  ];
  check(pnpmSetups.length === 4, "official-staging workflow must set up pnpm four times");
  for (const match of pnpmSetups) {
    check(
      !/version:/.test(match[0]),
      "pnpm/action-setup must not override packageManager with an explicit version",
    );
  }
}
{
  const buildSteps = workflow.split(/\n {6}- /).filter((step) => /run: pnpm build\b/.test(step));
  check(buildSteps.length === 2, "checks and upload must each run pnpm build once");
  for (const step of buildSteps) {
    check(
      step.includes(`PUBLIC_SITE_URL: ${constants.public_site_url}`),
      "staging build must set PUBLIC_SITE_URL; runtime vars cannot repair built artifacts",
    );
    check(!step.includes("CLOUDFLARE_API_TOKEN"), "staging build must remain token-free");
  }
}
check(
  workflow.includes("official-staging-candidate-check.mjs"),
  "workflow must validate the uploaded version with structured candidate check",
);
check(
  !workflow.includes("official-staging-binding-check"),
  "workflow must not use substring binding-check",
);
check(
  !workflow.includes("official-staging-secret-check"),
  "workflow must not use Worker secret-list as the candidate gate",
);
check(!workflow.includes("secret list"), "workflow must not use secret list as the candidate gate");
check(
  !/^ {4}env:\n(?: {6}.+\n)* {6}CLOUDFLARE_API_TOKEN:/m.test(workflow),
  "CLOUDFLARE_API_TOKEN must not be set at job scope",
);
check(
  /^ {10}CLOUDFLARE_API_TOKEN:/m.test(workflow),
  "CLOUDFLARE_API_TOKEN must be set only on credentialed steps",
);
{
  const steps = workflow.split(/\n {6}- /);
  for (const step of steps) {
    const needsToken = /official-staging-(upload|candidate-check|activate)\.mjs/.test(step);
    const mustNotToken =
      /pnpm (install|build|lint|typecheck|test)/.test(step) ||
      /official-staging-(guard|schema-check|smoke)\.mjs/.test(step);
    if (needsToken) {
      check(step.includes("CLOUDFLARE_API_TOKEN"), "credentialed step must receive the token");
    }
    if (mustNotToken) {
      check(
        !step.includes("CLOUDFLARE_API_TOKEN"),
        "setup/install/build/schema/smoke must not receive the token",
      );
    }
  }
}
check(
  workflow.includes("11bd71901bbe5b1630ceea73d27597364c9af683"),
  "checkout action must be pinned SHA",
);
check(
  workflow.includes("49933ea5288caeca8642d1e84afbd3f7d6820020"),
  "setup-node action must be pinned SHA",
);
check(
  workflow.includes("a7487c7e89a18df4991f7f222e4898a00d66ddda"),
  "pnpm/action-setup must be pinned SHA",
);
check(
  !/\bwrangler deploy\b/.test(workflow),
  "workflow must not use wrangler deploy (upload+traffic)",
);
check(!/d1 migrations apply/.test(workflow), "workflow must not apply D1 migrations");
check(!/d1 execute/.test(workflow), "workflow must not query D1 (Worker-only Editor cannot)");
check(!/wrangler d1/.test(workflow), "workflow must not invoke wrangler d1");
check(!/provision-staging-operators/.test(workflow), "workflow must not bootstrap operators");
check(
  workflow.includes("official-staging-schema-check.mjs"),
  "workflow must run the schema compatibility contract before activation",
);
check(existsSync(SCHEMA_CONTRACT_PATH), "schema compatibility contract must exist");
{
  const contract = loadSchemaContract();
  check(contract.live_d1_query === false, "schema contract must not query live D1");
  check(
    contract.not_a_live_d1_readback === true,
    "schema contract must not claim live D1 readback",
  );
  check(contract.not_tamperproof === true, "schema contract must declare it is not tamperproof");
  check(contract.target?.d1_id === constants.d1_id, "schema contract D1 id mismatch");
  check(
    (contract.ci_must_not ?? []).includes("d1 execute"),
    "schema contract must forbid d1 execute",
  );
  check(
    JSON.stringify(contract.attested_applied?.migration_files) ===
      JSON.stringify(constants.attested_applied_migrations),
    "schema contract must attest exact applied 0001–0010",
  );
}
check(!workflow.includes("branches: [main]"), "official-staging workflow must not trigger on main");
check(
  !workflow.includes("branches: [staging]"),
  "official-staging workflow must not trigger on staging",
);
check(
  !workflow.includes("cloudflare/wrangler-action"),
  "workflow must use lockfile wrangler, not wrangler-action",
);
check(!ciWorkflow.includes("wrangler"), "ci.yml must remain check-only");
check(!ciWorkflow.includes("CLOUDFLARE_API_TOKEN"), "ci.yml must not take Cloudflare credentials");

for (const name of constants.github_secret_names) {
  check(workflow.includes(`secrets.${name}`), `workflow must read GitHub secret ${name}`);
}
for (const name of constants.forbidden_github_secret_names) {
  check(!workflow.includes(`secrets.${name}`), `workflow must not read GitHub secret ${name}`);
}

check(existsSync(PRODUCTION_WORKFLOW_PATH), "fail-closed production workflow must exist");
check(
  !/CLOUDFLARE_/.test(productionWorkflow),
  "production workflow must not reference Cloudflare credentials",
);
check(!/\bwrangler\b/.test(productionWorkflow), "production workflow must not invoke wrangler");
check(
  !productionWorkflow.includes("branches: [main]"),
  "production workflow must not trigger on main",
);
check(
  !productionWorkflow.includes("branches: [staging]"),
  "production workflow must not trigger on staging",
);
check(productionWorkflow.includes("fail-closed"), "production workflow must declare fail-closed");
check(/exit 1/.test(productionWorkflow), "production workflow must fail closed");
check(
  productionWorkflow.includes("environment: production") && /if: false/.test(productionWorkflow),
  "production GitHub environment is reserved and must not activate",
);
check(
  /owner reviewer/i.test(productionWorkflow),
  "production workflow must document required owner reviewer without enabling deploy",
);

const workflowNames = readdirSync(join(REPO_ROOT, ".github/workflows")).filter((name) =>
  name.endsWith(".yml"),
);
for (const name of workflowNames) {
  const text = readFileSync(join(REPO_ROOT, ".github/workflows", name), "utf8");
  if (name === "ci.yml") {
    continue;
  }
  check(
    !/branches:\s*\[main\]/.test(text) || !/wrangler/.test(text),
    `${name} must not combine main push with wrangler`,
  );
}

if (errors.length > 0) {
  fail(`official-staging guard failed:\n- ${errors.join("\n- ")}`);
}

console.log("official-staging guard passed");
