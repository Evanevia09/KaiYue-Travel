import type { APIRoute } from "astro";
import guide from "@kaiyue/agent-tools/guide";
import { stagingMcpConnection } from "../../lib/staging-mcp-connect.ts";

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const staging = site?.hostname === "staging.kaiyuemacau.com";
  return Response.json({
    ...guide,
    connection: staging ? stagingMcpConnection() : null,
  });
};
