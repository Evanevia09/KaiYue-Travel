import { mcpLoginReturn } from "./lib/server/mcp-oauth-metadata.ts";
import { defineMiddleware } from "astro:middleware";
import { AppError, createRequestId } from "@kaiyue/contracts";
import { localizeHtml } from "./lib/i18n-html.ts";
import { localeFromPath, localeTags, stripLocale } from "./lib/i18n.ts";
import {
  accessConfigured,
  applyHostIsolationHeaders,
  assertLiveAdminSurface,
  dedicatedAdminPathAction,
  forbiddenResponse,
  isDedicatedAdminHostname,
  isDedicatedAdminPassthroughPath,
  isProtectedAdminPath,
} from "./lib/server/admin-gate.ts";
import { requireAdmin } from "./lib/server/auth.ts";
import type { AppEnv } from "./lib/server/env.ts";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

function finishResponse(
  response: Response,
  options: { dedicatedAdmin: boolean; pathname: string },
): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (key !== "referrer-policy" || !headers.has(key)) headers.set(key, value);
  }
  applyHostIsolationHeaders(headers, {
    dedicatedAdmin: options.dedicatedAdmin,
    contentType: headers.get("content-type"),
  });
  if (options.pathname.startsWith("/admin")) {
    headers.set("x-robots-tag", "noindex, nofollow");
    headers.set("cache-control", "no-store");
  }
  const pagePath = stripLocale(options.pathname).replace(/\/$/, "") || "/";
  if (pagePath === "/special-offers" || pagePath.startsWith("/special-offers/")) {
    headers.set("cache-control", "private, no-store, no-cache, must-revalidate");
    headers.set("cdn-cache-control", "no-store");
    headers.set("cloudflare-cdn-cache-control", "no-store");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.requestId = createRequestId();
  const dedicatedAdmin = isDedicatedAdminHostname(context.url.hostname);

  if (dedicatedAdmin && !isDedicatedAdminPassthroughPath(context.url.pathname)) {
    let workerEnv: AppEnv | undefined;
    try {
      const { env } = await import("cloudflare:workers");
      workerEnv = env;
    } catch {
      return finishResponse(forbiddenResponse(), {
        dedicatedAdmin: true,
        pathname: context.url.pathname,
      });
    }
    const action = dedicatedAdminPathAction(workerEnv, context.url.pathname);
    switch (action) {
      case "pass":
        break;
      case "redirect-login":
        return finishResponse(context.redirect("/login", 302), {
          dedicatedAdmin: true,
          pathname: context.url.pathname,
        });
      case "redirect-admin":
        return finishResponse(context.redirect("/admin", 302), {
          dedicatedAdmin: true,
          pathname: context.url.pathname,
        });
      case "forbid":
        return finishResponse(forbiddenResponse(), {
          dedicatedAdmin: true,
          pathname: context.url.pathname,
        });
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }

  if (isProtectedAdminPath(context.url.pathname) && !context.url.pathname.startsWith("/api/")) {
    let workerEnv: AppEnv | undefined;
    try {
      // Static pages are prerendered in Node, where the Worker-only module is unavailable.
      const { env } = await import("cloudflare:workers");
      workerEnv = env;
      assertLiveAdminSurface(env, context.url.pathname, context.request);
      if (context.url.pathname !== "/login" && context.url.pathname !== "/setup-admin") {
        await requireAdmin(context.request, env);
      }
    } catch (error) {
      if (error instanceof AppError && (error.code === "FORBIDDEN" || error.status === 403)) {
        return finishResponse(forbiddenResponse(error.message), {
          dedicatedAdmin,
          pathname: context.url.pathname,
        });
      }
      if (dedicatedAdmin && (!workerEnv || accessConfigured(workerEnv))) {
        return finishResponse(forbiddenResponse("Admin authentication is required."), {
          dedicatedAdmin: true,
          pathname: context.url.pathname,
        });
      }
      const returnPath = mcpLoginReturn(context.url.pathname + context.url.search);
      const loginPath =
        returnPath && dedicatedAdmin
          ? "/login?" + new URLSearchParams({ next: returnPath })
          : "/login";
      return finishResponse(context.redirect(loginPath, 302), {
        dedicatedAdmin,
        pathname: context.url.pathname,
      });
    }
  }

  const response = await next();
  const locale = localeFromPath(context.url.pathname);
  const headed = finishResponse(response, {
    dedicatedAdmin,
    pathname: context.url.pathname,
  });
  if (locale !== "en") {
    headed.headers.set("content-language", localeTags[locale]);
  }
  if (!import.meta.env.DEV && locale === "en") {
    return headed;
  }
  const contentType = headed.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return headed;
  }
  const html = await headed.text();
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
  const headers = new Headers(headed.headers);
  headers.delete("content-length");
  return new Response(rewritten, {
    status: headed.status,
    statusText: headed.statusText,
    headers,
  });
});
