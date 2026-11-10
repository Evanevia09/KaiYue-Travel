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
 * Standalone copy (no repo checkout): artifacts/kaiyue-provision-admin-local.zip
 */
import { hashPassword } from "../apps/web/node_modules/better-auth/dist/crypto/index.mjs";
import { createProvisionServer, listenProvisionServer } from "./lib/provision-admin-server.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.ADMIN_PROVISION_PORT || 8789);
const server = createProvisionServer({ hashPassword, port: PORT, host: HOST });
const { port } = await listenProvisionServer(server, { port: PORT, host: HOST });
process.stdout.write(
  `Loopback admin hash form: http://${HOST}:${port}/\nFill from the vault browser extension. SQL downloads; nothing is logged.\nStop with Ctrl+C.\n`,
);
