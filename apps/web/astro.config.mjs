import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const site = process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";

/**
 * Everything a booking island — or the API route that shares its package — can
 * import. These must be pre-bundled in the FIRST optimization pass, for every
 * environment. Otherwise Vite discovers them lazily mid-request, re-runs the
 * optimizer, and flips the `?v=` hash on every optimized dependency URL.
 * workerd's module runner caches evaluated modules by that URL, so the
 * already-evaluated React renderer keeps the old React while freshly evaluated
 * modules load the new one: two live React instances, a null hook dispatcher,
 * and an island that renders nothing — the booking widget disappearing.
 * `@cloudflare/vite-plugin` sets `ignoreOutdatedRequests` on the worker
 * environment, which suppresses Vite's normal stale-dependency retry, so the
 * dev session stays wedged until the server is restarted.
 *
 * Upstream context: withastro/astro#17364. `@astrojs/cloudflare` 14.3.2
 * pre-bundles the renderer server entrypoints and this project's console logger
 * for the same reason; the entries below also cover the dependencies only this
 * project can know about (`resend` was optimized lazily on the first booking
 * POST before it was listed here).
 */
const SERVER_OPTIMIZE_DEPS = [
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@astrojs/react/client.js",
  "@kaiyue/contracts",
  "resend",
  "astro/logger/console",
  "astro/assets/services/noop",
];

/**
 * Under `@astrojs/cloudflare` the workerd/SSR graph is its own Vite
 * environment, and `vite.ssr.optimizeDeps` never reaches it — `configEnvironment`
 * is the only hook that can configure that environment's optimizer.
 */
function optimizeServerDeps() {
  return {
    name: "kaiyue-optimize-server-deps",
    configEnvironment(name) {
      if (name === "client") return undefined;
      return { optimizeDeps: { include: SERVER_OPTIMIZE_DEPS } };
    },
  };
}

export default defineConfig({
  site,
  output: "static",
  session: false,
  redirects: {
    "/services": "/services/airport-transfer",
  },
  adapter: cloudflare({
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/booking/confirmation") &&
        !page.includes("/login"),
    }),
  ],
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [optimizeServerDeps()],
    resolve: {
      dedupe: ["react", "react-dom"],
      // Note: do NOT alias `react-dom/server` to `react-dom/server.edge` here.
      // Under Astro 7 / Vite 8 the adapter already resolves the workerd build,
      // and forcing the subpath makes workerd evaluate that CommonJS file
      // directly ("require is not defined"), which kills `astro dev` at boot.
    },
    optimizeDeps: {
      // Hold the first request until the crawl finishes, so islands never
      // hydrate while React and @kaiyue/contracts are still being bundled.
      holdUntilCrawlEnd: true,
      include: [
        "astro/assets/services/noop",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@astrojs/react/client.js",
        "@kaiyue/contracts",
      ],
    },
  },
});
