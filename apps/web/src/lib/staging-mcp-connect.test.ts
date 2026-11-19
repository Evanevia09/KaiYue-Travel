import { describe, expect, it } from "vitest";
import {
  STAGING_MCP_ENDPOINT,
  STAGING_MCP_SESSION,
  stagingMcpAuthInstructions,
  stagingMcpConnection,
} from "./staging-mcp-connect.ts";

describe("staging MCP connect copy", () => {
  it("tells an agent to use a vault login or a secure email/password form", () => {
    const connection = stagingMcpConnection();
    expect(connection.endpoint).toBe(STAGING_MCP_ENDPOINT);
    expect(connection.session).toBe(STAGING_MCP_SESSION);
    expect(connection.authentication).toBe(stagingMcpAuthInstructions);
    expect(connection.authentication).toMatch(/vault/i);
    expect(connection.authentication).toMatch(/secure in-chat form/i);
    expect(connection.authentication).not.toMatch(/\/login/);
    expect(connection).not.toHaveProperty("signIn");
    expect(connection).not.toHaveProperty("setup");
  });
});
