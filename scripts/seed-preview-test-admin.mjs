/**
 * One-off operator seeder. Writes SQL to stdout. Never prints the password.
 *
 * hashPassword (scrypt) does not use BETTER_AUTH_SECRET. Do not export a
 * dummy signing secret to run this script. BETTER_AUTH_SECRET remains a
 * Worker secret for session cookies and is already on staging.
 *
 * Vault-generated passwords cannot be shell-exported. Prefer
 * `node scripts/provision-admin-local.mjs` (127.0.0.1 form + vault fill).
 * ADMIN_SEED_PASSWORD is accepted only when the operator already holds it
 * in a process environment they control; it is not a vault export path.
 *
 * Required env:
 *   ADMIN_SEED_EMAIL
 *   ADMIN_SEED_PASSWORD (>=16, or >=6 with ADMIN_SEED_STAGING_TEST=1)
 * Optional: ADMIN_SEED_STAGING_TEST=1 for isolated staging UAT hasher mode only.
 *
 * Optional env:
 *   ADMIN_SEED_NAME
 *   ADMIN_SEED_USER_ID
 *   ADMIN_SEED_ACCOUNT_ID
 *
 * PM applies the SQL to the intended D1 only after review. This script does
 * not connect to Cloudflare, D1, or print credentials.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { seedPasswordMin, sqlFromSeedEnv } from "./lib/provision-admin-from-env.mjs";

const betterAuthCrypto = pathToFileURL(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../apps/web/node_modules/better-auth/dist/crypto/index.mjs",
  ),
).href;
const { hashPassword } = await import(betterAuthCrypto);

const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;
const minPassword = seedPasswordMin();

if (!email) {
  console.error("Set ADMIN_SEED_EMAIL.");
  process.exit(1);
}

if (!password || password.length < minPassword) {
  console.error(
    `Vault passwords cannot be shell-exported. On a trusted loopback machine run:\n  node scripts/provision-admin-local.mjs\nand fill the form from the vault browser extension.\nIf you already hold a password in this process, set ADMIN_SEED_PASSWORD (>=${minPassword}).\nStaging UAT six-character mode requires ADMIN_SEED_STAGING_TEST=1.\nhashPassword does not use BETTER_AUTH_SECRET; do not invent a dummy signing secret.`,
  );
  process.exit(1);
}

process.stdout.write(await sqlFromSeedEnv({ hashPassword }));
