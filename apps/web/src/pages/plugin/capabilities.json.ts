import type { APIRoute } from "astro";
import { PLUGIN_ROBOTS_TAG, pluginCapabilities } from "../../lib/plugin-instructions.ts";

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  return Response.json(pluginCapabilities(site), {
    headers: {
      "x-robots-tag": PLUGIN_ROBOTS_TAG,
      "cache-control": "public, max-age=300",
    },
  });
};
