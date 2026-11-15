import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  MIGRATIONS_DIR,
  SCHEMA_CONTRACT_PATH,
  WORKFLOW_PATH,
  fail,
  loadConstants,
  loadSchemaContract,
} from "./official-staging-lib.mjs";

const SHA256_HEX = /^[0-9a-f]{64}$/;
const MIGRATION_NAME = /^(\d{4})_[a-z0-9_]+\.sql$/;

export function evaluateSchemaContract({
  contract,
  constants,
  diskFiles,
  fileHashes,
  workflowText,
}) {
  const errors = [];
  const forbiddenQuery = ["d1", "execute"].join(" ");
  const forbiddenApply = ["d1", "migrations", "apply"].join(" ");
  const attested = constants.attested_applied_migrations ?? [];

  if (contract.kind !== "official-staging-schema-compatibility-contract") {
    errors.push("unknown contract kind");
  }
  if (contract.not_a_live_d1_readback !== true || contract.live_d1_query !== false) {
    errors.push("contract must declare it is not a live D1 readback");
  }
  if (
    contract.target?.d1_id !== constants.d1_id ||
    contract.target?.worker_name !== constants.worker_name
  ) {
    errors.push("contract target does not match official staging D1/Worker");
  }
  if (contract.target?.account_id !== constants.account_id) {
    errors.push("contract account_id mismatch");
  }
  if (attested.length !== 10) {
    errors.push("constants must attest exactly 10 applied migrations (0001–0010)");
  }

  const contractRows = contract.required_migration_files ?? [];
  const contractFiles = contractRows.map((row) => row.file);
  const attestedApplied = contract.attested_applied?.migration_files ?? [];

  if (JSON.stringify(contractFiles) !== JSON.stringify(attested)) {
    errors.push("contract file list must match attested applied 0001–0010 in order");
  }
  if (JSON.stringify(attestedApplied) !== JSON.stringify(attested)) {
    errors.push("attested_applied.migration_files must match 0001–0010 in order");
  }
  if (JSON.stringify(diskFiles) !== JSON.stringify(attested)) {
    errors.push(
      `migrations/ files ${JSON.stringify(diskFiles)} do not match attested 0001–0010 ${JSON.stringify(attested)}`,
    );
  }
  if (new Set(contractFiles).size !== contractFiles.length) {
    errors.push("contract file list has duplicates");
  }

  let previousNumber = 0;
  for (const name of attested) {
    const match = name.match(MIGRATION_NAME);
    if (!match) {
      errors.push(`attested migration name is not NNNN_*.sql: ${name}`);
      continue;
    }
    const number = Number(match[1]);
    if (number !== previousNumber + 1) {
      errors.push(`attested migrations must be sequential 0001–0010; gap at ${name}`);
    }
    previousNumber = number;
  }
  if (previousNumber !== 0 && previousNumber !== 10) {
    errors.push(
      `attested migrations must end at 0010, got ${String(previousNumber).padStart(4, "0")}`,
    );
  }

  for (const row of contractRows) {
    if (!SHA256_HEX.test(row.sha256 ?? "")) {
      errors.push(`contract hash for ${row.file} is not a 64-char sha256`);
      continue;
    }
    const digest = fileHashes[row.file];
    if (!digest) {
      errors.push(`missing source bytes for ${row.file}`);
    } else if (digest !== row.sha256) {
      errors.push(
        `${row.file} hash ${digest} != contract ${row.sha256}. Source SQL drifted. Do not apply from CI.`,
      );
    }
  }

  for (const name of constants.required_schema_migrations ?? []) {
    if (!contractFiles.includes(name)) {
      errors.push(`required migration ${name} missing from contract`);
    }
  }
  for (const name of constants.required_schema_tables ?? []) {
    if (!(contract.required_objects ?? []).includes(name)) {
      errors.push(`required object ${name} missing from contract`);
    }
  }

  if (
    workflowText.includes(forbiddenQuery) ||
    workflowText.includes(forbiddenApply) ||
    workflowText.includes("wrangler d1")
  ) {
    errors.push("official-staging workflow must not query or migrate D1");
  }

  return errors;
}

export function hashMigrationFiles(directory, files) {
  const hashes = {};
  for (const name of files) {
    hashes[name] = createHash("sha256")
      .update(readFileSync(join(directory, name)))
      .digest("hex");
  }
  return hashes;
}

function main() {
  const constants = loadConstants();
  const contract = loadSchemaContract();
  const workflowText = readFileSync(WORKFLOW_PATH, "utf8");
  const diskFiles = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const errors = evaluateSchemaContract({
    contract,
    constants,
    diskFiles,
    fileHashes: hashMigrationFiles(MIGRATIONS_DIR, diskFiles),
    workflowText,
  });
  if (errors.length > 0) {
    fail(
      `schema check fail-closed (source contract, not live D1 readback):\n- ${errors.join("\n- ")}`,
    );
  }
  console.log(
    `official-staging schema contract passed for ${diskFiles.length} migration files (source hashes of attested 0001–0010 only; live D1 not queried; ${SCHEMA_CONTRACT_PATH} is not a connection)`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
