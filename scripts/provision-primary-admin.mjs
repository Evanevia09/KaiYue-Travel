/**
 * Secret-safe Better Auth user+credential CREATE helper.
 * This writer does not apply D1, read secrets from Vault, or print passwords/hashes.
 *
 * Password input: a later native user-secret request may place a user-provided
 * password in PRIMARY_ADMIN_PASSWORD for this local process only. Cloudflare
 * Vault cannot export a generated login password into this CLI and cannot write
 * Worker bindings from here. Parent applies Cloudflare secrets after the package
 * route is validated. No public provisioner, no credential collector, no
 * browser loopback.
 *
 * 14:18 production read is a snapshot, not perpetual. Re-read with --preflight
 * immediately before apply.
 *
 * D1 limitation (https://developers.cloudflare.com/d1/worker-api/d1-database/):
 * D1 auto-commits each statement. `DB.batch()` is the transactional API (a
 * failed statement aborts/rolls back the sequence). `wrangler d1 execute --file`
 * is sequential auto-commit, not a batch transaction. This script does not call
 * wrangler. Generated SQL ends with a CHECK(ok = 1) postcondition so a
 * sequential apply still refuses a silent no-op. SQLite/D1 RAISE() is
 * trigger-only and is not used here. Interruption can still leave a user
 * row without a credential. Recovery is a bounded re-read plus explicit
 * refusal, never INSERT OR REPLACE or a wipe.
 */
import { lstatSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

const PRODUCTION_D1_ID = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const PRODUCTION_D1_NAME = "kaiyue-travel-production";
const VERIFIED_PRODUCTION_PRIMARY_EMAIL = "daniel@kaiyuemacau.com";
const TRIAL_OPERATOR_EMAIL = "admin-trial@kaiyue.test";
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
  return pathToFileURL(candidates[0]).href;
}

function targetEmail(envName) {
  if (envName === "trial") {
    return TRIAL_OPERATOR_EMAIL;
  }
  if (envName === "production") {
    return VERIFIED_PRODUCTION_PRIMARY_EMAIL;
  }
  return "";
}

function writeExclusivePrivate(outPath, contents) {
  if (outPath === "-" || outPath === "/dev/stdout" || outPath === "/dev/stderr") {
    fail("Refusing to write credential SQL to stdout or stderr.");
  }
  try {
    lstatSync(outPath);
    fail("Refusing to overwrite an existing file or symlink.");
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      throw error;
    }
  }
  mkdirSync(dirname(outPath), { recursive: true, mode: 0o700 });
  writeFileSync(outPath, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
}

function preflightSql(email) {
  return `-- Re-read immediately before apply. 14:18 is not perpetual.
SELECT COUNT(*) AS user_count FROM "user" WHERE lower("email") = lower(${sqlString(email)});
SELECT COUNT(*) AS credential_count
FROM "account" AS a
JOIN "user" AS u ON u."id" = a."userId"
WHERE lower(u."email") = lower(${sqlString(email)})
AND a."providerId" = 'credential';
SELECT u."id" AS user_id
FROM "user" AS u
WHERE lower(u."email") = lower(${sqlString(email)});
`;
}

function postconditionSql(email, userId, accountId) {
  return `-- Postcondition: CHECK(ok = 1) refuses a silent no-op. RAISE() is trigger-only.
CREATE TABLE IF NOT EXISTS "_primary_operator_create_guard" (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM "_primary_operator_create_guard";
INSERT INTO "_primary_operator_create_guard" ("ok")
SELECT CASE
  WHEN (
    (SELECT COUNT(*) FROM "user" WHERE "id" = ${sqlString(userId)} AND lower("email") = lower(${sqlString(email)})) = 1
    AND (SELECT COUNT(*) FROM "account" WHERE "id" = ${sqlString(accountId)} AND "userId" = ${sqlString(userId)} AND "providerId" = 'credential') = 1
    AND (SELECT COUNT(*) FROM "user" WHERE lower("email") = lower(${sqlString(email)})) = 1
    AND (
      SELECT COUNT(*) FROM "account" AS a
      JOIN "user" AS u ON u."id" = a."userId"
      WHERE lower(u."email") = lower(${sqlString(email)}) AND a."providerId" = 'credential'
    ) = 1
  ) THEN 1
  ELSE 0
END;
DROP TABLE "_primary_operator_create_guard";
`;
}

function createSql({ email, name, userId, accountId, hash, now, d1Name, d1Id }) {
  return `-- Better Auth credential CREATE for ${d1Name} (${d1Id}).
-- Parent-only apply after a fresh preflight. Do not log this file.
-- D1 auto-commits each statement; batch() is the transactional Worker API.
INSERT INTO "user" ("id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt")
SELECT ${sqlString(userId)}, ${sqlString(name)}, ${sqlString(email)}, 1, NULL, ${sqlString(now)}, ${sqlString(now)}
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
  SELECT 1 FROM "account" AS a
  JOIN "user" AS u ON u."id" = a."userId"
  WHERE lower(u."email") = lower(${sqlString(email)})
  AND a."providerId" = 'credential'
);
${postconditionSql(email, userId, accountId)}`;
}

function printPlan() {
  const lines = [
    "Primary operator provisioning plan (no secrets, no D1 apply).",
    `Production D1: ${PRODUCTION_D1_NAME} ${PRODUCTION_D1_ID}.`,
    "14:18 snapshot: Daniel user count 0; credential count 0; no role column. Re-read before apply.",
    "Decision at 14:18: CREATE user + credential. That snapshot is not perpetual.",
    "Authority is Worker env ADMIN_PRIMARY_EMAIL + ADMIN_EMAILS, not a DB role column.",
    "No migrations/0009. A persisted role would be unused metadata, not a single-primary lock.",
    "Password policy: production CREATE stays Better Auth minPasswordLength 12. ADMIN_STAGING_TEST_PASSWORD_MIN is ignored on production hosts and by this provisioner.",
    "Cloudflare Vault cannot export a generated login password into this CLI or write Worker bindings.",
    "A later native user-secret request may put a user-provided password in PRIMARY_ADMIN_PASSWORD for this process.",
    "Parent configures Worker secrets after the package route is validated. This script never calls wrangler.",
    "D1 batch() is transactional; wrangler d1 execute --file is sequential auto-commit.",
    "Generated SQL includes a CHECK(ok = 1) postcondition. Silent no-op on a preexisting user is refused.",
    "Rejected paths: public /api/auth/sign-up/email, /setup-admin, seed-preview-test-admin.mjs, any new public admin-create endpoint.",
    "Trial fixture uses admin-trial@kaiyue.test and --env trial. Never the production Daniel identity.",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

const envName = argValue("--env") || "production";
const email = (process.env.PRIMARY_ADMIN_EMAIL ?? "").trim().toLowerCase();
const expectedEmail = targetEmail(envName);

if (hasFlag("--plan") || process.argv.length <= 2) {
  printPlan();
  process.exit(0);
}

if (hasFlag("--preflight")) {
  if (!expectedEmail) {
    fail("Use --env production or --env trial.");
  }
  if (email && email !== expectedEmail) {
    fail("PRIMARY_ADMIN_EMAIL does not match the selected environment target.");
  }
  process.stdout.write(preflightSql(expectedEmail));
  process.exit(0);
}

if (!hasFlag("--write-sql")) {
  fail("Use --plan, --preflight, or --write-sql --out <path>. This script does not apply D1.");
}

const outPath = argValue("--out");
if (!outPath) {
  fail("--write-sql requires --out <path>. SQL is never printed to stdout.");
}
if (!expectedEmail) {
  fail("Use --env production or --env trial.");
}
if (!email) {
  fail("Set PRIMARY_ADMIN_EMAIL in the environment. Do not pass it on the command line.");
}
if (email !== expectedEmail) {
  fail("PRIMARY_ADMIN_EMAIL must match the selected environment target.");
}

const password = process.env.PRIMARY_ADMIN_PASSWORD ?? "";
const secret = process.env.BETTER_AUTH_SECRET ?? "";
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
const hash = await hashPassword(password);
const now = new Date().toISOString();
const userId = randomUUID();
const accountId = randomUUID();
const d1Name = envName === "trial" ? "kaiyue-travel-admin-trial" : PRODUCTION_D1_NAME;
const d1Id = envName === "trial" ? "PENDING-PARENT-CREATE-SENTINEL" : PRODUCTION_D1_ID;
const name = envName === "trial" ? "Trial operator" : "Daniel";
const sql = createSql({
  email,
  name,
  userId,
  accountId,
  hash,
  now,
  d1Name,
  d1Id,
});

writeExclusivePrivate(outPath, sql);
process.stdout.write(
  [
    "Wrote CREATE SQL with CHECK postcondition.",
    `Target ${d1Name}.`,
    "Output path recorded; password and hash omitted.",
    "Re-run --preflight against the live target immediately before apply.",
    "This script did not apply D1, print secrets, or call wrangler.",
    "",
  ].join("\n"),
);
