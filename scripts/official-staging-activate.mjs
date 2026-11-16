import { pathToFileURL } from "node:url";
import { OVERLAY_PATH, fail, loadConstants, spawnWrangler } from "./official-staging-lib.mjs";
import { parseWranglerJson } from "./official-staging-candidate-check.mjs";

export function evaluateActivationReadback(deployment, expectedVersionId) {
  const errors = [];
  if (!deployment || typeof deployment !== "object" || Array.isArray(deployment)) {
    return ["activation readback is missing or not an object"];
  }
  const deploymentId = deployment.id ?? deployment.deployment_id;
  if (typeof deploymentId !== "string" || deploymentId.length === 0) {
    errors.push("activation readback missing deployment id");
  }
  const versions = deployment.versions;
  if (!Array.isArray(versions) || versions.length === 0) {
    errors.push("activation readback versions must be a non-empty array");
    return errors;
  }
  if (versions.length !== 1) {
    errors.push(
      `activation readback has ${versions.length} versions; expected a single 100% version`,
    );
  }
  const traffic = versions[0];
  const versionId = traffic?.version_id ?? traffic?.id;
  const percentage = traffic?.percentage;
  if (versionId !== expectedVersionId) {
    errors.push(
      `activation readback version ${JSON.stringify(versionId)} != uploaded ${expectedVersionId}`,
    );
  }
  if (percentage !== 100) {
    errors.push(`activation readback percentage ${JSON.stringify(percentage)} != 100`);
  }
  return errors;
}

export function versionsDeployArgv(constants, versionId) {
  return [
    "versions",
    "deploy",
    `${versionId}@100%`,
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "-y",
  ];
}

export function deploymentsStatusArgv(constants) {
  return [
    "deployments",
    "status",
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "--json",
  ];
}

function wranglerJson(args, expectedAccountId) {
  return spawnWrangler(args, process.env, expectedAccountId);
}

function readLatestDeployment(constants) {
  const result = wranglerJson(deploymentsStatusArgv(constants), constants.account_id);
  if (result.status !== 0) {
    return {
      ok: false,
      error: result.stderr.trim() || result.stdout.trim() || "deployments status failed",
    };
  }
  try {
    return { ok: true, deployment: parseWranglerJson(result.stdout, result.stderr) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function summarizeReadback(readback) {
  if (!readback.ok) {
    return `readback failed: ${readback.error}`;
  }
  const versions = readback.deployment?.versions ?? [];
  const traffic = versions
    .map((row) => `${row.version_id ?? row.id}@${row.percentage}%`)
    .join(", ");
  return `deployment ${readback.deployment?.id ?? readback.deployment?.deployment_id ?? "(id missing)"} versions [${traffic || "none"}]`;
}

function main() {
  const constants = loadConstants();
  const versionId = process.env.WORKER_VERSION_ID;
  if (!versionId || !/^[0-9a-f-]{36}$/i.test(versionId)) {
    fail("activation fail-closed: WORKER_VERSION_ID missing or not a UUID");
  }

  const deploy = wranglerJson(versionsDeployArgv(constants, versionId), constants.account_id);
  process.stdout.write(deploy.stdout);
  process.stderr.write(deploy.stderr);

  const readback = readLatestDeployment(constants);
  if (deploy.status !== 0) {
    fail(
      `versions deploy command failed (exit ${deploy.status}). The command may have committed remotely. Remote traffic is unknown; fail-stop after readback. ${summarizeReadback(readback)}. Do not retry blindly.`,
    );
  }
  if (!readback.ok) {
    fail(
      `versions deploy command succeeded but activation readback failed. Remote traffic is unknown; fail-stop. ${readback.error}. Do not retry blindly.`,
    );
  }
  const errors = evaluateActivationReadback(readback.deployment, versionId);
  if (errors.length > 0) {
    fail(
      `activation readback did not confirm ${versionId}@100%:\n- ${errors.join("\n- ")}\n${summarizeReadback(readback)}. Fail-stop. Do not retry blindly.`,
    );
  }
  console.log(
    `activation readback: worker ${constants.worker_name} deployment ${readback.deployment.id ?? readback.deployment.deployment_id} version ${versionId} @100%`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
