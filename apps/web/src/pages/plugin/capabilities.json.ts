import type { APIRoute } from "astro";
import guide from "@kaiyue/agent-tools/guide";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const staging = site?.hostname === "staging.kaiyuemacau.com";
  const adminOrigin = "https://admin-staging.kaiyuemacau.com";
  return Response.json({
    ...guide,
    connection: staging
      ? {
          transport: "streamable-http",
          endpoint: `${adminOrigin}/api/v1/admin/mcp`,
          authentication:
            "OAuth 2.0 with PKCE and automatic refresh. Ask the staff user to follow the MCP client browser sign-in and consent. Manual bearer tokens are also supported.",
          signIn: `${adminOrigin}/login`,
          manualTokenSetup: `${adminOrigin}/admin/agent-connect`,
        }
      : null,
  });
};
