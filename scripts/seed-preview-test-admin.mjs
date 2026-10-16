/**
 * One-off preview test-admin seeder. Reads secrets from the environment only.
 * Never prints the password. Marks the user as a disposable test account.
 *
 * Required env:
 *   PREVIEW_ADMIN_EMAIL
 *   PREVIEW_ADMIN_PASSWORD
 *   BETTER_AUTH_SECRET
 *
 * Writes SQL to stdout for D1 069aa442-30c9-4454-ab3a-26eb372b3a1f only.
 */
import { hashPassword } from "better-auth/crypto";

const email = process.env.PREVIEW_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.PREVIEW_ADMIN_PASSWORD;
const secret = process.env.BETTER_AUTH_SECRET;

if (!email || !password || !secret || secret.length < 32 || password.length < 16) {
  console.error(
    "Set PREVIEW_ADMIN_EMAIL, PREVIEW_ADMIN_PASSWORD (>=16) and BETTER_AUTH_SECRET (>=32).",
  );
  process.exit(1);
}

const now = new Date();
const userId = "test-admin-preview-remove-later";
const accountId = "test-admin-preview-account";
const hash = await hashPassword(password);
const name = "TEST admin — remove after Access is configured";

function sqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

process.stdout.write(`-- TEST account for preview only. Remove after Cloudflare Access is live.
INSERT OR REPLACE INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
VALUES (${sqlString(userId)}, ${sqlString(name)}, ${sqlString(email)}, 1, NULL, ${sqlString(now.toISOString())}, ${sqlString(now.toISOString())});

INSERT OR REPLACE INTO "account" (
  "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
) VALUES (
  ${sqlString(accountId)}, ${sqlString(email)}, 'credential', ${sqlString(userId)},
  NULL, NULL, NULL, NULL, NULL, NULL, ${sqlString(hash)},
  ${sqlString(now.toISOString())}, ${sqlString(now.toISOString())}
);
`);
