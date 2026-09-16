import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { handleApi } from "../../../lib/server/router.ts";

export const prerender = false;

export const ALL: APIRoute = async ({ request, locals }) => {
  return handleApi(request, env, locals.requestId);
};
