/**
 * Secret-safe primary-operator CREATE helper. Parent runs this after review.
 * This writer does not apply D1, set Vault secrets, or print passwords/hashes.
 *
 * Supported fill path (no remote public signup, no Worker admin-create endpoint):
 *   1. Parent generates a temporary password in Vault (length >= 12).
 *   2. Parent sets PRIMARY_ADMIN_EMAIL / PRIMARY_ADMIN_PASSWORD / BETTER_AUTH_SECRET
 *      in the local shell only (not git, not overlay, not chat).
 *   3. `node scripts/provision-primary-admin.mjs --write-sql --out <0600 file>`
 *      hashes with Better Auth and writes INSERT SQL. Stdout never includes the
 *      password or hash.
 *   4. Parent applies additive `migrations/0009_admin_primary_role.sql` first if
 *      the live user table still has no role column (confirmed 14:18 on 06cf879d).
 *   5. Parent applies the SQL file with `wrangler d1 execute` against production
 *      D1 06cf879d. This script does not call wrangler.
 *   6. Parent sets Worker Vault vars ADMIN_EMAILS + ADMIN_PRIMARY_EMAIL to the
 *      verified Daniel address, BETTER_AUTH_SECRET, and omits UAT 6-char / Nov 24
 *      expiry. Operator signs in on admin.kaiyuemacau.com and changes password.
 *
 * Not supported: `/setup-admin` (development only), `/api/auth/sign-up/email`
 * on production, browser loopback against live D1, `seed-preview-test-admin.mjs`
 * (obsolete preview D1 069aa442, INSERT OR REPLACE, 16-char preview policy).
 *
 * 14:18 production read (parent, no writes): user count for Daniel = 0 and
 * credential account count = 0. This is CREATE, not a password reset.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const PRODUCTION_D1_ID = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const PRODUCTION_D1_NAME = "kaiyue-travel-production";
const VERIFIED_PRODUCTION_PRIMARY_EMAIL = "daniel@kaiyuemacau.com";
const MIN_PASSWORD_LENGTH = 12;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? (process.argv[index + 1] ?? "").trim() : "";
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function resolveBetterAuthCrypto() {
  const candidates = [
    join(root, "apps/web/node_modules/better-auth/dist/crypto/index.mjs"),
    join(root, "node_modules/better-auth/dist/crypto/index.mjs"),
  ];
  for (const file of candidates) {
    try {
      return pathToFileURL(file).href;
    } catch {
      continue;
    }
  }
  return pathToFileURL(candidates[0]).href;
}

function printPlan() {
  const lines = [
    "Primary operator provisioning plan (no secrets, no D1 apply).",
    `Target D1: ${PRODUCTION_D1_NAME} ${PRODUCTION_D1_ID}.`,
    "Parent 14:18 read: exact and case-insensitive Daniel user count 0; credential account count 0.",
    "Decision: CREATE a Better Auth user + credential account. Do not reset a password; no row exists.",
    "user.email is UNIQUE. Do not insert a case variant of the verified address.",
    "14:18 user columns: id, name, email, emailVerified, image, createdAt, updatedAt. No role column.",
    "Apply additive migrations/0009_admin_primary_role.sql before stamping role=primary.",
    "Create SQL omits role so it fits the 14:18 schema; stamp SQL updates only the verified email.",
    "Password policy: Better Auth minPasswordLength 12. Do not inherit ADMIN_STAGING_TEST_PASSWORD_MIN=6 or TEMP_ADMIN_EXPIRES_AT 2026-11-24.",
    "Do not enable Cloudflare Access as a login requirement. Both ACCESS_TEAM_DOMAIN and ACCESS_AUD stay absent unless later fully configured.",
    "Vault vars after review (not this script): BETTER_AUTH_SECRET (>=32), ADMIN_EMAILS, ADMIN_PRIMARY_EMAIL.",
    "Rejected paths: public /api/auth/sign-up/email, /setup-admin, seed-preview-test-admin.mjs, any new public admin-create endpoint.",
    "This script never prints passwords or hashes and never calls wrangler / D1.",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

if (hasFlag("--plan") || process.argv.length <= 2) {
  printPlan();
  process.exit(0);
}

if (!hasFlag("--write-sql")) {
  fail("Use --plan, or --write-sql --out <path>. This script does not apply D1.");
}

const outPath = argValue("--out");
if (!outPath) {
  fail("--write-sql requires --out <path>. SQL is never printed to stdout.");
}
if (outPath === "-" || outPath === "/dev/stdout" || outPath === "/dev/stderr") {
  fail("Refusing to write credential SQL to stdout or stderr.");
}

const envName = argValue("--env") || "production";
const email = (process.env.PRIMARY_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.PRIMARY_ADMIN_PASSWORD ?? "";
const secret = process.env.BETTER_AUTH_SECRET ?? "";

if (envName !== "production") {
  fail("This CREATE helper only prepares production D1 06cf879d. Staging uses a separate overlay.");
}
if (!email) {
  fail("Set PRIMARY_ADMIN_EMAIL in the environment. Do not pass it on the command line.");
}
if (email !== VERIFIED_PRODUCTION_PRIMARY_EMAIL) {
  fail("PRIMARY_ADMIN_EMAIL must be the verified production primary operator.");
}

const includeRole = hasFlag("--with-role");
const stampRole = hasFlag("--stamp-role");
if (includeRole && stampRole) {
  fail("Use either --with-role (INSERT after 0009) or --stamp-role (UPDATE after 0009), not both.");
}

let hash = "";
const now = new Date().toISOString();
const userId = randomUUID();
const accountId = randomUUID();
if (!stampRole) {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    fail(`PRIMARY_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (!secret || secret.length < 32) {
    fail("BETTER_AUTH_SECRET must be at least 32 characters.");
  }
  if (password === secret) {
    fail("Password and BETTER_AUTH_SECRET must be different.");
  }
  const { hashPassword } = await import(resolveBetterAuthCrypto());
  hash = await hashPassword(password);
}

let sql = "";
if (stampRole) {
  sql = `-- Stamp role=primary after migrations/0009_admin_primary_role.sql.
-- Bounded to the verified production primary email. No untargeted upgrade.
UPDATE "user" SET "role" = 'primary'
WHERE lower("email") = lower(${sqlString(email)});
`;
} else {
  const userColumns = includeRole
    ? `"id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "role"`
    : `"id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt"`;
  const userValues = includeRole
    ? `${sqlString(userId)}, ${sqlString("Daniel")}, ${sqlString(email)}, 1, NULL, ${sqlString(now)}, ${sqlString(now)}, 'primary'`
    : `${sqlString(userId)}, ${sqlString("Daniel")}, ${sqlString(email)}, 1, NULL, ${sqlString(now)}, ${sqlString(now)}`;
  sql = `-- Primary operator CREATE for ${PRODUCTION_D1_NAME} (${PRODUCTION_D1_ID}).
-- Parent-only apply after review. Do not log this file.
-- Decision: CREATE (14:18 user count 0 / credential count 0). Not a password reset.
INSERT INTO "user" (${userColumns})
SELECT ${userValues}
WHERE NOT EXISTS (
  SELECT 1 FROM "user" WHERE lower("email") = lower(${sqlString(email)})
);
INSERT INTO "account" (
  "id", "accountId", "providerId", "userId", "accessToken", "refreshToken", "idToken",
  "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "password", "createdAt", "updatedAt"
)
SELECT
  ${sqlString(accountId)}, ${sqlString(userId)}, 'credential', ${sqlString(userId)},
  NULL, NULL, NULL, NULL, NULL, NULL, ${sqlString(hash)},
  ${sqlString(now)}, ${sqlString(now)}
WHERE EXISTS (
  SELECT 1 FROM "user" WHERE "id" = ${sqlString(userId)}
)
AND NOT EXISTS (
  SELECT 1 FROM "account" WHERE "userId" = ${sqlString(userId)} AND "providerId" = 'credential'
);
`;
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, sql, { encoding: "utf8", mode: 0o600 });
process.stdout.write(
  [
    stampRole
      ? "Wrote bounded role-stamp SQL for the verified primary operator."
      : "Wrote CREATE SQL for the verified primary operator.",
    `Target D1 ${PRODUCTION_D1_NAME} ${PRODUCTION_D1_ID}.`,
    `Output path recorded; password and hash omitted.`,
    stampRole
      ? "SQL stamps role=primary on the verified email only (requires 0009)."
      : includeRole
        ? "SQL INSERTs role=primary (requires 0009)."
        : "SQL fits 14:18 user columns (no role). Apply 0009 then --stamp-role.",
    "This script did not apply D1, print secrets, or call wrangler.",
    "",
  ].join("\n"),
);
