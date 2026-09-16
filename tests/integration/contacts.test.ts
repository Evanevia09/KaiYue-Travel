import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

describe("POST /api/v1/contacts", () => {
  it("stores a corporate inquiry", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "test-contact-key-001",
        },
        body: JSON.stringify({
          inquiryType: "corporate",
          name: "Jamie Ho",
          phone: "+853 2833 8882",
          company: "Example Hotels",
          message: "We need recurring airport transfers for arriving guests.",
          privacyAccepted: true,
          sourcePage: "/corporate",
          locale: "en",
        }),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { reference: string };
    expect(body.reference).toMatch(/^INQ-/);
  });

  it("requires a company name for corporate inquiries", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/contacts", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "test-contact-key-002",
        },
        body: JSON.stringify({
          inquiryType: "corporate",
          name: "Jamie Ho",
          phone: "+853 2833 8882",
          message: "We need recurring airport transfers for arriving guests.",
          privacyAccepted: true,
          sourcePage: "/corporate",
        }),
      }),
      env,
    );
    expect(response.status).toBe(422);
  });
});
