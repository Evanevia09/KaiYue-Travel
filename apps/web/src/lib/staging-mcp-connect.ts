import {
  STAGING_MCP_FAILURES,
  STAGING_MCP_TOKEN_SECONDS,
  STAGING_MCP_USER_AGENT,
} from "@kaiyue/agent-tools/client";

export const STAGING_ADMIN_ORIGIN = "https://admin-staging.kaiyuemacau.com";
export const STAGING_MCP_ENDPOINT = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp`;
export const STAGING_MCP_SESSION = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp-session`;

export const stagingMcpAuthInstructions = [
  "Existing staff or super_admin email and password. There is no API-key system.",
  "Browser vaults (including Grok Bot Vault) fill browser fields only and cannot inject credentials into HTTP APIs.",
  "Map a secure secret field to environment password and email, then POST JSON { email, password } to the session URL.",
  "A secure in-chat form is also valid. Do not visit /login or /admin/agent-connect, and do not put passwords in URLs.",
  `Identify the client honestly with User-Agent ${STAGING_MCP_USER_AGENT} (or ClientName/version). Do not impersonate a browser.`,
  `Use the returned token as the Streamable HTTP bearer token for ${STAGING_MCP_TOKEN_SECONDS} seconds.`,
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
