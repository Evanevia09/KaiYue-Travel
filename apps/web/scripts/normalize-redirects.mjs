/**
 * Normalises `dist/client/_redirects` after `astro build`.
 *
 * The Cloudflare adapter appends the configured redirects once per generated
 * route and drops the separator between rules, so the file ends up as
 * `/services/ /services/airport-transfer 301/services /services/airport-transfer
 * 301...` — every rule after the first is glued onto the previous line and
 * Cloudflare ignores it. That silently costs `/services` its redirect to
 * `/services/airport-transfer`.
 *
 * This rewrites the file as one rule per line, deduplicated. Drop it once the
 * adapter emits well-formed redirects.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const file = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "client", "_redirects");

if (!existsSync(file)) {
  process.exit(0);
}

const raw = readFileSync(file, "utf8");

const rules = raw
  // Rules are `from to status`; a status followed immediately by `/` means the
  // adapter glued the next rule onto this line.
  .split(/(?<=\s\d{3})(?=\/)/)
  .flatMap((chunk) => chunk.split(/\r?\n/))
  .map((line) => line.trim())
  .filter((line) => line.length > 0);

const normalised = `${[...new Set(rules)].join("\n")}\n`;

if (normalised !== raw) {
  writeFileSync(file, normalised);
  console.log(`[redirects] normalised ${rules.length} rule(s) in dist/client/_redirects`);
}
