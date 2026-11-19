import type { APIRoute } from "astro";
import { pluginTextResponse } from "../lib/plugin-instructions.ts";

export const prerender = false;

export const GET: APIRoute = ({ site }) => pluginTextResponse(site);
