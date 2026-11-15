import { spawnSync } from "node:child_process";
import {
  OVERLAY_PATH,
  REPO_ROOT,
  fail,
  loadConstants,
  wranglerBin,
} from "./official-staging-lib.mjs";

const constants = loadConstants();
const versionId = process.env.WORKER_VERSION_ID;
if (!versionId || !/^[0-9a-f-]{36}$/i.test(versionId)) {
  fail("binding/target check fail-closed: WORKER_VERSION_ID missing or not a UUID");
}

const result = spawnSync(
  process.execPath,
  [
    wranglerBin(),
    "versions",
    "view",
    versionId,
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "--json",
  ],
  { encoding: "utf8", cwd: REPO_ROOT, env: process.env },
);
const combined = `${result.stdout}\n${result.stderr}`;
if (result.status !== 0) {
  fail(`binding/target check fail-closed: ${result.stderr.trim() || result.stdout.trim()}`);
}
if (!combined.includes(constants.d1_id)) {
  fail(`binding/target check fail-closed: uploaded version missing D1 ${constants.d1_id}`);
}
if (!combined.includes(constants.r2_bucket)) {
  fail(`binding/target check fail-closed: uploaded version missing R2 ${constants.r2_bucket}`);
}
if (combined.includes(constants.production_d1) || combined.includes(constants.obsolete_d1)) {
  fail("binding/target check fail-closed: production or obsolete D1 appeared on uploaded version");
}
if (combined.includes(constants.trial_d1) || combined.includes(constants.trial_worker)) {
  fail("binding/target check fail-closed: trial resources appeared on uploaded version");
}
if (combined.includes(`"name": "${constants.production_worker}"`)) {
  fail("binding/target check fail-closed: production Worker name appeared");
}
console.log(
  `official-staging uploaded version ${versionId} bindings target ${constants.worker_name}`,
);
