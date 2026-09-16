import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

function bookingPayload(overrides: Record<string, unknown> = {}) {
  return {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "Grand Lisboa",
    pickupAt: futurePickup(),
    passengerCount: 2,
    contactName: "Alex Chan",
    phone: "+853 6234 5678",
    privacyAccepted: true,
    sourcePage: "/",
    sourceTrigger: "hero-embed",
    sourceMode: "embedded",
    locale: "en",
    ...overrides,
  };
}

describe("POST /api/v1/bookings", () => {
  it("persists a valid booking once and replays matching idempotency keys", async () => {
    const env = createTestEnv();
    const payload = bookingPayload();
    const request = () =>
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "test-booking-key-001",
        },
        body: JSON.stringify(payload),
      });

    const first = await handleApi(request(), env);
    expect(first.status).toBe(201);
    const firstBody = (await first.json()) as { reference: string; status: string };
    expect(firstBody.status).toBe("new");
    expect(firstBody.reference).toMatch(/^KY-/);

    const replay = await handleApi(request(), env);
    expect(replay.status).toBe(201);
    const replayBody = (await replay.json()) as { reference: string };
    expect(replayBody.reference).toBe(firstBody.reference);

    const count = await env.DB.prepare("SELECT COUNT(*) as count FROM bookings").first<{
      count: number;
    }>();
    expect(count?.count).toBe(1);
  });

  it("rejects reused idempotency keys with a different payload", async () => {
    const env = createTestEnv();
    const key = "test-booking-key-002";
    const first = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify(bookingPayload()),
      }),
      env,
    );
    expect(first.status).toBe(201);

    const conflict = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": key },
        body: JSON.stringify(bookingPayload({ contactName: "Other Guest" })),
      }),
      env,
    );
    expect(conflict.status).toBe(409);
    const body = (await conflict.json()) as { error: { code: string } };
    expect(body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("rejects invalid bookings without writing a row", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "test-booking-key-003" },
        body: JSON.stringify(bookingPayload({ pickupLocation: "" })),
      }),
      env,
    );
    expect(response.status).toBe(422);
    const count = await env.DB.prepare("SELECT COUNT(*) as count FROM bookings").first<{
      count: number;
    }>();
    expect(count?.count).toBe(0);
  });

  it("keeps a stored booking when notification is skipped", async () => {
    const env = createTestEnv({ RESEND_API_KEY: undefined });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "test-booking-key-004" },
        body: JSON.stringify(bookingPayload()),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const row = await env.DB.prepare("SELECT notification_state FROM bookings").first<{
      notification_state: string;
    }>();
    expect(row?.notification_state).toBe("skipped");
  });
});
