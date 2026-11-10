/**
 * One-off operator seeder. Reads secrets from the environment only.
 * Never prints the password or Better Auth secret. Writes SQL to stdout.
 *
 * Required env:
 *   ADMIN_SEED_EMAIL
 *   ADMIN_SEED_PASSWORD (>=16)
 *   BETTER_AUTH_SECRET (>=32)
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

const betterAuthCrypto = pathToFileURL(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../apps/web/node_modules/better-auth/dist/crypto/index.mjs",
  ),
).href;
const { hashPassword } = await import(betterAuthCrypto);

const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;
const secret = process.env.BETTER_AUTH_SECRET;
const name = process.env.ADMIN_SEED_NAME?.trim() || "Temporary staff operator";
const userId = process.env.ADMIN_SEED_USER_ID?.trim() || crypto.randomUUID();
const accountRowId = process.env.ADMIN_SEED_ACCOUNT_ID?.trim() || crypto.randomUUID();

if (!email || !password || !secret || secret.length < 32 || password.length < 16) {
  console.error("Set ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD (>=16) and BETTER_AUTH_SECRET (>=32).");
  process.exit(1);
}

const now = new Date().toISOString();
const hash = await hashPassword(password);

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

process.stdout.write(`-- Temporary allowlisted operator. Remove after Cloudflare Access is live.
INSERT OR REPLACE INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
VALUES (${sqlString(userId)}, ${sqlString(name)}, ${sqlString(email)}, 1, NULL, ${sqlString(now)}, ${sqlString(now)});

INSERT OR REPLACE INTO "account" (
  "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
) VALUES (
  ${sqlString(accountRowId)}, ${sqlString(userId)}, 'credential', ${sqlString(userId)},
  NULL, NULL, NULL, NULL, NULL, NULL, ${sqlString(hash)},
  ${sqlString(now)}, ${sqlString(now)}
);
`);
