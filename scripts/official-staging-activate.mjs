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
  fail("activation fail-closed: WORKER_VERSION_ID missing or not a UUID");
}

const result = spawnSync(
  process.execPath,
  [
    wranglerBin(),
    "versions",
    "deploy",
    `${versionId}@100%`,
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "-y",
  ],
  { encoding: "utf8", cwd: REPO_ROOT, env: process.env },
);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) {
  fail("official-staging versions deploy failed; previous traffic version remains");
}
console.log(`activated ${versionId}@100% on ${constants.worker_name}`);
