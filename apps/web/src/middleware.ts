import { defineMiddleware } from "astro:middleware";
import { createRequestId } from "@kaiyue/contracts";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = createRequestId();
  const response = await next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (context.url.pathname.startsWith("/admin")) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
    response.headers.set("cache-control", "no-store");
  }
  if (!import.meta.env.DEV) {
    return response;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }
  const html = await response.text();
  const rewritten = html.replaceAll(
    "/node_modules/.vite/deps_prerender/",
    "/node_modules/.vite/deps/",
  );
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
