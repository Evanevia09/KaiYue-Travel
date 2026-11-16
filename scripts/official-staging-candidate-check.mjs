import { pathToFileURL } from "node:url";
import { OVERLAY_PATH, fail, loadConstants, spawnWrangler } from "./official-staging-lib.mjs";

const FORBIDDEN_BINDING_NAMES = [
  "ACCESS_AUD",
  "ACCESS_TEAM_DOMAIN",
  "TEMP_ADMIN_EXPIRES_AT",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "RESEND_STAFF_TO",
  "RESEND_REPLY_TO",
  "ADMIN_PASSWORD",
  "PRIMARY_ADMIN_PASSWORD",
];

function bindingsOf(version) {
  const bindings = version?.resources?.bindings;
  return Array.isArray(bindings) ? bindings : null;
}

function findBinding(bindings, type, name) {
  return bindings.filter((row) => row && row.type === type && row.name === name);
}

export function extractRunWorkerFirst(version, assetsBinding) {
  const candidates = [
    version?.resources?.script_runtime?.assets?.raw_run_worker_first,
    assetsBinding?.run_worker_first,
    assetsBinding?.config?.run_worker_first,
    version?.resources?.assets?.run_worker_first,
    version?.resources?.assets?.config?.run_worker_first,
    version?.resources?.script?.assets?.run_worker_first,
    version?.resources?.script?.assets?.config?.run_worker_first,
    version?.assets?.run_worker_first,
    version?.assets?.config?.run_worker_first,
  ];
  return candidates.find((value) => value !== undefined);
}

export function versionsViewArgv(constants, versionId) {
  return [
    "versions",
    "view",
    versionId,
    "--name",
    constants.worker_name,
    "--config",
    OVERLAY_PATH,
    "--json",
  ];
}

function parseJsonPayload(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("no JSON object in command output");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function evaluateCandidate(version, constants, expectedVersionId) {
  const errors = [];
  if (!version || typeof version !== "object" || Array.isArray(version)) {
    return ["candidate metadata is missing or not an object"];
  }
  if (version.id !== expectedVersionId) {
    errors.push(
      `candidate id ${JSON.stringify(version.id)} does not match uploaded version ${expectedVersionId}`,
    );
  }

  const runtime = version.resources?.script_runtime;
  if (runtime?.compatibility_date !== constants.compatibility_date) {
    errors.push(
      `compatibility_date ${JSON.stringify(runtime?.compatibility_date)} != ${constants.compatibility_date}`,
    );
  }
  const flags = runtime?.compatibility_flags;
  if (!Array.isArray(flags) || !flags.includes("nodejs_compat")) {
    errors.push("compatibility_flags must include nodejs_compat");
  }

  const bindings = bindingsOf(version);
  if (!bindings) {
    errors.push("candidate resources.bindings must be an array");
    return errors;
  }

  const d1 = findBinding(bindings, "d1", "DB");
  if (d1.length !== 1) {
    errors.push(`expected exactly one d1 binding named DB, found ${d1.length}`);
  } else {
    const id = d1[0].id ?? d1[0].database_id;
    if (id !== constants.d1_id) {
      errors.push(`DB d1 id ${JSON.stringify(id)} != ${constants.d1_id}`);
    }
    if (d1[0].database_name && d1[0].database_name !== constants.d1_name) {
      errors.push(
        `DB database_name ${JSON.stringify(d1[0].database_name)} != ${constants.d1_name}`,
      );
    }
  }

  const r2 = findBinding(bindings, "r2_bucket", "OFFERS_BUCKET");
  if (r2.length !== 1) {
    errors.push(`expected exactly one r2_bucket binding named OFFERS_BUCKET, found ${r2.length}`);
  } else if (r2[0].bucket_name !== constants.r2_bucket) {
    errors.push(
      `OFFERS_BUCKET bucket_name ${JSON.stringify(r2[0].bucket_name)} != ${constants.r2_bucket}`,
    );
  }

  const assets = findBinding(bindings, "assets", "ASSETS");
  if (assets.length !== 1) {
    errors.push(`expected exactly one assets binding named ASSETS, found ${assets.length}`);
  }
  const runWorkerFirst = extractRunWorkerFirst(version, assets[0]);
  if (runWorkerFirst !== true || constants.html_run_worker_first !== true) {
    errors.push(
      `run_worker_first ${JSON.stringify(runWorkerFirst)} must be true (path arrays remain host-agnostic asset-cacheable)`,
    );
  }

  const expectedVars = constants.vars;
  const plain = bindings.filter((row) => row?.type === "plain_text");
  const plainNames = new Set(plain.map((row) => row.name));
  for (const [name, text] of Object.entries(expectedVars)) {
    const matches = findBinding(bindings, "plain_text", name);
    if (matches.length !== 1) {
      errors.push(`expected exactly one plain_text var ${name}, found ${matches.length}`);
    } else if (matches[0].text !== text) {
      errors.push(`var ${name} text ${JSON.stringify(matches[0].text)} != ${JSON.stringify(text)}`);
    }
  }
  for (const row of plain) {
    if (!(row.name in expectedVars)) {
      errors.push(`unexpected plain_text var ${row.name}`);
    }
  }
  if (plainNames.size !== Object.keys(expectedVars).length) {
    errors.push("plain_text var set does not match overlay vars");
  }

  const secret = findBinding(bindings, "secret_text", "BETTER_AUTH_SECRET");
  if (secret.length !== 1) {
    errors.push(
      `expected BETTER_AUTH_SECRET secret_text on the uploaded version, found ${secret.length}`,
    );
  } else {
    if (secret[0].type !== "secret_text") {
      errors.push("BETTER_AUTH_SECRET type must be secret_text");
    }
    if (typeof secret[0].text === "string" && secret[0].text.length > 0) {
      errors.push("BETTER_AUTH_SECRET must not include a secret value");
    }
    if (typeof secret[0].value === "string" && secret[0].value.length > 0) {
      errors.push("BETTER_AUTH_SECRET must not include a secret value");
    }
  }
  if (findBinding(bindings, "plain_text", "BETTER_AUTH_SECRET").length > 0) {
    errors.push("BETTER_AUTH_SECRET must not be a plain_text var");
  }
  const extraSecrets = bindings.filter(
    (row) => row?.type === "secret_text" && row.name !== "BETTER_AUTH_SECRET",
  );
  if (extraSecrets.length > 0) {
    errors.push(
      `unexpected extra secret_text binding ${extraSecrets.map((row) => row.name).join(",")}`,
    );
  }

  for (const row of bindings) {
    if (!row || typeof row !== "object") {
      errors.push("malformed binding entry");
      continue;
    }
    if (FORBIDDEN_BINDING_NAMES.includes(row.name)) {
      errors.push(`forbidden binding ${row.type}:${row.name}`);
    }
    if (row.type === "d1") {
      const id = row.id ?? row.database_id;
      if ([constants.production_d1, constants.obsolete_d1, constants.trial_d1].includes(id)) {
        errors.push(`forbidden D1 id ${id} on binding ${row.name}`);
      }
    }
    if (row.type === "r2_bucket" && row.bucket_name && row.bucket_name !== constants.r2_bucket) {
      errors.push(`forbidden R2 bucket ${row.bucket_name} on binding ${row.name}`);
    }
  }

  const extraD1 = bindings.filter((row) => row?.type === "d1" && row.name !== "DB");
  const extraR2 = bindings.filter(
    (row) => row?.type === "r2_bucket" && row.name !== "OFFERS_BUCKET",
  );
  if (extraD1.length > 0) {
    errors.push(`unexpected extra d1 binding ${extraD1.map((row) => row.name).join(",")}`);
  }
  if (extraR2.length > 0) {
    errors.push(`unexpected extra r2_bucket binding ${extraR2.map((row) => row.name).join(",")}`);
  }

  return errors;
}

export function parseWranglerJson(stdout, stderr) {
  try {
    return parseJsonPayload(stdout);
  } catch (error) {
    throw new Error(`${error.message}; stderr=${stderr.trim()}`);
  }
}

function main() {
  const constants = loadConstants();
  const versionId = process.env.WORKER_VERSION_ID;
  if (!versionId || !/^[0-9a-f-]{36}$/i.test(versionId)) {
    fail("candidate check fail-closed: WORKER_VERSION_ID missing or not a UUID");
  }
  const result = spawnWrangler(
    versionsViewArgv(constants, versionId),
    process.env,
    constants.account_id,
  );
  if (result.status !== 0) {
    fail(
      `candidate check fail-closed: versions view failed for ${versionId}. ${result.stderr.trim() || result.stdout.trim()}`,
    );
  }
  let version;
  try {
    version = parseWranglerJson(result.stdout, result.stderr);
  } catch (error) {
    fail(`candidate check fail-closed: malformed versions view JSON. ${error.message}`);
  }
  const errors = evaluateCandidate(version, constants, versionId);
  if (errors.length > 0) {
    fail(`candidate check fail-closed (uploaded version ${versionId}):\n- ${errors.join("\n- ")}`);
  }
  console.log(
    `official-staging uploaded version ${versionId} structured candidate metadata passed`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
