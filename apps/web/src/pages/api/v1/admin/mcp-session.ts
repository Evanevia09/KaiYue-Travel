import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { handleMcpSession } from "../../../../lib/server/mcp-access.ts";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return handleMcpSession(request, env);
};
