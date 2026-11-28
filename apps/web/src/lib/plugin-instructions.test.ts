import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { STAGING_MCP_USER_AGENT } from "@kaiyue/agent-tools/client";
import { GET as pluginCapabilitiesGet } from "../pages/plugin/capabilities.json.ts";
import { GET as pluginIndexGet } from "../pages/plugin/index.ts";
import { GET as pluginTxtGet } from "../pages/plugin.txt.ts";
import {
  includeInPublicSitemap,
  isPluginPublicPath,
  isStagingPluginSite,
  pluginCapabilities,
  pluginInstructionText,
  pluginTextResponse,
} from "./plugin-instructions.ts";

const stagingSite = new URL("https://staging.kaiyuemacau.com/");
const productionSite = new URL("https://kaiyuemacau.com/");

describe("plugin public instructions", () => {
  it("serves plaintext with noindex headers and no HTML", async () => {
    const response = pluginTextResponse(stagingSite);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
    expect(response.headers.get("link")).toContain("/plugin.txt");
    const body = await response.text();
    expect(body).not.toMatch(/<\s*html/i);
    expect(body).toContain(STAGING_MCP_USER_AGENT);
    expect(body).toContain("Do not impersonate a browser");
    expect(body).toContain("error 1010");
    expect(body).toContain("cannot inject credentials into HTTP APIs");
    expect(body).toContain("not in the public plugin catalog");
    expect(body).toContain("no refresh hook on a static header");
    expect(body).toContain("Write a small helper on the bot's own computer");
    expect(body).toContain("Add a custom connector as a local command");
    expect(body).toContain("Content-Length (LSP-style) and line-delimited JSON");
    expect(body).toContain("about 60 seconds");
    expect(body).toContain("Never log the password or token");
    expect(body).toContain("Refresh it before it expires");
    expect(body).toContain("designated test inbox");
    expect(body).toMatch(/1800 seconds/);
    expect(body).toMatch(/do not wait for a browser review ticket/i);
    expect(body).not.toMatch(/Write tools still need/);
    expect(body).not.toMatch(/staff@|password=/i);
  });

  it("omits staging connection details off the staging marketing host", () => {
    const body = pluginInstructionText({ staging: false });
    expect(body).toContain("Connection details are published only on staging.kaiyuemacau.com.");
    expect(body).not.toContain("/api/v1/admin/mcp-session");
    expect(isStagingPluginSite(productionSite)).toBe(false);
    expect(pluginCapabilities(productionSite).connection).toBeNull();
  });

  it("keeps capabilities JSON consistent with the plaintext instructions", () => {
    const connection = pluginCapabilities(stagingSite).connection;
    expect(connection?.userAgent).toBe(STAGING_MCP_USER_AGENT);
    expect(connection?.tokenLifetimeSeconds).toBe(1800);
    expect(connection?.session).toContain("/api/v1/admin/mcp-session");
    expect(connection?.authentication).toMatch(/cannot inject credentials/i);
    expect(connection?.authentication).toMatch(/do not wait for a browser review ticket/i);
    expect(connection?.writeApproval).toBe("none");
    expect(connection?.failures.browserIntegrity).toMatch(/1010/);
  });

  it("excludes plugin paths from the public sitemap and robots", () => {
    expect(includeInPublicSitemap("https://staging.kaiyuemacau.com/plugin")).toBe(false);
    expect(includeInPublicSitemap("https://staging.kaiyuemacau.com/plugin.txt")).toBe(false);
    expect(includeInPublicSitemap("https://staging.kaiyuemacau.com/")).toBe(true);
    expect(isPluginPublicPath("/plugin")).toBe(true);
    expect(isPluginPublicPath("/plugin/")).toBe(true);
    expect(isPluginPublicPath("/plugin.txt")).toBe(true);
    expect(isPluginPublicPath("/plugin/capabilities.json")).toBe(true);
    expect(isPluginPublicPath("/about")).toBe(false);
    const robots = readFileSync(
      fileURLToPath(new URL("../../public/robots.txt", import.meta.url)),
      "utf8",
    );
    expect(robots).toMatch(/^Disallow: \/plugin$/m);
    const astroConfig = readFileSync(
      fileURLToPath(new URL("../../astro.config.mjs", import.meta.url)),
      "utf8",
    );
    expect(astroConfig).toContain('!page.includes("/plugin")');
  });

  it("wires /plugin and /plugin.txt through the same GET contract", async () => {
    const index = await pluginIndexGet({ site: stagingSite } as never);
    const txt = await pluginTxtGet({ site: stagingSite } as never);
    const capabilities = await pluginCapabilitiesGet({ site: stagingSite } as never);
    expect(index.headers.get("content-type")).toContain("text/plain");
    expect(txt.headers.get("content-type")).toContain("text/plain");
    expect(await index.text()).toBe(await txt.text());
    expect(capabilities.headers.get("x-robots-tag")).toContain("noindex");
    const json = (await capabilities.json()) as {
      connection: { userAgent: string; writeApproval: string };
    };
    expect(json.connection.userAgent).toBe(STAGING_MCP_USER_AGENT);
    expect(json.connection.writeApproval).toBe("none");
  });
});
