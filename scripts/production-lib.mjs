import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MIGRATIONS_DIR,
  REPO_ROOT,
  fail,
  parseJsonc,
  prepareWranglerSpawn,
  spawnWrangler,
  wranglerBin,
  wranglerCredentialError,
} from "./official-staging-lib.mjs";

export {
  MIGRATIONS_DIR,
  REPO_ROOT,
  fail,
  parseJsonc,
  prepareWranglerSpawn,
  spawnWrangler,
  wranglerBin,
  wranglerCredentialError,
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const OVERLAY_PATH = join(root, "deploy/production/wrangler.jsonc");
export const CONSTANTS_PATH = join(root, "deploy/production/constants.json");
export const WORKFLOW_PATH = join(root, ".github/workflows/production.yml");
export const STAGING_WORKFLOW_PATH = join(root, ".github/workflows/official-staging.yml");
export const CI_WORKFLOW_PATH = join(root, ".github/workflows/ci.yml");
export const GIT_WRANGLER_PATH = join(root, "wrangler.jsonc");

export function loadConstants() {
  return JSON.parse(readFileSync(CONSTANTS_PATH, "utf8"));
}

export function loadOverlay() {
  return parseJsonc(readFileSync(OVERLAY_PATH, "utf8"));
}
