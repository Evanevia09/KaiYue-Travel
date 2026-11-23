import { describe, expect, it, vi } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { consumeMcpApproval } from "../../apps/web/src/lib/server/mcp-access.ts";
import { sendStagingQuote } from "../../apps/web/src/lib/server/quotes.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const origin = "https://admin-staging.kaiyuemacau.com";
const inbox = "staging-quote@example.invalid";
const timestamp = "2026-11-18T11:00:00.000Z";
const reference = "INQ-ABCDEFGH";
const approved = async () => null;
const quote = { reference, currency: "MOP", total: "235.50", expectedUpdatedAt: timestamp };

function quoteRequest(body = quote, host = origin) {
  return new Request(`${host}/api/v1/admin/quotes/email`, {
    method: "POST",
    headers: { origin: host, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function setup(recipient = inbox) {
  const send = vi.fn(async () => ({ messageId: "fixture" }));
  const env = createTestEnv({
    ENVIRONMENT: "production",
    DEV_ADMIN_BYPASS: "false",
    PUBLIC_SITE_URL: "https://staging.kaiyuemacau.com",
    STAGING_QUOTE_EMAIL_ENABLED: "true",
    NOTIFICATIONS_ENABLED: "false",
    NOTIFY_ALLOWED_RECIPIENTS: inbox,
    NOTIFY_STAFF_TO: inbox,
    NOTIFY_FROM_EMAIL: "sender@example.invalid",
    EMAIL: { send },
  });
  const created = await handleApi(
    new Request("http://localhost/api/v1/contacts", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "staging-quote-fixture" },
      body: JSON.stringify({
        inquiryType: "general",
        name: "Synthetic Guest",
        phone: "+853 6666 1111",
        email: recipient,
        message: "Test inquiry for a chauffeur quote.",
        privacyAccepted: true,
        locale: "en",
        sourcePage: "/contact",
      }),
    }),
    createTestEnv({ DB: env.DB }),
  );
  expect(created.status).toBe(201);
  await env.DB.prepare("UPDATE contacts SET reference = ?, updated_at = ?")
    .bind(reference, timestamp)
    .run();
  return { env, send };
}

describe("staging quotation email", () => {
  it("enforces admin authentication at the route before calling the binding", async () => {
    const { env, send } = await setup();
    const denied = await handleApi(quoteRequest(), env);
    expect([401, 403]).toContain(denied.status);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends only to the saved test inbox and records one audit event on replay", async () => {
    const { env, send } = await setup();
    const invoke = () =>
      sendStagingQuote(quoteRequest(), env, "fixture-actor", "req-quote", approved);
    expect((await invoke()).status).toBe(200);
    expect((await invoke()).status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: inbox,
        text: expect.stringContaining("MOP 235.50"),
        html: expect.stringContaining("MOP 235.50"),
      }),
    );
    expect(send.mock.calls[0]?.[0]?.html).toContain("#ffffff");
    expect(send.mock.calls[0]?.[0]?.html).not.toContain("#008c5e");
    expect(send.mock.calls[0]?.[0]?.html).toContain(
      "https://staging.kaiyuemacau.com/images/kai-yue-travel-group-logo.png",
    );
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM audit_events WHERE event_type = 'quote_email_submitted'",
      ).first(),
    ).toEqual({ count: 1 });
  });

  it("rejects a different inbox, stale revision, disabled flag, and production", async () => {
    const other = await setup("other@example.invalid");
    await expect(
      sendStagingQuote(quoteRequest(), other.env, "fixture-actor", "req-quote", approved),
    ).rejects.toMatchObject({ status: 403 });
    expect(other.send).not.toHaveBeenCalled();
    const { env, send } = await setup();
    await expect(
      sendStagingQuote(
        quoteRequest({ ...quote, expectedUpdatedAt: "2025-01-01T00:00:00.000Z" }),
        env,
        "fixture-actor",
        "req-quote",
        approved,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      sendStagingQuote(
        quoteRequest(),
        { ...env, STAGING_QUOTE_EMAIL_ENABLED: "false" },
        "fixture-actor",
        "req-quote",
        approved,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      sendStagingQuote(
        quoteRequest(quote, "https://admin.kaiyuemacau.com"),
        env,
        "fixture-actor",
        "req-quote",
        approved,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps an uncertain provider result from generating a second message", async () => {
    const { env, send } = await setup();
    send.mockRejectedValueOnce(new Error("fixture failure"));
    const invoke = () =>
      sendStagingQuote(quoteRequest(), env, "fixture-actor", "req-quote", approved);
    await expect(invoke()).rejects.toMatchObject({ status: 503 });
    await expect(invoke()).rejects.toMatchObject({ status: 409 });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("sends without a browser ticket when the staging overlay policy is on", async () => {
    const { env, send } = await setup();
    const target = {
      ...env,
      MCP_STAGING_DIRECT_WRITES: "true",
      BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    };
    const response = await sendStagingQuote(quoteRequest(), target, "fixture-actor", "req-quote");
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
    await expect(
      sendStagingQuote(
        quoteRequest(quote, "https://admin.kaiyuemacau.com"),
        target,
        "fixture-actor",
        "req-quote",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("still requires a browser ticket when the overlay policy is off", async () => {
    const { env, send } = await setup();
    const target = {
      ...env,
      MCP_STAGING_DIRECT_WRITES: undefined,
      BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    };
    await expect(
      sendStagingQuote(quoteRequest(), target, "fixture-actor", "req-quote"),
    ).rejects.toMatchObject({
      status: 409,
      fields: { reviewUrl: expect.stringMatching(/agent-review/) },
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("does not let a client header skip quote approval when the overlay var is absent", async () => {
    const { env, send } = await setup();
    const target = {
      ...env,
      MCP_STAGING_DIRECT_WRITES: undefined,
      BETTER_AUTH_SECRET: "test-only-isolated-d1-secret-0123456789abcdef",
    };
    await expect(
      sendStagingQuote(
        quoteRequest(quote, origin),
        target,
        "fixture-actor",
        "req-quote",
        consumeMcpApproval,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const flagged = new Request(`${origin}/api/v1/admin/quotes/email?skipApproval=true`, {
      method: "POST",
      headers: {
        origin,
        "content-type": "application/json",
        "x-mcp-direct-writes": "true",
        MCP_STAGING_DIRECT_WRITES: "true",
      },
      body: JSON.stringify(quote),
    });
    await expect(
      sendStagingQuote(flagged, target, "fixture-actor", "req-quote"),
    ).rejects.toMatchObject({ status: 409 });
    expect(send).not.toHaveBeenCalled();
  });
});
