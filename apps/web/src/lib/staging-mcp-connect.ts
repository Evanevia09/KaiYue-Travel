import {
  STAGING_MCP_FAILURES,
  STAGING_MCP_TOKEN_SECONDS,
  STAGING_MCP_USER_AGENT,
} from "@kaiyue/agent-tools/client";

export const STAGING_ADMIN_ORIGIN = "https://admin-staging.kaiyuemacau.com";
export const STAGING_MCP_ENDPOINT = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp`;
export const STAGING_MCP_SESSION = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp-session`;

export const stagingMcpAuthInstructions = [
  "This is not in the public plugin catalog. Do not search the catalog expecting a Kai Yue listing.",
  "Do not add a remote URL with a pasted access token. Tokens expire and there is no refresh hook on a static header.",
  "Existing staff or super_admin email and password. There is no API-key system.",
  "Browser vaults (including Grok Bot Vault) fill browser fields only and cannot inject credentials into HTTP APIs.",
  "Write a small helper on the bot's own computer. Map email and password to environment variables through a secure form, then POST JSON { email, password } to the session URL.",
  "A secure in-chat form is also valid. Do not visit /login or /admin/agent-connect, and do not put passwords in URLs. Never log the password or token.",
  `Identify the client honestly with User-Agent ${STAGING_MCP_USER_AGENT} (or ClientName/version). Do not impersonate a browser.`,
  `Use the returned token as the Streamable HTTP bearer token for ${STAGING_MCP_TOKEN_SECONDS} seconds. Refresh it before it expires.`,
  "Add a custom connector as a local command that runs that helper with those environment variables, not as a remote URL.",
  "Support both Content-Length (LSP-style) and line-delimited JSON. A format mismatch can make the first connect time out after about 60 seconds. Fix the handshake and reload. Do not keep retrying the password.",
  "The connected agent keeps that account's normal permissions. On this staging Worker, write tools run immediately and do not wait for a browser review ticket.",
].join(" ");

export function stagingMcpConnection() {
  return {
    transport: "streamable-http" as const,
    endpoint: STAGING_MCP_ENDPOINT,
    session: STAGING_MCP_SESSION,
    userAgent: STAGING_MCP_USER_AGENT,
    tokenLifetimeSeconds: STAGING_MCP_TOKEN_SECONDS,
    authentication: stagingMcpAuthInstructions,
    writeApproval: "none" as const,
    failures: STAGING_MCP_FAILURES,
  };
}
