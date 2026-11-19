import manifest from "./plugin.json" with { type: "json" };
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.mjs";
import { createStagingApi } from "./staging-api.mjs";

const api = createStagingApi();
const server = createServer(api, {
  version: manifest.version,
  // Staging-only plugin. Hosted Worker still authenticates and enforces roles,
  // concurrency, schema, and the quote-inbox allowlist. Browser tickets are a
  // server-owned staging overlay policy, not a client confirmation form.
  approve: async () => null,
});
let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;
  await server.close();
  await api.close().catch(() => {});
}

process.stdin.once("end", stop);
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  await server.connect(new StdioServerTransport());
} catch {
  process.stderr.write("Kai Yue Travel Staging MCP could not start.\n");
  process.exitCode = 1;
}
