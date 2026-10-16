import { defineMiddleware } from "astro:middleware";
import { AppError, createRequestId } from "@kaiyue/contracts";
import { localizeHtml } from "./lib/i18n-html.ts";
import { localeFromPath, localeTags, stripLocale } from "./lib/i18n.ts";
import {
  assertLiveAdminSurface,
  forbiddenResponse,
  isProtectedAdminPath,
} from "./lib/server/admin-gate.ts";
import { requireAdmin } from "./lib/server/auth.ts";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = createRequestId();
  if (isProtectedAdminPath(context.url.pathname) && !context.url.pathname.startsWith("/api/")) {
    try {
      // Static pages are prerendered in Node, where the Worker-only module is unavailable.
      const { env } = await import("cloudflare:workers");
      assertLiveAdminSurface(env, context.url.pathname, context.request);
      if (context.url.pathname === "/login" || context.url.pathname === "/setup-admin") {
        return next();
      }
      await requireAdmin(context.request, env);
    } catch (error) {
      if (error instanceof AppError && (error.code === "FORBIDDEN" || error.status === 403)) {
        return forbiddenResponse(error.message);
      }
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
  const pagePath = stripLocale(context.url.pathname).replace(/\/$/, "") || "/";
  if (pagePath === "/special-offers" || pagePath.startsWith("/special-offers/")) {
    response.headers.set("cache-control", "private, no-store, no-cache, must-revalidate");
    response.headers.set("cdn-cache-control", "no-store");
    response.headers.set("cloudflare-cdn-cache-control", "no-store");
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
