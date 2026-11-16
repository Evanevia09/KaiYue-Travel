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
const MAX_PASSWORD_LENGTH = 128;
const BOOTSTRAP_MARKER = "production-bootstrap";
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

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

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

function operatorPreflightSql(email) {
  return `-- SELECT-only. Safe before 0009/0010: lists applied migrations and sidecar objects.
SELECT name FROM d1_migrations ORDER BY id;
SELECT name, type FROM sqlite_master
WHERE name IN ('admin_operator', 'operator_audit_events',
  'protect_last_enabled_super_admin_update', 'protect_last_enabled_super_admin_delete')
ORDER BY name;
-- Run only after 0009/0010 exist; these read admin_operator.
SELECT COUNT(*) AS operator_count,
  (SELECT COUNT(*) FROM admin_operator WHERE role = 'super_admin' AND enabled = 1) AS enabled_super_count
FROM admin_operator;
SELECT o.role, o.enabled, o.updated_by
FROM admin_operator AS o
JOIN "user" AS u ON u."id" = o.user_id
WHERE lower(u."email") = lower(${sqlString(email)});
`;
}

function bootstrapSql({ email, auditId, d1Name, d1Id }) {
  const target = `(SELECT "id" FROM "user" WHERE lower("email") = lower(${sqlString(email)}))`;
  const identityOk = `(SELECT COUNT(*) FROM "user" WHERE lower("email") = lower(${sqlString(email)})) = 1
    AND (
      SELECT COUNT(*) FROM "account" AS a
      JOIN "user" AS u ON u."id" = a."userId"
      WHERE lower(u."email") = lower(${sqlString(email)}) AND a."providerId" = 'credential'
    ) = 1`;
  const ownerIsSuper = `(SELECT COUNT(*) FROM admin_operator
      WHERE user_id = ${target} AND role = 'super_admin' AND enabled = 1) = 1`;
  return `-- First production super_admin bootstrap for ${d1Name} (${d1Id}).
-- Requires migrations 0009 + 0010 and a primary user + credential created by --write-sql.
-- Supported prestate: admin_operator empty, or this primary already an enabled super_admin
-- (replay inserts nothing). Anything else fails the CHECK before any write.
-- Does not create users, change passwords, touch other users, or send mail.
-- D1 auto-commits each statement; every write re-checks its own preconditions.
CREATE TABLE IF NOT EXISTS "_primary_operator_bootstrap_guard" (
  ok INTEGER NOT NULL CHECK (ok = 1)
);
DELETE FROM "_primary_operator_bootstrap_guard";
INSERT INTO "_primary_operator_bootstrap_guard" ("ok")
SELECT CASE
  WHEN ${identityOk}
    AND (
      (SELECT COUNT(*) FROM admin_operator) = 0
      OR ${ownerIsSuper}
    )
  THEN 1
  ELSE 0
END;
INSERT INTO admin_operator (user_id, role, enabled, created_at, updated_at, updated_by)
SELECT ${target}, 'super_admin', 1, ${NOW_SQL}, ${NOW_SQL}, ${sqlString(BOOTSTRAP_MARKER)}
WHERE ${identityOk}
  AND (SELECT COUNT(*) FROM admin_operator) = 0;
INSERT INTO operator_audit_events
  (id, user_id, event_type, actor_id, from_value, to_value, request_id, created_at)
SELECT ${sqlString(auditId)}, ${target}, 'operator_created', ${sqlString(BOOTSTRAP_MARKER)},
  NULL, 'super_admin:enabled', ${sqlString(BOOTSTRAP_MARKER)}, ${NOW_SQL}
WHERE ${identityOk}
  AND (SELECT COUNT(*) FROM admin_operator
    WHERE user_id = ${target} AND updated_by = ${sqlString(BOOTSTRAP_MARKER)}) = 1
  AND NOT EXISTS (
    SELECT 1 FROM operator_audit_events
    WHERE user_id = ${target} AND request_id = ${sqlString(BOOTSTRAP_MARKER)}
  );
INSERT INTO "_primary_operator_bootstrap_guard" ("ok")
SELECT CASE WHEN ${identityOk} AND ${ownerIsSuper} THEN 1 ELSE 0 END;
DROP TABLE "_primary_operator_bootstrap_guard";
`;
}

function printPlan() {
  const lines = [
    "Primary operator provisioning plan (no secrets, no D1 apply).",
    `Production D1: ${PRODUCTION_D1_NAME} ${PRODUCTION_D1_ID}.`,
    "Order: --preflight, migrations 0009 + 0010, --write-sql (CREATE user + credential), --write-bootstrap-sql (first super_admin). Re-read before each apply.",
    "Live admin authority is an enabled admin_operator row (super_admin or staff). ADMIN_EMAILS and ADMIN_PRIMARY_EMAIL neither admit nor exclude on production hosts.",
    "Bootstrap supports only an empty admin_operator or this primary already an enabled super_admin; replay inserts nothing.",
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

if (hasFlag("--preflight-operators")) {
  if (envName !== "production") {
    fail("Operator preflight is production-only.");
  }
  process.stdout.write(operatorPreflightSql(expectedEmail));
  process.exit(0);
}

if (hasFlag("--write-bootstrap-sql")) {
  if (envName !== "production") {
    fail("Bootstrap SQL is production-only.");
  }
  if (!email || email !== expectedEmail) {
    fail("PRIMARY_ADMIN_EMAIL must match the configured production primary.");
  }
  const bootstrapOut = argValue("--out");
  if (!bootstrapOut) {
    fail("--write-bootstrap-sql requires --out <path>.");
  }
  writeExclusivePrivate(
    bootstrapOut,
    bootstrapSql({
      email,
      auditId: randomUUID(),
      d1Name: PRODUCTION_D1_NAME,
      d1Id: PRODUCTION_D1_ID,
    }),
  );
  process.stdout.write(
    "Wrote first super_admin bootstrap SQL with CHECK pre/postconditions. This script did not apply D1.\n",
  );
  process.exit(0);
}

if (!hasFlag("--write-sql")) {
  fail(
    "Use --plan, --preflight, --preflight-operators, --write-sql --out <path>, or --write-bootstrap-sql --out <path>. This script does not apply D1.",
  );
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
if (!password || password.length < MIN_PASSWORD_LENGTH) {
  fail(`PRIMARY_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
}
if (password.length > MAX_PASSWORD_LENGTH) {
  fail(`PRIMARY_ADMIN_PASSWORD must be at most ${MAX_PASSWORD_LENGTH} characters.`);
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
