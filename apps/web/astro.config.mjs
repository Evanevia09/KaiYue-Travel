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
        !page.includes("/admin") && !page.includes("/booking/confirmation") && !page.includes("/login"),
    }),
  ],
  security: {
    checkOrigin: true,
  },
  vite: {
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      // Cloudflare workerd reloads when Vite discovers this passthrough image
      // service mid-request, then crashes on a stale deps_ssr chunk.
      include: [
        "astro/assets/services/noop",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@kaiyue/contracts",
      ],
    },
    server: {
      warmup: {
        clientFiles: ["./src/components/booking/**/*.tsx"],
      },
    },
  },
});
