import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const site = process.env.PUBLIC_SITE_URL ?? "http://localhost:4321";

export default defineConfig({
  site,
  output: "static",
  session: false,
  adapter: cloudflare({
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes("/admin") && !page.includes("/booking/confirmation"),
    }),
  ],
  security: {
    checkOrigin: true,
  },
});
