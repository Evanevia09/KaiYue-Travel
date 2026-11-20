import { describe, expect, it } from "vitest";
import { createTestEnv } from "../../../../../tests/helpers/memory-d1.ts";
import { mcpStagingDirectWritesEnabled, reviewMcpWrite } from "./mcp-access.ts";

const stagingOrigin = "https://admin-staging.kaiyuemacau.com";
const productionOrigin = "https://admin.kaiyuemacau.com";
const secret = "test-only-isolated-d1-secret-0123456789abcdef";

function stagingEnv(
  overrides: Parameters<typeof createTestEnv>[0] = {},
): ReturnType<typeof createTestEnv> {
  return createTestEnv({
    ENVIRONMENT: "production",
    DEV_ADMIN_BYPASS: "false",
    PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    MCP_STAGING_DIRECT_WRITES: "true",
    BETTER_AUTH_SECRET: secret,
    ...overrides,
  });
}

function request(url: string, extra?: { headers?: Record<string, string>; query?: string }) {
  const target = extra?.query ? `${url}${extra.query}` : url;
  return new Request(target, { method: "POST", headers: extra?.headers });
}

describe("staging MCP direct writes policy", () => {
  it("enables writes only for the overlay var on the trusted staging admin host and site", () => {
    const env = stagingEnv();
    const mcp = request(`${stagingOrigin}/api/v1/admin/mcp`);
    expect(mcpStagingDirectWritesEnabled(env, mcp)).toBe(true);
  });

  it("does not use ENVIRONMENT because official staging runs as production", () => {
    const env = stagingEnv({ ENVIRONMENT: "production" });
    const mcp = request(`${stagingOrigin}/api/v1/admin/mcp`);
    expect(mcpStagingDirectWritesEnabled(env, mcp)).toBe(true);
  });

  it("fails closed without the exact overlay string, on production host, or on a production site", () => {
    const stagingRequest = request(`${stagingOrigin}/api/v1/admin/mcp`);
    expect(
      mcpStagingDirectWritesEnabled(
        stagingEnv({ MCP_STAGING_DIRECT_WRITES: undefined }),
        stagingRequest,
      ),
    ).toBe(false);
    expect(
      mcpStagingDirectWritesEnabled(
        stagingEnv({ MCP_STAGING_DIRECT_WRITES: "TRUE" }),
        stagingRequest,
      ),
    ).toBe(false);
    expect(
      mcpStagingDirectWritesEnabled(stagingEnv({ MCP_STAGING_DIRECT_WRITES: "1" }), stagingRequest),
    ).toBe(false);
    expect(
      mcpStagingDirectWritesEnabled(stagingEnv(), request(`${productionOrigin}/api/v1/admin/mcp`)),
    ).toBe(false);
    expect(
      mcpStagingDirectWritesEnabled(
        stagingEnv({ PUBLIC_SITE_URL: "https://kaiyuemacau.com" }),
        stagingRequest,
      ),
    ).toBe(false);
  });

  it("ignores client headers, query strings, and body-shaped flags", () => {
    const env = stagingEnv({ MCP_STAGING_DIRECT_WRITES: undefined });
    expect(
      mcpStagingDirectWritesEnabled(
        env,
        request(`${stagingOrigin}/api/v1/admin/mcp`, {
          headers: { MCP_STAGING_DIRECT_WRITES: "true", "x-skip-approval": "true" },
          query: "?MCP_STAGING_DIRECT_WRITES=true&skipApproval=true",
        }),
      ),
    ).toBe(false);
  });

  it("skips browser tickets on staging and still issues them when the policy is off", async () => {
    const action = ["status", "KY-TESTTEST", "approved"];
    const enabled = stagingEnv();
    const disabled = stagingEnv({ MCP_STAGING_DIRECT_WRITES: undefined });
    const stagingMcp = request(`${stagingOrigin}/api/v1/admin/mcp`);
    expect(await reviewMcpWrite(enabled, stagingMcp, "actor-1", "Approve?", action)).toBeNull();
    const ticket = await reviewMcpWrite(disabled, stagingMcp, "actor-1", "Approve?", action);
    expect(ticket).toMatch(/\/admin\/agent-review\?ticket=/);
    const productionMcp = request(`${productionOrigin}/api/v1/admin/mcp`);
    const replay = await reviewMcpWrite(enabled, productionMcp, "actor-1", "Approve?", action);
    expect(replay).toMatch(/\/admin\/agent-review\?ticket=/);
  });
});
