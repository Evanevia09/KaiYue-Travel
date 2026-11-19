import guide from "@kaiyue/agent-tools/guide";
import {
  STAGING_MCP_FAILURES,
  STAGING_MCP_TOKEN_SECONDS,
  STAGING_MCP_USER_AGENT,
} from "@kaiyue/agent-tools/client";
import {
  STAGING_MCP_ENDPOINT,
  STAGING_MCP_SESSION,
  stagingMcpConnection,
} from "./staging-mcp-connect.ts";

export const PLUGIN_ROBOTS_TAG = "noindex, nofollow, noarchive";
export const STAGING_PLUGIN_HOST = "staging.kaiyuemacau.com";
export const STAGING_PLUGIN_URL = `https://${STAGING_PLUGIN_HOST}/plugin`;
export const STAGING_PLUGIN_TXT_URL = `https://${STAGING_PLUGIN_HOST}/plugin.txt`;

export function isStagingPluginSite(site?: URL | null): boolean {
  return site?.hostname === STAGING_PLUGIN_HOST;
}

export function isPluginPublicPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/plugin" || path === "/plugin.txt" || path.startsWith("/plugin/");
}

export function includeInPublicSitemap(page: string): boolean {
  return (
    !page.includes("/admin") &&
    !page.includes("/booking/confirmation") &&
    !page.includes("/login") &&
    !page.includes("/plugin")
  );
}

export function pluginInstructionHeaders(canonicalPath = "/plugin.txt"): Headers {
  return new Headers({
    "content-type": "text/plain; charset=utf-8",
    "x-robots-tag": PLUGIN_ROBOTS_TAG,
    "cache-control": "public, max-age=300",
    "x-content-type-options": "nosniff",
    link: `<${canonicalPath}>; rel="canonical"`,
  });
}

export function pluginInstructionText(options: { staging: boolean }): string {
  const lines = [
    "Kai Yue Travel agent tools",
    "",
    "This file is public machine-readable instructions. It is not an access-control",
    "boundary and does not restrict readers to AI agents. Anyone can fetch it.",
    "Staff data stays behind authenticated APIs.",
    "",
    "JSON capability list: /plugin/capabilities.json",
    `Canonical text: ${options.staging ? STAGING_PLUGIN_TXT_URL : "/plugin.txt"}`,
    "",
    ...guide.instructions,
    "",
    "Tools",
  ];
  for (const tool of guide.tools) {
    lines.push(`- ${tool.name}: ${tool.description}`);
  }
  if (options.staging) {
    lines.push(
      "",
      "Connect on staging",
      "- No API keys. Use an existing staff or super_admin email and password.",
      "- Browser vaults (including Grok Bot Vault) fill browser fields only. They cannot inject credentials into HTTP APIs.",
      '- Map a secure secret field to environment password and email, then POST JSON {"email","password"} to',
      `  ${STAGING_MCP_SESSION}`,
      "- Do not visit /login or /admin/agent-connect. Do not put passwords in URLs.",
      `- Identify this application honestly. Send User-Agent: ${STAGING_MCP_USER_AGENT} (or ClientName/version). Do not impersonate a browser.`,
      `- The response token lasts ${STAGING_MCP_TOKEN_SECONDS} seconds. Send it as Authorization: Bearer on Streamable HTTP`,
      `  ${STAGING_MCP_ENDPOINT}`,
      "- The connected agent keeps that account's normal permissions. Disabled or unprovisioned accounts fail closed.",
      "- Production hosts do not offer this path. Write tools still need the same staff user to approve the exact change in the browser.",
      "",
      "Failures — stop; do not brute-retry",
      `- ${STAGING_MCP_FAILURES.unauthorized}`,
      `- ${STAGING_MCP_FAILURES.lockout}`,
      `- ${STAGING_MCP_FAILURES.browserIntegrity}`,
    );
  } else {
    lines.push("", "Connection details are published only on staging.kaiyuemacau.com.");
  }
  return `${lines.join("\n")}\n`;
}

export function pluginTextResponse(site?: URL | null): Response {
  return new Response(pluginInstructionText({ staging: isStagingPluginSite(site) }), {
    status: 200,
    headers: pluginInstructionHeaders(),
  });
}

export function pluginCapabilities(site?: URL | null) {
  return {
    ...guide,
    connection: isStagingPluginSite(site) ? stagingMcpConnection() : null,
  };
}
