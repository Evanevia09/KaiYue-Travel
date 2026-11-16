import { spawnSync } from "node:child_process";
import {
  OVERLAY_PATH,
  REPO_ROOT,
  fail,
  loadConstants,
  wranglerBin,
} from "./official-staging-lib.mjs";

const constants = loadConstants();
const version = spawnSync(process.execPath, [wranglerBin(), "--version"], {
  encoding: "utf8",
  cwd: REPO_ROOT,
});
if (version.status !== 0) {
  fail(version.stderr || "wrangler --version failed");
}
const reported = version.stdout.trim();
if (!reported.includes(constants.wrangler_version)) {
  fail(`expected wrangler ${constants.wrangler_version}, got ${reported}`);
}

const dryRun = spawnSync(
  process.execPath,
  [
    wranglerBin(),
    "versions",
    "upload",
    "--dry-run",
    "--strict",
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
  ],
  { encoding: "utf8", cwd: REPO_ROOT },
);
process.stdout.write(dryRun.stdout);
process.stderr.write(dryRun.stderr);
if (dryRun.status !== 0) {
  fail("official-staging overlay dry-run failed");
}
if (
  dryRun.stdout.includes(constants.production_worker) &&
  !dryRun.stdout.includes(constants.worker_name)
) {
  fail("dry-run targeted production Worker");
}
console.log("official-staging overlay dry-run passed");
