import { spawnSync } from "node:child_process";
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

function hasNonLatin1OrControl(value) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint === 0 ||
      codePoint === 10 ||
      codePoint === 13 ||
      codePoint > 255
    ) {
      return true;
    }
  }
  return false;
}

export function classifyCloudflareApiToken(value) {
  if (value === undefined || value === null || value === "") {
    return "missing";
  }
  if (typeof value !== "string") {
    return "malformed";
  }
  if (/^[\s\u00a0]*$/.test(value)) {
    return "missing";
  }
  if (
    /^Bearer\s/i.test(value) ||
    /^Authorization\s*:/i.test(value) ||
    value.includes("```") ||
    value.startsWith('"') ||
    value.startsWith("'") ||
    value.startsWith("`")
  ) {
    return "copied_snippet";
  }
  if (hasNonLatin1OrControl(value) || /^[ \t]|[ \t]$/.test(value)) {
    return "malformed";
  }
  return "ok";
}

export function classifyCloudflareAccountId(value, expectedAccountId) {
  if (value === undefined || value === null || value === "") {
    return "missing";
  }
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return "malformed";
  }
  if (expectedAccountId && value !== expectedAccountId) {
    return "mismatch";
  }
  return "ok";
}

export function wranglerCredentialError(env, expectedAccountId) {
  const tokenKind = classifyCloudflareApiToken(env?.CLOUDFLARE_API_TOKEN);
  if (tokenKind === "missing") {
    return "CLOUDFLARE_API_TOKEN is missing; refusing to call Wrangler";
  }
  if (tokenKind === "copied_snippet") {
    return "CLOUDFLARE_API_TOKEN looks like a copied header or quoted snippet; refusing to call Wrangler";
  }
  if (tokenKind !== "ok") {
    return "CLOUDFLARE_API_TOKEN is not a usable HTTP credential; refusing to call Wrangler";
  }
  const accountKind = classifyCloudflareAccountId(env?.CLOUDFLARE_ACCOUNT_ID, expectedAccountId);
  if (accountKind === "missing") {
    return "CLOUDFLARE_ACCOUNT_ID is missing; refusing to call Wrangler";
  }
  if (accountKind === "mismatch") {
    return "CLOUDFLARE_ACCOUNT_ID does not match the official-staging overlay; refusing to call Wrangler";
  }
  if (accountKind !== "ok") {
    return "CLOUDFLARE_ACCOUNT_ID is not a usable Cloudflare account id; refusing to call Wrangler";
  }
  return null;
}

export function prepareWranglerSpawn(args, env, expectedAccountId) {
  const error = wranglerCredentialError(env, expectedAccountId);
  if (error) {
    return { ok: false, error, command: null, args: null };
  }
  return {
    ok: true,
    error: null,
    command: process.execPath,
    args: [wranglerBin(), ...args],
  };
}

export function spawnWrangler(args, env = process.env, expectedAccountId) {
  const prepared = prepareWranglerSpawn(args, env, expectedAccountId);
  if (!prepared.ok) {
    fail(prepared.error);
  }
  return spawnSync(prepared.command, prepared.args, {
    encoding: "utf8",
    cwd: REPO_ROOT,
    env,
  });
}
