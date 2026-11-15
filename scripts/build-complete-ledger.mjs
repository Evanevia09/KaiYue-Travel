/**
 * Freeze a complete Worker ledger (bundled entry.js + dist/client) for the
 * production overlay. Run once per reviewed source SHA. Secrets are never
 * written. Refuses --env staging so this branch cannot emit the PR #26/#34
 * UAT overlay. Git wrangler.jsonc is used only for --dry-run bundling; the
 * zip wrangler.jsonc is the production overlay (06cf879d, HTML Worker-first
 * path array). Do not upload git wrangler.jsonc.
 *
 *   PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build
 *   node scripts/build-complete-ledger.mjs --env production
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
const envName = (() => {
  const idx = process.argv.indexOf("--env");
  return (idx >= 0 ? process.argv[idx + 1] : "").trim();
})();
if (envName !== "production") {
  console.error(
    "This production-candidate ledger only accepts --env production.\nDo not freeze official UAT or the unapproved admin-trial overlay from this branch.",
  );
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
  throw new Error(
    "Missing apps/web/dist. Run PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build first.",
  );
}

const overlayPath = join(root, "docs/records/wrangler.production-artifact.jsonc");
const overlayText = readFileSync(overlayPath, "utf8");
const overlayJson = overlayText.replace(/^\s*\/\/.*$/gm, "");
const overlay = JSON.parse(overlayJson);
const scriptName = "kaiyue-travel";
const d1Id = "06cf879d-8fea-4088-8881-7d382e1b8c11";
const d1Name = "kaiyue-travel-production";
const r2Name = "kaiyue-offers-production";
const rollbackVersion = "5b859f36-39c5-43aa-817a-434d56ae8214";
const vars = overlay.vars;
const publicSiteUrl = "https://kaiyuemacau.com";

const skipAssetNames = new Set(["_headers", "_redirects", ".assetsignore"]);
const outBase = join(root, "artifacts", `kaiyue-production-complete-${shortSha}`);
const zipPath = `${outBase}.zip`;
rmSync(outBase, { recursive: true, force: true });
mkdirSync(outBase, { recursive: true });

const bundleDir = mkdtempSync(join(tmpdir(), "kaiyue-bundle-production-"));
execFileSync(
  "npx",
  ["wrangler", "versions", "upload", "--name", scriptName, "--dry-run", "--outdir", bundleDir],
  { cwd: root, stdio: "inherit" },
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
  ...overlay,
  main: "./entry.js",
  assets: {
    directory: "./dist-client",
    binding: "ASSETS",
    run_worker_first: overlay.assets?.run_worker_first ?? false,
  },
};
writeFileSync(join(outBase, "wrangler.jsonc"), `${JSON.stringify(wrangler, null, 2)}\n`);
writeFileSync(
  join(outBase, "assets-ledger.json"),
  `${JSON.stringify({ fileCount: ledger.length, files: ledger }, null, 2)}\n`,
);
writeFileSync(join(outBase, "SOURCE-SHA.txt"), `${sourceSha}\n`);
copyFileSync(overlayPath, join(outBase, "wrangler.production-artifact.jsonc"));

const entrySha = createHash("sha256")
  .update(readFileSync(join(outBase, "entry.js")))
  .digest("hex");
const overlaySha = createHash("sha256").update(readFileSync(overlayPath)).digest("hex");
const deployment = {
  kind: "complete-ledger",
  not: "This package does not contain secrets. Do not add --secrets-file.",
  runtimeSourceSHA: sourceSha,
  liveSourceBase: "9ff81925d722bb5f9fbdd2af3ef609d72ada8ecc",
  env: "production",
  account_id: "33ecc75158a1cdd23ba1a62eb70c5103",
  script: scriptName,
  compatibility_date_live_verified: "2026-09-01",
  assets_serve_directly: "hashed /_astro /images favicon only",
  run_worker_first: overlay.assets?.run_worker_first ?? false,
  public_site_url: publicSiteUrl,
  production_admin_gate:
    "fail-closed /admin /login 403 on apex/www/legacy; Access host unchanged from 9ff81925",
  d1: { binding: "DB", database_id: d1Id, database_name: d1Name },
  r2: { binding: "OFFERS_BUCKET", bucket_name: r2Name },
  vars,
  secret_names_live: [],
  secret_values_included: false,
  rollback_version_id: rollbackVersion,
  entry_js_sha256: entrySha,
  overlay_sha256: overlaySha,
  ledger_files: ledger.length,
  upload:
    "From this directory after unzip: npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel",
};
writeFileSync(join(outBase, "DEPLOYMENT-CONFIG.json"), `${JSON.stringify(deployment, null, 2)}\n`);

const plan = `Kai Yue production complete ledger
runtimeSourceSHA ${sourceSha}
live base 9ff81925d722bb5f9fbdd2af3ef609d72ada8ecc
script ${scriptName}
canonical ${publicSiteUrl}
D1 ${d1Id}
R2 ${r2Name}
HTML Worker-first; hashed assets asset-first
rollback ${rollbackVersion}
fail-closed /admin /login 403
Do not upload git wrangler.jsonc. Use this folder's wrangler.jsonc / overlay.
Do not encode ADMIN_EMAILS, TEMP_ADMIN_EXPIRES_AT, ADMIN_STAGING_TEST_PASSWORD_MIN, BETTER_AUTH_SECRET.
Do not wrangler deploy (that is 100%). Do not retry production Workers Builds.
Account 33ecc75158a1cdd23ba1a62eb70c5103.
`;
writeFileSync(join(outBase, "OPERATOR-CLI-PLAN.txt"), plan);

const sums = execFileSync("sha256sum", ["entry.js", "wrangler.jsonc"], {
  cwd: outBase,
  encoding: "utf8",
});
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
      overlaySha256: overlaySha,
      ledgerFiles: ledger.length,
    },
    null,
    2,
  ) + "\n",
);
