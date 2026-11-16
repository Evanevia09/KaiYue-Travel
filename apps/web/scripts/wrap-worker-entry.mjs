/**
 * Replaces Astro's generated Worker `dist/server/entry.mjs` with a fetch
 * wrapper that runs the dedicated-admin gate before the Cloudflare adapter
 * can `ASSETS.fetch` prerendered HTML.
 *
 * Boolean `run_worker_first` only forces the request into this Worker. The
 * adapter still matches static assets and falls back to ASSETS before
 * `app.render` / middleware. This wrap is the actual entry for overlay
 * `main` (`apps/web/dist/server/entry.mjs`).
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ASTRO_ENTRY_FILENAME = "astro-entry.mjs";
export const WORKER_ENTRY_IMPORT = "../../src/lib/server/worker-entry.ts";

export function wrapperSource(workerEntryImport = WORKER_ENTRY_IMPORT) {
  return `import astro from "./${ASTRO_ENTRY_FILENAME}";
import { createWorkerFetch } from ${JSON.stringify(workerEntryImport)};

export default {
  fetch: createWorkerFetch((request, env, ctx) => astro.fetch(request, env, ctx)),
};
`;
}

export function isWrappedEntry(source) {
  return source.includes("createWorkerFetch") && source.includes(ASTRO_ENTRY_FILENAME);
}

export function wrapWorkerEntry(serverDir, options = {}) {
  const entryPath = join(serverDir, "entry.mjs");
  const astroPath = join(serverDir, ASTRO_ENTRY_FILENAME);
  const workerEntryImport = options.workerEntryImport ?? WORKER_ENTRY_IMPORT;
  if (!existsSync(entryPath)) {
    throw new Error(`missing ${entryPath}; run astro build first`);
  }
  const current = readFileSync(entryPath, "utf8");
  if (isWrappedEntry(current) && existsSync(astroPath)) {
    console.log("[worker-entry] dist/server/entry.mjs already wraps astro-entry.mjs");
    return { wrapped: false, entryPath, astroPath };
  }
  if (existsSync(astroPath)) {
    throw new Error(`${astroPath} already exists but ${entryPath} is not the dedicated-admin wrap`);
  }
  renameSync(entryPath, astroPath);
  writeFileSync(entryPath, wrapperSource(workerEntryImport));
  console.log("[worker-entry] wrapped dist/server/entry.mjs ahead of adapter asset fallback");
  return { wrapped: true, entryPath, astroPath };
}

function main() {
  wrapWorkerEntry(join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "server"));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
