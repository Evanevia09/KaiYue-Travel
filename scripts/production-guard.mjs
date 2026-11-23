import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { deploymentsStatusArgv, versionsDeployArgv } from "./production-activate.mjs";
import { versionsViewArgv } from "./production-candidate-check.mjs";
import {
  CI_WORKFLOW_PATH,
  GIT_WRANGLER_PATH,
  OVERLAY_PATH,
  REPO_ROOT,
  STAGING_WORKFLOW_PATH,
  WORKFLOW_PATH,
  fail,
  loadConstants,
  loadOverlay,
  parseJsonc,
} from "./production-lib.mjs";
import { migrationsApplyArgv, migrationsListArgv } from "./production-migrate.mjs";
import { versionsUploadArgv } from "./production-upload.mjs";

const constants = loadConstants();
const overlay = loadOverlay();
const overlayText = readFileSync(OVERLAY_PATH, "utf8");
const workflow = readFileSync(WORKFLOW_PATH, "utf8");
const stagingWorkflow = readFileSync(STAGING_WORKFLOW_PATH, "utf8");
const ciWorkflow = readFileSync(CI_WORKFLOW_PATH, "utf8");
const gitWrangler = parseJsonc(readFileSync(GIT_WRANGLER_PATH, "utf8"));
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

function sameList(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((entry) => actual.includes(entry))
  );
}

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
check(
  overlay.vars?.PUBLIC_SITE_URL === "https://kaiyuemacau.com",
  "overlay must bake the live site URL",
);
check(overlay.vars?.DEV_ADMIN_BYPASS === "false", "overlay DEV_ADMIN_BYPASS must be false");
check(overlay.main === constants.overlay_main, "overlay main must be Astro server entry");
{
  const webPackage = JSON.parse(readFileSync(join(REPO_ROOT, "apps/web/package.json"), "utf8"));
  check(
    typeof webPackage.scripts?.build === "string" &&
      webPackage.scripts.build.includes("wrap-worker-entry.mjs"),
    "web build must wrap Worker entry before adapter asset fallback",
  );
}
check(overlay.assets?.run_worker_first === true, "overlay run_worker_first must be true");
check(constants.html_run_worker_first === true, "constants html_run_worker_first must be true");
check(overlay.vars?.ENVIRONMENT === "production", "overlay ENVIRONMENT must be production");
check(overlay.vars?.NOTIFICATIONS_ENABLED === "true", "overlay NOTIFICATIONS_ENABLED must be true");
check(
  overlay.vars?.NOTIFY_STAFF_TO === constants.approved_production_staff_to,
  "overlay NOTIFY_STAFF_TO must be the production staff inbox",
);
check(
  overlay.vars?.WHATSAPP_NUMBER === "+85363128081",
  "overlay WHATSAPP_NUMBER must be the owner WhatsApp enquiry number",
);
check(
  !("BETTER_AUTH_SECRET" in (overlay.vars ?? {})),
  "overlay must not contain BETTER_AUTH_SECRET",
);
for (const name of constants.forbidden_var_names ?? []) {
  check(!(name in (overlay.vars ?? {})), `overlay must not contain ${name}`);
}
check(!("ACCESS_AUD" in (overlay.vars ?? {})), "overlay must not contain ACCESS_AUD");
check(
  !Object.keys(overlay.vars ?? {}).some((name) => name.startsWith("RESEND_")),
  "overlay must not contain RESEND_* vars",
);
{
  const approvedSenders = constants.approved_production_mail_senders;
  const mail = overlay.send_email ?? [];
  check(
    mail.length === 1 &&
      mail[0].name === "EMAIL" &&
      sameList(mail[0].allowed_sender_addresses, approvedSenders) &&
      mail[0].allowed_destination_addresses === undefined &&
      mail[0].destination_address === undefined,
    "overlay must have one EMAIL send_email binding that is sender-only (no destination lock)",
  );
  check(
    approvedSenders.includes(overlay.vars?.NOTIFY_FROM_EMAIL),
    "overlay NOTIFY_FROM_EMAIL must be the approved sender",
  );
}
for (const [name, value] of Object.entries(constants.vars)) {
  check(overlay.vars?.[name] === value, `overlay var ${name} must match constants`);
}
check(
  JSON.stringify(Object.keys(overlay.vars ?? {}).sort()) ===
    JSON.stringify(Object.keys(constants.vars).sort()),
  "overlay vars must be exactly the production constants set",
);
check(!overlayText.includes(constants.staging_d1), "overlay must not mention staging D1");
check(!overlayText.includes(constants.obsolete_d1), "overlay must not mention obsolete D1");
check(!overlayText.includes(constants.trial_d1), "overlay must not mention trial D1");
check(!overlayText.includes(constants.staging_r2), "overlay must not mention staging R2");
check(!overlayText.includes("--keep-vars"), "overlay comments must not instruct --keep-vars");
check(
  !("no_bundle" in overlay),
  "source overlay must bundle from Astro dist, not frozen zip entry.js",
);

check(
  gitWrangler.name === "kaiyue-root-config-disabled" &&
    gitWrangler.account_id === "00000000000000000000000000000000",
  "git wrangler.jsonc must stay the fail-closed root config (disabled name, placeholder account)",
);
check(
  !gitWrangler.d1_databases &&
    !gitWrangler.r2_buckets &&
    !gitWrangler.vars &&
    !gitWrangler.previews,
  "git wrangler.jsonc must not bind D1/R2, set vars, or define previews",
);

check(
  wranglerPkg.version === constants.wrangler_version,
  `wrangler must be pinned ${constants.wrangler_version}`,
);
check(
  packageJson.devDependencies.wrangler === constants.wrangler_version,
  `package.json wrangler must be exactly ${constants.wrangler_version}`,
);
check(packageJson.packageManager === "pnpm@10.15.0", "packageManager must remain pnpm@10.15.0");

check(
  workflow.includes(`branches: [${constants.release_branch}]`),
  "workflow must trigger on main",
);
check(workflow.includes("workflow_dispatch:"), "workflow must allow manual dispatch");
check(
  workflow.includes(`github.ref != 'refs/heads/${constants.release_branch}'`),
  "non-release refs must fail closed",
);
check(
  workflow.includes(`github.ref == 'refs/heads/${constants.release_branch}'`),
  "jobs must no-op off main",
);
check(constants.github_environment === "production", "GitHub environment name must be production");
check(
  constants.github_environment_required_reviewers === false,
  "production GitHub environment has no required reviewers so merge to main can auto-deploy",
);
check(
  workflow.includes(`environment: ${constants.github_environment}`),
  "migrate/upload/activate must use GitHub environment production",
);
check(!/reviewers:/.test(workflow), "production CD must not encode per-run environment approval");
check(workflow.includes("contents: read"), "workflow permissions must be contents: read");
check(
  workflow.includes("cancel-in-progress: false"),
  "production concurrency must not cancel an in-flight activation",
);
check(
  !workflow.includes("branches: [official-staging]"),
  "production workflow must not trigger on official-staging",
);
check(!workflow.includes("branches: [staging]"), "production workflow must not trigger on staging");
check(
  !workflow.includes("example.invalid"),
  "production workflow must not build with example.invalid",
);
check(
  !workflow.includes("https://staging.kaiyuemacau.com"),
  "production workflow must not build or target the staging URL",
);

{
  const uploadArgv = versionsUploadArgv(constants);
  const viewArgv = versionsViewArgv(constants, "72e580d0-aeb1-4766-935a-0cb9a27631a4");
  const deployArgv = versionsDeployArgv(constants, "72e580d0-aeb1-4766-935a-0cb9a27631a4");
  const statusArgv = deploymentsStatusArgv(constants);
  const listArgv = migrationsListArgv(constants);
  const applyArgv = migrationsApplyArgv(constants);
  const activate = readFileSync(join(REPO_ROOT, "scripts/production-activate.mjs"), "utf8");
  check(
    uploadArgv[0] === "versions" && uploadArgv[1] === "upload",
    "upload argv must be versions upload",
  );
  check(uploadArgv.includes("--strict"), "upload argv must pass --strict");
  check(uploadArgv.includes(OVERLAY_PATH), "upload argv must use deploy/production/wrangler.jsonc");
  check(uploadArgv.includes(constants.worker_name), "upload argv must target kaiyue-travel");
  check(
    readFileSync(join(REPO_ROOT, "scripts/production-upload.mjs"), "utf8").includes(
      "worker_version_id=",
    ),
    "upload script must emit worker_version_id",
  );
  for (const name of [
    "production-upload.mjs",
    "production-candidate-check.mjs",
    "production-activate.mjs",
    "production-migrate.mjs",
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
  check(viewArgv.includes(OVERLAY_PATH), "candidate argv must use the production overlay");
  check(
    deployArgv[0] === "versions" && deployArgv[1] === "deploy",
    "activate argv must be versions deploy",
  );
  check(deployArgv.includes(OVERLAY_PATH), "activate argv must use the production overlay");
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
  check(
    listArgv[0] === "d1" && listArgv[1] === "migrations" && listArgv[2] === "list",
    "migrate list argv",
  );
  check(
    applyArgv[0] === "d1" && applyArgv[1] === "migrations" && applyArgv[2] === "apply",
    "migrate apply argv",
  );
  check(
    listArgv.includes("--remote") && applyArgv.includes("--remote"),
    "D1 migration argv must pass --remote",
  );
  check(
    listArgv.includes(OVERLAY_PATH) && applyArgv.includes(OVERLAY_PATH),
    "D1 migration argv must use the production overlay",
  );
  check(
    listArgv.includes(constants.d1_name) && applyArgv.includes(constants.d1_name),
    "D1 migration argv must use production D1 name",
  );
  check(
    !listArgv.includes("--local") && !applyArgv.includes("--local"),
    "D1 migration argv must not use --local",
  );
  check(
    !listArgv.includes("--preview") && !applyArgv.includes("--preview"),
    "D1 migration argv must not use --preview",
  );
}

{
  const pnpmSetups = [
    ...workflow.matchAll(
      /uses: pnpm\/action-setup@[^\n]+\n(?:        with:\n(?:          .+\n)+)?/g,
    ),
  ];
  check(pnpmSetups.length === 5, "production workflow must set up pnpm five times");
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
      "production build must set PUBLIC_SITE_URL; runtime vars cannot repair built artifacts",
    );
    check(!step.includes("CLOUDFLARE_API_TOKEN"), "production build must remain token-free");
    check(
      !step.includes("staging.kaiyuemacau.com"),
      "production build must not use the staging URL",
    );
    check(!step.includes("example.invalid"), "production build must not use example.invalid");
  }
}

check(
  workflow.includes("production-candidate-check.mjs"),
  "workflow must validate the uploaded version with structured candidate check",
);
check(
  workflow.includes("production-migrate.mjs"),
  "workflow must apply pending additive production D1 migrations before activation",
);
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
    const needsToken = /production-(migrate|upload|candidate-check|activate)\.mjs/.test(step);
    const mustNotToken =
      /pnpm (install|build|lint|typecheck|test)/.test(step) ||
      /production-(guard|smoke)\.mjs/.test(step);
    if (needsToken) {
      check(step.includes("CLOUDFLARE_API_TOKEN"), "credentialed step must receive the token");
    }
    if (mustNotToken) {
      check(
        !step.includes("CLOUDFLARE_API_TOKEN"),
        "setup/install/build/guard/smoke must not receive the token",
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
check(!workflow.includes("d1 execute"), "workflow must not query D1 with d1 execute");
check(!/provision-/.test(workflow), "workflow must not bootstrap operators");
check(
  !workflow.includes("cloudflare/wrangler-action"),
  "workflow must use lockfile wrangler, not wrangler-action",
);
check(!ciWorkflow.includes("wrangler"), "ci.yml must remain check-only");
check(!ciWorkflow.includes("CLOUDFLARE_API_TOKEN"), "ci.yml must not take Cloudflare credentials");
check(
  !stagingWorkflow.includes("branches: [main]"),
  "official-staging workflow must not trigger on main",
);
check(
  !stagingWorkflow.includes("deploy/production/wrangler.jsonc"),
  "official-staging workflow must not use the production overlay",
);

for (const name of constants.github_secret_names) {
  check(workflow.includes(`secrets.${name}`), `workflow must read GitHub secret ${name}`);
}
for (const name of constants.forbidden_github_secret_names) {
  check(!workflow.includes(`secrets.${name}`), `workflow must not read GitHub secret ${name}`);
}

const workflowNames = readdirSync(join(REPO_ROOT, ".github/workflows")).filter((name) =>
  name.endsWith(".yml"),
);
for (const name of workflowNames) {
  const text = readFileSync(join(REPO_ROOT, ".github/workflows", name), "utf8");
  if (name === "ci.yml" || name === "production.yml") {
    continue;
  }
  check(
    !/branches:\s*\[main\]/.test(text) ||
      !/wrangler|production-(upload|activate|migrate)/.test(text),
    `${name} must not combine main push with production deploy`,
  );
}

if (errors.length > 0) {
  fail(`production guard failed:\n- ${errors.join("\n- ")}`);
}

console.log("production guard passed");
