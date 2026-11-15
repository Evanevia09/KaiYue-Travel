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
    "secret",
    "list",
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "--format",
    "json",
  ],
  { encoding: "utf8", cwd: REPO_ROOT, env: process.env },
);
if (result.status !== 0) {
  fail(`secret name check fail-closed: ${result.stderr.trim()}`);
}
if (/"value"\s*:\s*"/.test(result.stdout)) {
  fail("secret list appeared to include values; refusing to continue");
}
let names = [];
try {
  const parsed = JSON.parse(result.stdout);
  names = (Array.isArray(parsed) ? parsed : []).map((row) =>
    typeof row === "string" ? row : (row.name ?? row.secret_name ?? ""),
  );
} catch {
  fail("secret name check fail-closed: secret list JSON parse failed");
}
for (const name of constants.required_worker_secret_names) {
  if (!names.includes(name)) {
    fail(
      `secret preservation fail-closed: Worker is missing ${name} (names only; values never read)`,
    );
  }
}
console.log(
  `official-staging secret names present: ${constants.required_worker_secret_names.join(", ")}`,
);
