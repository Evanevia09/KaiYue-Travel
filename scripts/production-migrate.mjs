import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  MIGRATIONS_DIR,
  OVERLAY_PATH,
  fail,
  loadConstants,
  spawnWrangler,
} from "./production-lib.mjs";

const MIGRATION_NAME = /^(\d{4})_[a-z0-9_]+\.sql$/;

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

function sqlStatements(sql) {
  return stripSqlComments(sql)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function statementKind(statement) {
  const match = statement.match(/^([A-Za-z]+)(?:\s+([A-Za-z]+))?/i);
  if (!match) {
    return "unknown";
  }
  const first = match[1].toUpperCase();
  const second = (match[2] ?? "").toUpperCase();
  if (["CREATE", "ALTER", "DROP", "INSERT", "UPDATE", "DELETE", "REPLACE"].includes(first)) {
    return second ? `${first} ${second}` : first;
  }
  return first;
}

export function evaluatePendingMigrationSql(sql, fileName, constants) {
  const errors = [];
  const haystack = `${fileName}\n${sql}`;
  const forbiddenIds = [constants.staging_d1, constants.obsolete_d1, constants.trial_d1];
  for (const id of forbiddenIds) {
    if (haystack.includes(id)) {
      errors.push(`${fileName} mentions a non-production D1 id ${id}; refusing to apply`);
    }
  }
  if (/kaiyue-travel-staging|kaiyue-offers-staging/i.test(haystack)) {
    errors.push(`${fileName} mentions a staging Worker or R2 resource; refusing to apply`);
  }
  if (/\bATTACH\b|\bDETACH\b|\bPRAGMA\b|\bVACUUM\b|\bREINDEX\b/i.test(stripSqlComments(sql))) {
    errors.push(
      `${fileName} uses a non-additive SQLite administrative statement; refusing to apply`,
    );
  }

  const statements = sqlStatements(sql);
  if (statements.length === 0) {
    errors.push(`${fileName} has no SQL statements`);
    return errors;
  }

  let additive = false;
  for (const statement of statements) {
    const kind = statementKind(statement);
    if (
      kind === "CREATE TABLE" ||
      kind === "CREATE INDEX" ||
      kind === "CREATE UNIQUE" ||
      kind === "CREATE TRIGGER" ||
      kind === "CREATE VIEW"
    ) {
      additive = true;
      continue;
    }
    if (kind === "ALTER TABLE") {
      if (/\bDROP\b|\bRENAME\b/i.test(statement)) {
        errors.push(
          `${fileName} ALTER TABLE is not additive: ${statement.split(/\s+/).slice(0, 8).join(" ")}`,
        );
        continue;
      }
      if (/\bADD\b/i.test(statement)) {
        additive = true;
        continue;
      }
      errors.push(`${fileName} ALTER TABLE is not a recognized additive ADD`);
      continue;
    }
    if (kind === "INSERT INTO" || kind === "INSERT") {
      if (/\bSELECT\b/i.test(statement)) {
        errors.push(`${fileName} INSERT ... SELECT is refused (no data copy)`);
        continue;
      }
      if (/\blast_issued\b/i.test(statement) && !/\bCREATE TABLE\b/i.test(stripSqlComments(sql))) {
        // Seed of a new serial table created in the same file is allowed; a lone
        // last_issued write would reset an existing counter and is refused above
        // only when the table is not created here. The CREATE TABLE check is
        // on the whole file so 0011's VALUES (1, 0) seed remains allowed.
      }
      if (
        /\blast_issued\b/i.test(statement) &&
        !/\bCREATE TABLE\s+chauffeur_booking_serial\b/i.test(stripSqlComments(sql)) &&
        /\blast_issued\b/i.test(statement)
      ) {
        errors.push(`${fileName} must not write last_issued except when creating the serial table`);
      }
      additive = true;
      continue;
    }
    if (
      kind === "DROP TABLE" ||
      kind === "DROP INDEX" ||
      kind === "DROP VIEW" ||
      kind === "DROP TRIGGER" ||
      kind.startsWith("DROP ")
    ) {
      errors.push(`${fileName} contains ${kind}; refusing to apply a destructive migration`);
      continue;
    }
    if (kind === "DELETE" || kind === "DELETE FROM") {
      errors.push(`${fileName} contains DELETE; refusing to apply`);
      continue;
    }
    if (kind === "UPDATE") {
      errors.push(`${fileName} contains UPDATE; refusing to apply a serial or data reset`);
      continue;
    }
    if (kind === "REPLACE" || kind === "REPLACE INTO") {
      errors.push(`${fileName} contains REPLACE; refusing to apply`);
      continue;
    }
    errors.push(`${fileName} contains unsupported statement ${kind}; refusing to apply`);
  }

  if (!additive && errors.length === 0) {
    errors.push(`${fileName} is not an additive schema change`);
  }
  return errors;
}

export function parseUnappliedMigrations(output) {
  const text = output ?? "";
  if (/No migrations to apply/i.test(text)) {
    return [];
  }
  const names = [];
  const seen = new Set();
  for (const match of text.matchAll(/(\d{4}_[a-z0-9_]+\.sql)/gi)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

export function migrationsListArgv(constants) {
  return ["d1", "migrations", "list", constants.d1_name, "--config", OVERLAY_PATH, "--remote"];
}

export function migrationsApplyArgv(constants) {
  return ["d1", "migrations", "apply", constants.d1_name, "--config", OVERLAY_PATH, "--remote"];
}

function assertRemoteProductionTarget(output, constants, command) {
  const text = `${output.stdout}\n${output.stderr}`;
  if (text.includes(constants.staging_d1) || text.includes(constants.staging_worker)) {
    fail(`${command} mentioned a staging resource; refusing to continue`);
  }
  if (text.includes(constants.obsolete_d1) || text.includes(constants.trial_d1)) {
    fail(`${command} mentioned a non-production D1; refusing to continue`);
  }
  if (text.includes("--local") && /using local/i.test(text)) {
    fail(`${command} targeted a local D1; refusing to continue`);
  }
}

function wrangler(args, expectedAccountId) {
  return spawnWrangler(args, process.env, expectedAccountId);
}

function main() {
  const constants = loadConstants();
  const diskFiles = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const list = wrangler(migrationsListArgv(constants), constants.account_id);
  process.stdout.write(list.stdout);
  process.stderr.write(list.stderr);
  if (list.status !== 0) {
    fail(
      "production D1 migrations list failed; no migrations were applied and traffic was not changed",
    );
  }
  assertRemoteProductionTarget(list, constants, "d1 migrations list");

  const pending = parseUnappliedMigrations(`${list.stdout}\n${list.stderr}`);
  if (pending.length === 0) {
    console.log("production D1 has no pending migrations");
    return;
  }

  const errors = [];
  for (const name of pending) {
    if (!MIGRATION_NAME.test(name)) {
      errors.push(`pending migration name is not NNNN_*.sql: ${name}`);
      continue;
    }
    if (!diskFiles.includes(name)) {
      errors.push(`pending migration ${name} is not in migrations/`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
    errors.push(...evaluatePendingMigrationSql(sql, name, constants));
  }
  if (errors.length > 0) {
    fail(
      `production D1 pending migrations are not additive-only; refusing to apply:\n- ${errors.join("\n- ")}`,
    );
  }

  console.log(`applying additive production D1 migrations: ${pending.join(", ")}`);
  const apply = wrangler(migrationsApplyArgv(constants), constants.account_id);
  process.stdout.write(apply.stdout);
  process.stderr.write(apply.stderr);
  if (apply.status !== 0) {
    fail(
      "production D1 migrations apply failed; a failed migration is rolled back by Wrangler when possible. Refusing to activate.",
    );
  }
  assertRemoteProductionTarget(apply, constants, "d1 migrations apply");

  const readback = wrangler(migrationsListArgv(constants), constants.account_id);
  process.stdout.write(readback.stdout);
  process.stderr.write(readback.stderr);
  if (readback.status !== 0) {
    fail("production D1 migrations apply finished but list readback failed; refusing to activate");
  }
  const remaining = parseUnappliedMigrations(`${readback.stdout}\n${readback.stderr}`);
  if (remaining.length > 0) {
    fail(
      `production D1 migrations apply did not clear pending files: ${remaining.join(", ")}; refusing to activate`,
    );
  }
  console.log(`production D1 additive migrations applied: ${pending.join(", ")}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
