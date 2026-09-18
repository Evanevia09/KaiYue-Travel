import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const site = process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";

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
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    ssr: {
      resolve: {
        dedupe: ["react", "react-dom"],
      },
      optimizeDeps: {
        include: [
          "react",
          "react-dom",
          "react-dom/client",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
        ],
      },
    },
    optimizeDeps: {
      // Cloudflare workerd reloads when Vite discovers this passthrough image
      // service mid-request, then crashes on a stale deps_ssr chunk.
      // Hold the first request until the crawl finishes so booking islands do
      // not hydrate while React and @kaiyue/contracts are still being bundled.
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
