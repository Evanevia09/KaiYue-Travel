import { defineMiddleware } from "astro:middleware";
import { createRequestId } from "@kaiyue/contracts";
import { localizeHtml } from "./lib/i18n-html.ts";
import { localeFromPath, localeTags } from "./lib/i18n.ts";
import { requireAdmin } from "./lib/server/auth.ts";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = createRequestId();
  if (context.url.pathname === "/admin" || context.url.pathname.startsWith("/admin/")) {
    try {
      // Static pages are prerendered in Node, where the Worker-only module is unavailable.
      const { env } = await import("cloudflare:workers");
      await requireAdmin(context.request, env);
    } catch {
      return context.redirect("/login", 302);
    }
  }
  const response = await next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (context.url.pathname.startsWith("/admin")) {
    response.headers.set("x-robots-tag", "noindex, nofollow");
    response.headers.set("cache-control", "no-store");
  }
  const locale = localeFromPath(context.url.pathname);
  if (locale !== "en") {
    response.headers.set("content-language", localeTags[locale]);
  }
  if (!import.meta.env.DEV && locale === "en") {
    return response;
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }
  const html = await response.text();
  const localized = localizeHtml(html, locale);
  const rewritten = import.meta.env.DEV
    ? localized
        // Astro emits the prerender optimizer's version for this URL. Point
        // islands at Vite's uncached client entry so a stale ?v= cannot pin
        // the React renderer to a different optimization pass.
        .replace(
          /renderer-url="\/node_modules\/\.vite\/deps_prerender\/@astrojs_react_client__js\.js\?v=[^"]+"/g,
          'renderer-url="/@id/@astrojs/react/client.js"',
        )
        .replaceAll("/node_modules/.vite/deps_prerender/", "/node_modules/.vite/deps/")
    : localized;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(rewritten, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
