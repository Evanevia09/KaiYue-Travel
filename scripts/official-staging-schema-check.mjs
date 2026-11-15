import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MIGRATIONS_DIR,
  SCHEMA_CONTRACT_PATH,
  WORKFLOW_PATH,
  fail,
  loadConstants,
  loadSchemaContract,
} from "./official-staging-lib.mjs";

const constants = loadConstants();
const contract = loadSchemaContract();
const workflow = readFileSync(WORKFLOW_PATH, "utf8");
const forbiddenQuery = ["d1", "execute"].join(" ");
const forbiddenApply = ["d1", "migrations", "apply"].join(" ");

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

if (contract.kind !== "official-staging-schema-compatibility-contract") {
  fail("schema check fail-closed: unknown contract kind");
}
if (contract.not_a_live_d1_readback !== true || contract.live_d1_query !== false) {
  fail("schema check fail-closed: contract must declare it is not a live D1 readback");
}
if (
  contract.target?.d1_id !== constants.d1_id ||
  contract.target?.worker_name !== constants.worker_name
) {
  fail("schema check fail-closed: contract target does not match official staging D1/Worker");
}
if (contract.target?.account_id !== constants.account_id) {
  fail("schema check fail-closed: contract account_id mismatch");
}

const diskFiles = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const contractFiles = (contract.required_migration_files ?? []).map((row) => row.file);
if (JSON.stringify(diskFiles) !== JSON.stringify([...contractFiles].sort())) {
  fail(
    `schema mismatch fail-closed: migrations/ files ${JSON.stringify(diskFiles)} do not match contract ${JSON.stringify(contractFiles)}. Do not apply from CI; update the contract only after a reviewed out-of-band apply.`,
  );
}

for (const row of contract.required_migration_files) {
  const path = join(MIGRATIONS_DIR, row.file);
  const digest = sha256(path);
  if (digest !== row.sha256) {
    fail(
      `schema mismatch fail-closed: ${row.file} hash ${digest} != contract ${row.sha256}. Source SQL drifted. Do not apply from CI.`,
    );
  }
}

for (const name of constants.required_schema_migrations) {
  if (!contractFiles.includes(name)) {
    fail(`schema mismatch fail-closed: required migration ${name} missing from contract`);
  }
}
for (const name of constants.required_schema_tables) {
  if (!(contract.required_objects ?? []).includes(name)) {
    fail(`schema mismatch fail-closed: required object ${name} missing from contract`);
  }
}

if (
  workflow.includes(forbiddenQuery) ||
  workflow.includes(forbiddenApply) ||
  workflow.includes("wrangler d1")
) {
  fail("schema check fail-closed: official-staging workflow must not query or migrate D1");
}

console.log(
  `official-staging schema contract passed for ${diskFiles.length} migration files (source hashes only; live D1 not queried; ${SCHEMA_CONTRACT_PATH} is not a connection)`,
);
