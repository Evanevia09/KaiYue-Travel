import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  STAGING_ADMIN_HOST,
  STAGING_MARKETING_HOST,
} from "../../apps/web/src/lib/server/admin-gate.ts";
import { createWorkerFetch } from "../../apps/web/src/lib/server/worker-entry.ts";
import {
  isWrappedEntry,
  wrapWorkerEntry,
  wrapperSource,
} from "../../apps/web/scripts/wrap-worker-entry.mjs";

const require = createRequire(import.meta.url);
const adapterHandler = readFileSync(require.resolve("@astrojs/cloudflare/handler"), "utf8");
const webPackage = JSON.parse(
  readFileSync(new URL("../../apps/web/package.json", import.meta.url), "utf8"),
) as { scripts: { build: string } };
const wrapScript = readFileSync(
  new URL("../../apps/web/scripts/wrap-worker-entry.mjs", import.meta.url),
  "utf8",
);

const MARKETING_HTML = "<html><body>Private chauffeur across the Greater Bay Area</body></html>";
const LOGIN_HTML = "<html><body>Admin sign in</body></html>";
const ASTRO_ASSET = "export default 1;";
const FAVICON = "favicon-bytes";

type AssetMap = Record<string, string>;

function createAssets(files: AssetMap) {
  return {
    async fetch(requestUrl: string) {
      const pathname = new URL(requestUrl, "https://assets.local").pathname || "/";
      const body = files[pathname];
      if (body === undefined) {
        return new Response("not found", { status: 404 });
      }
      const type = pathname.startsWith("/_astro/")
        ? "text/javascript"
        : pathname === "/favicon.ico"
          ? "image/x-icon"
          : "text/html; charset=utf-8";
      return new Response(body, { status: 200, headers: { "content-type": type } });
    },
  };
}

function matchStaticAsset(
  manifest: { assets: Set<string> },
  requestUrl: string,
  env: { ASSETS: { fetch: (url: string) => Promise<Response> } },
) {
  const { pathname } = new URL(requestUrl);
  if (manifest.assets.has(pathname)) {
    return env.ASSETS.fetch(requestUrl.replace(/\.html$/, ""));
  }
  return undefined;
}

async function fallbackToAssets(
  requestUrl: string,
  env: { ASSETS: { fetch: (url: string) => Promise<Response> } },
) {
  const asset = await env.ASSETS.fetch(
    requestUrl.replace(/index.html$/, "").replace(/\.html$/, ""),
  );
  if (asset.status !== 404) {
    return asset;
  }
  return undefined;
}

function createAdapterFetch(options: {
  assets: AssetMap;
  manifestAssets?: string[];
  routes?: string[];
}) {
  const manifest = { assets: new Set(options.manifestAssets ?? []) };
  const routes = new Set(options.routes ?? ["/login"]);
  const envAssets = createAssets(options.assets);
  return async (request: Request) => {
    const staticAsset = matchStaticAsset(manifest, request.url, { ASSETS: envAssets });
    if (staticAsset) {
      return staticAsset;
    }
    const pathname = new URL(request.url).pathname;
    const routeData = routes.has(pathname) ? {} : undefined;
    if (!routeData) {
      const asset = await fallbackToAssets(request.url, { ASSETS: envAssets });
      if (asset) {
        return asset;
      }
    }
    if (pathname === "/login") {
      return new Response(LOGIN_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("middleware", { status: 200 });
  };
}

const marketingFiles: AssetMap = {
  "/": MARKETING_HTML,
  "/index.html": MARKETING_HTML,
  "/_astro/entry.js": ASTRO_ASSET,
  "/favicon.ico": FAVICON,
};

const stagingEnv = {
  ENVIRONMENT: "production",
  ACCESS_TEAM_DOMAIN: "",
  ACCESS_AUD: "",
};

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("astro cloudflare adapter dispatch", () => {
  it("still fetches prerendered assets before app.render/middleware", () => {
    const matchIndex = adapterHandler.indexOf("matchStaticAsset(app.manifest, request.url, env)");
    const fallbackIndex = adapterHandler.indexOf("fallbackToAssets(request.url, env)");
    const renderIndex = adapterHandler.indexOf("app.render(request");
    expect(matchIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(matchIndex);
    expect(renderIndex).toBeGreaterThan(fallbackIndex);
    expect(adapterHandler).not.toContain("createWorkerFetch");
    expect(webPackage.scripts.build).toContain("wrap-worker-entry.mjs");
    expect(wrapScript).toContain("createWorkerFetch");
    expect(isWrappedEntry(wrapperSource())).toBe(true);
  });
});

describe("dedicated-admin Worker entry before asset fallback", () => {
  it("serves marketing HTML from ASSETS for admin / and /index.html without the wrap", async () => {
    const adapterFetch = createAdapterFetch({ assets: marketingFiles });
    const root = await adapterFetch(new Request(`https://${STAGING_ADMIN_HOST}/`));
    const index = await adapterFetch(new Request(`https://${STAGING_ADMIN_HOST}/index.html`));
    expect(root.status).toBe(200);
    expect(await root.text()).toBe(MARKETING_HTML);
    expect(index.status).toBe(200);
    expect(await index.text()).toBe(MARKETING_HTML);
  });

  it("redirects admin / and /index.html to /login before the adapter can return marketing", async () => {
    const fetch = createWorkerFetch(createAdapterFetch({ assets: marketingFiles }));
    for (const path of ["/", "/index.html"]) {
      const response = await fetch(
        new Request(`https://${STAGING_ADMIN_HOST}${path}`),
        stagingEnv,
        {},
      );
      expect(response.status, path).toBe(302);
      expect(response.headers.get("location"), path).toBe("/login");
      expect(response.headers.get("cache-control"), path).toMatch(/no-store/);
      expect(await response.text(), path).not.toMatch(/private chauffeur/i);
    }
  });

  it("keeps public marketing HTML and hashed admin assets on the same Worker", async () => {
    const fetch = createWorkerFetch(createAdapterFetch({ assets: marketingFiles }));
    const publicHome = await fetch(
      new Request(`https://${STAGING_MARKETING_HOST}/`),
      stagingEnv,
      {},
    );
    expect(publicHome.status).toBe(200);
    expect(await publicHome.text()).toBe(MARKETING_HTML);

    const hashed = await fetch(
      new Request(`https://${STAGING_ADMIN_HOST}/_astro/entry.js`),
      stagingEnv,
      {},
    );
    expect(hashed.status).toBe(200);
    expect(await hashed.text()).toBe(ASTRO_ASSET);

    const login = await fetch(new Request(`https://${STAGING_ADMIN_HOST}/login`), stagingEnv, {});
    expect(login.status).toBe(200);
    expect(await login.text()).toBe(LOGIN_HTML);
  });

  it("writes the Wrangler entry wrap that calls createWorkerFetch before astro.fetch", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-worker-entry-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, "entry.mjs"),
      "export default { fetch() { return new Response('astro'); } }\n",
    );
    const result = wrapWorkerEntry(dir);
    expect(result.wrapped).toBe(true);
    const wrapped = readFileSync(join(dir, "entry.mjs"), "utf8");
    expect(isWrappedEntry(wrapped)).toBe(true);
    expect(wrapped.indexOf("createWorkerFetch")).toBeLessThan(wrapped.indexOf("astro.fetch"));
    expect(readFileSync(join(dir, "astro-entry.mjs"), "utf8")).toContain("export default");
    expect(wrapWorkerEntry(dir).wrapped).toBe(false);
  });

  it("loads the generated wrap and still gates admin / when marketing index.html is present", async () => {
    const dir = mkdtempSync(join(tmpdir(), "kaiyue-worker-entry-load-"));
    tempDirs.push(dir);
    writeFileSync(
      join(dir, "entry.mjs"),
      `const marketing = ${JSON.stringify(MARKETING_HTML)};
export default {
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/" || pathname === "/index.html") {
      return new Response(marketing, { status: 200, headers: { "content-type": "text/html" } });
    }
    return new Response("pass", { status: 200 });
  }
};
`,
    );
    wrapWorkerEntry(dir, {
      workerEntryImport: new URL("../../apps/web/src/lib/server/worker-entry.ts", import.meta.url)
        .href,
    });
    const wrapped = await import(pathToFileURL(join(dir, "entry.mjs")).href);
    const response = await wrapped.default.fetch(
      new Request(`https://${STAGING_ADMIN_HOST}/index.html`),
      stagingEnv,
      {},
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login");
    expect(await response.text()).not.toMatch(/private chauffeur/i);
    const publicHome = await wrapped.default.fetch(
      new Request(`https://${STAGING_MARKETING_HOST}/`),
      stagingEnv,
      {},
    );
    expect(publicHome.status).toBe(200);
    expect(await publicHome.text()).toBe(MARKETING_HTML);
  });
});
