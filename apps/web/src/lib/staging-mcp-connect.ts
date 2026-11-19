export const STAGING_ADMIN_ORIGIN = "https://admin-staging.kaiyuemacau.com";
export const STAGING_MCP_ENDPOINT = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp`;
export const STAGING_MCP_SESSION = `${STAGING_ADMIN_ORIGIN}/api/v1/admin/mcp-session`;

export const stagingMcpAuthInstructions =
  "Existing staff email and password. Use a login already saved in the agent vault, or collect email and password in a secure in-chat form. POST JSON { email, password } to the session URL. Do not visit the admin sign-in page or Connect a staging agent, and do not put passwords in URLs. Use the returned token as the Streamable HTTP bearer token. The connected agent keeps that staff or super_admin account's normal permissions. Write tools still need browser approval.";

export function stagingMcpConnection() {
  return {
    transport: "streamable-http",
    endpoint: STAGING_MCP_ENDPOINT,
    session: STAGING_MCP_SESSION,
    authentication: stagingMcpAuthInstructions,
  };
}
