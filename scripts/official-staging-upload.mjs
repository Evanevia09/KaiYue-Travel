import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import {
  OVERLAY_PATH,
  REPO_ROOT,
  fail,
  loadConstants,
  wranglerBin,
} from "./official-staging-lib.mjs";

const constants = loadConstants();
const result = spawnSync(
  process.execPath,
  [
    wranglerBin(),
    "versions",
    "upload",
    "--strict",
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
  ],
  { encoding: "utf8", cwd: REPO_ROOT, env: process.env },
);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) {
  fail("official-staging versions upload failed; traffic was not changed");
}

const match = result.stdout.match(/Worker Version ID:\s*([0-9a-f-]{36})/i);
if (!match) {
  fail("upload succeeded but Worker Version ID was not parsed; refusing to activate");
}

const versionId = match[1];
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `worker_version_id=${versionId}\nversion_id=${versionId}\n`,
  );
}
console.log(`uploaded inactive version ${versionId} (not yet on traffic)`);
