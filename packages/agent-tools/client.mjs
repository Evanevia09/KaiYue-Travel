/** Honest application identity for staging MCP HTTP. Do not impersonate a browser. */
export const STAGING_MCP_USER_AGENT = "KaiYue-staging-mcp/1.0";
export const STAGING_MCP_TOKEN_SECONDS = 1800;

export const STAGING_MCP_FAILURES = {
  unauthorized:
    "401: staff email or password was not accepted. Wrong, unknown, disabled, and unprovisioned accounts share this response. Stop. Three failures lock the account and source IP for five minutes.",
  lockout:
    "429: too many sign-in attempts. Wait the Retry-After interval (five minutes). Do not retry during the lock.",
  browserIntegrity:
    "403 with Cloudflare error 1010 (Browser Integrity Check): the edge blocked this client before the Worker. Stop. Contact the owner. Do not retry the password. Do not impersonate a browser User-Agent.",
};
