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
            "Short-lived bearer token. Ask the staff user to sign in at the admin website and generate the token in their browser.",
          signIn: `${adminOrigin}/login`,
          setup: `${adminOrigin}/admin/agent-connect`,
        }
      : null,
  });
};
