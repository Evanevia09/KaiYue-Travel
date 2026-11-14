/**
 * Loopback-only Better Auth hash + SQL helper. Compatible with vault browser
 * credential fill. Does not log the password, hash, or SQL. Does not generate
 * a password. Does not call Cloudflare. Uses better-auth hashPassword (node
 * scrypt), the same verifier as the Worker. hashPassword does not use
 * BETTER_AUTH_SECRET.
 *
 *   node scripts/provision-admin-local.mjs
 *   open http://127.0.0.1:8789/
 *
 * If ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are already in this process
 * environment, no listener is started. SQL is written to stdout only.
 *
 * Standalone copy (no repo checkout): artifacts/kaiyue-provision-admin-local.zip
 */
import { hashPassword } from "../apps/web/node_modules/better-auth/dist/crypto/index.mjs";
import {
  seedEnvPresent,
  seedPasswordMin,
  sqlFromSeedEnv,
} from "./lib/provision-admin-from-env.mjs";
import { createProvisionServer, listenProvisionServer } from "./lib/provision-admin-server.mjs";

if (seedEnvPresent()) {
  try {
    const sql = await sqlFromSeedEnv({ hashPassword });
    process.stdout.write(sql);
  } catch (error) {
    const code = error && error.code;
    if (code === "MISSING_EMAIL" || code === "PASSWORD_TOO_SHORT") {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    process.stderr.write("Hash failed.\n");
    process.exit(1);
  }
} else {
  const HOST = "127.0.0.1";
  const PORT = Number(process.env.ADMIN_PROVISION_PORT || 8789);
  const minPassword = seedPasswordMin();
  const server = createProvisionServer({
    hashPassword,
    port: PORT,
    host: HOST,
    minPassword,
  });
  const { port } = await listenProvisionServer(server, { port: PORT, host: HOST });
  process.stdout.write(
    `Loopback admin hash form: http://${HOST}:${port}/\nFill from the vault browser extension. SQL downloads; nothing is logged.\nOr set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in this process to hash without a listener.\nStop with Ctrl+C.\n`,
  );
}
