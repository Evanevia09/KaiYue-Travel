/**
 * Bundle the loopback provisioner with Better Auth's node scrypt hasher
 * (same export Cloudflare Workers uses) so PM can run it without a checkout.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function findEsbuild() {
  const pnpm = join(root, "node_modules/.pnpm");
  const bins = [];
  for (const name of readdirSync(pnpm)) {
    if (!name.startsWith("esbuild@")) continue;
    const bin = join(pnpm, name, "node_modules/esbuild/bin/esbuild");
    if (existsSync(bin)) bins.push(bin);
  }
  bins.sort();
  const latest = bins.at(-1);
  if (!latest) throw new Error("esbuild binary not found under node_modules/.pnpm");
  return latest;
}

const esbuild = findEsbuild();
const outDir = join(root, "artifacts", "kaiyue-provision-admin-local");
const zipPath = join(root, "artifacts", "kaiyue-provision-admin-local.zip");
const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

mkdirSync(outDir, { recursive: true });
execFileSync(
  esbuild,
  [
    join(root, "scripts/provision-admin-local.mjs"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--packages=bundle",
    "--conditions=node,workerd",
    `--outfile=${join(outDir, "provision-admin.mjs")}`,
    "--banner:js=// Kai Yue local provisioner. Better Auth 1.7.5 node scrypt. No secrets.",
  ],
  { cwd: root, stdio: "inherit" },
);

const readme = `Kai Yue local admin hash (no repository checkout)

Git SHA: ${sha}
Hasher: better-auth@1.7.5 → @better-auth/utils password.node.mjs
Algorithm: node:crypto scrypt N=16384 r=16 p=1 dkLen=64 (same workerd export)
No secrets, no sample passwords, no network.

Requires Node 22+. Default bind is 127.0.0.1 only.

  unzip kaiyue-provision-admin-local.zip
  node provision-admin.mjs
  open http://127.0.0.1:8789/

If the browser cannot reach loopback, and ADMIN_SEED_EMAIL plus
ADMIN_SEED_PASSWORD are already in this process environment:

  ADMIN_SEED_EMAIL='…' ADMIN_SEED_PASSWORD='…' node provision-admin.mjs > seed-admin.sql

No listener is started in that mode. SQL goes to stdout only.
Do not paste the password into chat or logs. Stop with Ctrl+C.
Do not use this to open public signup or development on a live host.
`;
writeFileSync(join(outDir, "README.txt"), readme);
execFileSync(
  "zip",
  ["-j", "-q", zipPath, join(outDir, "provision-admin.mjs"), join(outDir, "README.txt")],
  {
    cwd: root,
  },
);
writeFileSync(join(outDir, "GIT-SHA.txt"), `${sha}\n`);
process.stdout.write(`Wrote ${zipPath}\n`);
