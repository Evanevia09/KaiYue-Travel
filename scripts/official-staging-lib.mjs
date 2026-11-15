import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const REPO_ROOT = root;
export const OVERLAY_PATH = join(root, "deploy/official-staging/wrangler.jsonc");
export const CONSTANTS_PATH = join(root, "deploy/official-staging/constants.json");
export const GIT_WRANGLER_PATH = join(root, "wrangler.jsonc");
export const WORKFLOW_PATH = join(root, ".github/workflows/official-staging.yml");
export const PRODUCTION_WORKFLOW_PATH = join(root, ".github/workflows/production.yml");
export const CI_WORKFLOW_PATH = join(root, ".github/workflows/ci.yml");
export const SCHEMA_CONTRACT_PATH = join(root, "deploy/official-staging/schema-contract.json");
export const MIGRATIONS_DIR = join(root, "migrations");

export function parseJsonc(text) {
  return JSON.parse(text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
}

export function loadConstants() {
  return JSON.parse(readFileSync(CONSTANTS_PATH, "utf8"));
}

export function loadOverlay() {
  return parseJsonc(readFileSync(OVERLAY_PATH, "utf8"));
}

export function loadGitWrangler() {
  return parseJsonc(readFileSync(GIT_WRANGLER_PATH, "utf8"));
}

export function loadSchemaContract() {
  return JSON.parse(readFileSync(SCHEMA_CONTRACT_PATH, "utf8"));
}

export function fail(message) {
  console.error(message);
  process.exit(1);
}

export function wranglerBin() {
  return join(REPO_ROOT, "node_modules/wrangler/bin/wrangler.js");
}
