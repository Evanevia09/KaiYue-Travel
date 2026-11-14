/**
 * Freeze a complete Worker ledger (bundled entry.js + dist/client) for one
 * wrangler env. Run once per reviewed source SHA. Do not rerun on docs-only
 * commits. Secrets are never written.
 *
 *   PUBLIC_SITE_URL=… pnpm build
 *   node scripts/build-complete-ledger.mjs --env staging|production
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const allowed = new Set(["staging", "production"]);
const envName = (() => {
  const idx = process.argv.indexOf("--env");
  return (idx >= 0 ? process.argv[idx + 1] : "").trim();
})();
if (!allowed.has(envName)) {
  console.error("Pass --env staging or --env production");
  process.exit(1);
}

const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
const shortSha = sourceSha.slice(0, 7);
const clientDir = join(root, "apps/web/dist/client");
const serverEntry = join(root, "apps/web/dist/server/entry.mjs");
if (!existsSync(clientDir) || !existsSync(serverEntry)) {
  throw new Error("Missing apps/web/dist. Run PUBLIC_SITE_URL=… pnpm build first.");
}

const staging = envName === "staging";
const scriptName = staging ? "kaiyue-travel-staging" : "kaiyue-travel";
const publicSiteUrl = staging
  ? "https://kaiyue-travel-staging.kai-yue.workers.dev"
  : "https://kaiyuemacau.com";
const d1Id = staging
  ? "043cd0ff-a1e6-4b5e-98c1-968c286e0c70"
  : "06cf879d-8fea-4088-8881-7d382e1b8c11";
const d1Name = staging ? "kaiyue-travel-staging" : "kaiyue-travel-production";
const r2Name = staging ? "kaiyue-offers-staging" : "kaiyue-offers-production";
const rollbackVersion = staging
  ? "b53c0353-bfc4-4700-a5c7-725b7167af6e"
  : "74ebe1fc-135d-4a97-b297-e2d1d2748fa0";
const vars = staging
  ? {
      ENVIRONMENT: "preview",
      PUBLIC_SITE_URL: publicSiteUrl,
      BUSINESS_TIMEZONE: "Asia/Macau",
      BOOKING_NOTICE_HOURS: "24",
      WHATSAPP_NUMBER: "+85328338882",
      DEV_ADMIN_BYPASS: "false",
      ADMIN_EMAILS: "daniel@kaiyuemacau.com",
      TEMP_ADMIN_EXPIRES_AT: "2026-11-24T15:59:59+08:00",
      ADMIN_STAGING_TEST_PASSWORD_MIN: "6",
    }
  : {
      ENVIRONMENT: "production",
      PUBLIC_SITE_URL: publicSiteUrl,
      BUSINESS_TIMEZONE: "Asia/Macau",
      BOOKING_NOTICE_HOURS: "24",
      WHATSAPP_NUMBER: "+85328338882",
      DEV_ADMIN_BYPASS: "false",
    };

const skipAssetNames = new Set(["_headers", "_redirects", ".assetsignore"]);
const outBase = join(root, "artifacts", `kaiyue-${envName}-complete-${shortSha}`);
const zipPath = `${outBase}.zip`;
rmSync(outBase, { recursive: true, force: true });
mkdirSync(outBase, { recursive: true });

const bundleDir = mkdtempSync(join(tmpdir(), `kaiyue-bundle-${envName}-`));
execFileSync(
  "npx",
  [
    "wrangler",
    "versions",
    "upload",
    "--env",
    envName,
    "--name",
    scriptName,
    "--dry-run",
    "--outdir",
    bundleDir,
  ],
  { cwd: root, stdio: "inherit", env: { ...process.env, CLOUDFLARE_ENV: envName } },
);

const bundled = readdirSync(bundleDir).filter((name) => name.endsWith(".js"));
const workerJs = bundled.find((name) => name === "index.js") ?? bundled[0];
if (!workerJs) throw new Error(`No bundled Worker JS in ${bundleDir}`);
copyFileSync(join(bundleDir, workerJs), join(outBase, "entry.js"));
rmSync(bundleDir, { recursive: true, force: true });

const distClient = join(outBase, "dist-client");
cpSync(clientDir, distClient, { recursive: true });
cpSync(join(root, "migrations"), join(outBase, "migrations"), { recursive: true });

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, acc);
    else acc.push(path);
  }
  return acc;
}

const files = walk(distClient).sort();
const ledger = [];
for (const path of files) {
  const rel = `/${relative(distClient, path).split("\\").join("/")}`;
  const base = rel.slice(1);
  if (skipAssetNames.has(base.split("/").pop() ?? "")) continue;
  const buf = readFileSync(path);
  ledger.push({
    path: rel,
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
  });
}

const wrangler = {
  name: scriptName,
  main: "./entry.js",
  compatibility_date: "2026-09-01",
  compatibility_flags: ["nodejs_compat"],
  assets: {
    directory: "./dist-client",
    binding: "ASSETS",
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: d1Name,
      database_id: d1Id,
      migrations_dir: "./migrations",
    },
  ],
  r2_buckets: [{ binding: "OFFERS_BUCKET", bucket_name: r2Name }],
  vars,
};

writeFileSync(join(outBase, "wrangler.jsonc"), `${JSON.stringify(wrangler, null, 2)}\n`);
writeFileSync(
  join(outBase, "assets-ledger.json"),
  `${JSON.stringify({ fileCount: ledger.length, files: ledger }, null, 2)}\n`,
);
writeFileSync(join(outBase, "SOURCE-SHA.txt"), `${sourceSha}\n`);

const entrySha = createHash("sha256")
  .update(readFileSync(join(outBase, "entry.js")))
  .digest("hex");
const deployment = {
  kind: "complete-ledger",
  not: "This package does not contain secrets. Do not add --secrets-file.",
  runtimeSourceSHA: sourceSha,
  env: envName,
  account_id: "33ecc75158a1cdd23ba1a62eb70c5103",
  zone_id_parent_reported: "fb84210cb8175ff4412b444805e1a6a5",
  script: scriptName,
  compatibility_date_live_verified: "2026-09-01",
  compatibility_flags_live_verified: ["nodejs_compat"],
  assets_serve_directly: true,
  public_site_url: publicSiteUrl,
  dashboard_host: "admin.kaiyuemacau.com",
  d1: { binding: "DB", database_id: d1Id, database_name: d1Name },
  r2: { binding: "OFFERS_BUCKET", bucket_name: r2Name },
  vars,
  secret_names_live: staging ? ["BETTER_AUTH_SECRET"] : [],
  secret_values_included: false,
  rollback_version_id: rollbackVersion,
  entry_js_sha256: entrySha,
  ledger_files: ledger.length,
  upload:
    "From this directory after unzip: npx wrangler versions upload --no-bundle --keep-vars --strict --name " +
    scriptName,
};
writeFileSync(join(outBase, "DEPLOYMENT-CONFIG.json"), `${JSON.stringify(deployment, null, 2)}\n`);

const plan = `Kai Yue ${envName} complete ledger
runtimeSourceSHA ${sourceSha}
script ${scriptName}
canonical ${publicSiteUrl}
compatibility_date 2026-09-01 (live GET 2026-11-12, not an example)
compatibility_flags nodejs_compat
D1 ${d1Id}
R2 ${r2Name}
rollback ${rollbackVersion}
admin.kaiyuemacau.com password dashboard when Access unset; Access JWT when Access vars are set
Do not rebuild Astro. Do not use --secrets-file. Secrets stay in the Worker.

unzip, cd into this folder, official OAuth device login, then:

  npx wrangler versions upload --no-bundle --keep-vars --strict --name ${scriptName}

--keep-vars preserves live dashboard vars. Secrets are never deleted by upload.
Do not wrangler deploy (that is 100%). Do not retry production Workers Builds.
Account 33ecc75158a1cdd23ba1a62eb70c5103. Zone fb84210cb8175ff4412b444805e1a6a5.
`;
writeFileSync(join(outBase, "OPERATOR-CLI-PLAN.txt"), plan);

const sums = execFileSync("sha256sum", ["entry.js"], { cwd: outBase, encoding: "utf8" });
writeFileSync(join(outBase, "SHA256SUMS"), sums);

rmSync(zipPath, { force: true });
execFileSync("zip", ["-qr", zipPath, "."], { cwd: outBase });
const zipSha = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
const zipBytes = statSync(zipPath).size;
writeFileSync(
  join(outBase, "ZIP-SHA256.txt"),
  `${zipSha}  ${zipBytes}  ${relative(root, zipPath)}\n`,
);
process.stdout.write(
  JSON.stringify(
    {
      env: envName,
      runtimeSourceSHA: sourceSha,
      zip: relative(root, zipPath),
      zipSha256: zipSha,
      zipBytes,
      entrySha256: entrySha,
      ledgerFiles: ledger.length,
    },
    null,
    2,
  ) + "\n",
);
