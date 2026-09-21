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
    communicationChannel: "email",
    contactName: "Alex Chan",
    phone: "+853 6234 5678",
    email: "alex@example.com",
    message: "Please confirm availability.",
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
    expect(firstBody.status).toBe("enquiry");
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

  it("stores hourly duration in booking notes", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "test-booking-key-005" },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "hourly_charter",
            destination: "",
            durationHours: 3,
            notes: "Need a child seat.",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const row = await env.DB.prepare("SELECT notes FROM bookings").first<{ notes: string }>();
    expect(row?.notes).toBe("Duration: 3 hours.\n\nNeed a child seat.");
  });

  it("persists a WhatsApp enquiry and returns a formatted deep link", async () => {
    const env = createTestEnv({ WHATSAPP_NUMBER: "+853 2833 8882" });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "whatsapp-001" },
        body: JSON.stringify(
          bookingPayload({
            communicationChannel: "whatsapp",
            contactName: "",
            phone: "+853 6234 5678",
            email: "",
            message: "Two suitcases and a child seat.",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { whatsappUrl: string };
    expect(body.whatsappUrl).toContain("https://wa.me/85328338882?text=");
    expect(decodeURIComponent(body.whatsappUrl)).toContain("Two suitcases and a child seat.");
    expect(decodeURIComponent(body.whatsappUrl)).toContain("WhatsApp number: +853 6234 5678");
    const row = await env.DB.prepare(
      "SELECT communication_channel, phone_display, message FROM bookings",
    ).first<{
      communication_channel: string;
      phone_display: string;
      message: string;
    }>();
    expect(row).toMatchObject({
      communication_channel: "whatsapp",
      phone_display: "+853 6234 5678",
      message: "Two suitcases and a child seat.",
    });
  });

  it("accepts an optional message and omits empty Message text from WhatsApp", async () => {
    const env = createTestEnv({ WHATSAPP_NUMBER: "+853 2833 8882" });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "whatsapp-no-message" },
        body: JSON.stringify(
          bookingPayload({
            communicationChannel: "whatsapp",
            contactName: "",
            phone: "",
            email: "",
            message: "",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { whatsappUrl: string };
    expect(decodeURIComponent(body.whatsappUrl)).not.toContain("Message:");
    expect(decodeURIComponent(body.whatsappUrl)).not.toContain("WhatsApp number:");
    const row = await env.DB.prepare("SELECT message FROM bookings").first<{ message: string }>();
    expect(row?.message).toBe("");
  });

  it("accepts an email enquiry with an empty message", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "email-no-message" },
        body: JSON.stringify(bookingPayload({ message: "" })),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const row = await env.DB.prepare("SELECT message FROM bookings").first<{ message: string }>();
    expect(row?.message).toBe("");
  });
});
