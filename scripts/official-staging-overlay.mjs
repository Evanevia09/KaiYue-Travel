import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { OVERLAY_PATH, fail, loadConstants } from "./official-staging-lib.mjs";

const HEADER = `// Official staging upload overlay. Generated from deploy/official-staging/constants.json.
// Do not upload git wrangler.jsonc. keep_vars false. Secrets omitted (Worker-only).
// HTML Worker-first. This file does not deploy traffic by itself.
`;

export function renderOverlay(constants) {
  const config = {
    name: constants.worker_name,
    account_id: constants.account_id,
    main: constants.overlay_main,
    compatibility_date: constants.compatibility_date,
    compatibility_flags: ["nodejs_compat"],
    keep_vars: false,
    assets: {
      directory: constants.overlay_assets,
      binding: "ASSETS",
      run_worker_first: constants.html_worker_first_paths,
    },
    d1_databases: [
      {
        binding: "DB",
        database_name: constants.d1_name,
        database_id: constants.d1_id,
        migrations_dir: constants.overlay_migrations,
      },
    ],
    r2_buckets: [
      {
        binding: "OFFERS_BUCKET",
        bucket_name: constants.r2_bucket,
      },
    ],
    vars: constants.vars,
  };
  return `${HEADER}${JSON.stringify(config, null, 2)}\n`;
}

function main() {
  const constants = loadConstants();
  const rendered = renderOverlay(constants);
  if (process.argv.includes("--check")) {
    const current = readFileSync(OVERLAY_PATH, "utf8");
    if (current !== rendered) {
      fail(
        "deploy/official-staging/wrangler.jsonc is out of date; run node scripts/official-staging-overlay.mjs",
      );
    }
    console.log("official-staging overlay matches constants");
    return;
  }
  writeFileSync(OVERLAY_PATH, rendered);
  console.log(`wrote ${OVERLAY_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
