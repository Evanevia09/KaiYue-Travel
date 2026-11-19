import { describe, expect, it } from "vitest";
import { STAGING_MCP_USER_AGENT } from "@kaiyue/agent-tools/client";
import {
  STAGING_MCP_ENDPOINT,
  STAGING_MCP_SESSION,
  stagingMcpAuthInstructions,
  stagingMcpConnection,
} from "./staging-mcp-connect.ts";

describe("staging MCP connect copy", () => {
  it("tells a generic agent how to POST email and password without a browser vault injection", () => {
    const connection = stagingMcpConnection();
    expect(connection.endpoint).toBe(STAGING_MCP_ENDPOINT);
    expect(connection.session).toBe(STAGING_MCP_SESSION);
    expect(connection.authentication).toBe(stagingMcpAuthInstructions);
    expect(connection.userAgent).toBe(STAGING_MCP_USER_AGENT);
    expect(connection.tokenLifetimeSeconds).toBe(1800);
    expect(connection.authentication).toMatch(/secure in-chat form/i);
    expect(connection.authentication).toMatch(/cannot inject credentials/i);
    expect(connection.authentication).toMatch(/Do not impersonate a browser/);
    expect(connection.authentication).not.toMatch(/Mozilla\//);
    expect(connection.failures.browserIntegrity).toMatch(/1010/);
    expect(connection.failures.lockout).toMatch(/five minutes/);
    expect(connection).not.toHaveProperty("signIn");
    expect(connection).not.toHaveProperty("setup");
  });
});
