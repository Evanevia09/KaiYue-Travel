/**
 * Guard against accidental live uploads. Top-level wrangler.jsonc is not a
 * deploy target. Operators must pass --env staging|production or set
 * CLOUDFLARE_ENV to the same value.
 */
const allowed = new Set(["staging", "production"]);

function envFromArgv(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--env" || token === "-e") {
      return argv[index + 1];
    }
    if (token.startsWith("--env=")) {
      return token.slice("--env=".length);
    }
  }
  return undefined;
}

const fromArgv = envFromArgv(process.argv.slice(2));
const fromEnv = process.env.CLOUDFLARE_ENV?.trim();
const selected = (fromArgv ?? fromEnv ?? "").trim();

if (!allowed.has(selected)) {
  console.error(
    "Refusing to treat top-level wrangler.jsonc as a live target.\nPass --env staging or --env production (or set CLOUDFLARE_ENV to the same).\nExample: node scripts/require-wrangler-env.mjs --env staging && npx wrangler versions upload --env staging --name kaiyue-travel-staging\nDo not retry Cloudflare Workers Builds for production Worker kaiyue-travel from a PR.",
  );
  process.exit(1);
}

process.stdout.write(`wrangler env ok: ${selected}\n`);
