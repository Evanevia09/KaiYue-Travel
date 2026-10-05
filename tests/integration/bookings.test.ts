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

  it("stores a city tour package without a destination or return", async () => {
    const env = createTestEnv();
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "test-booking-key-006" },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "city_tour",
            destination: "",
            tourPackageId: "heritage-walk",
            tourPackageTitle: "Heritage and old-town walk (draft)",
            tourDurationHours: 6,
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const row = await env.DB.prepare(
      "SELECT destination, return_at, notes, service_type FROM bookings",
    ).first<{
      destination: string | null;
      return_at: string | null;
      notes: string;
      service_type: string;
    }>();
    expect(row).toMatchObject({
      destination: null,
      return_at: null,
      service_type: "city_tour",
      notes:
        "City tour package: Heritage and old-town walk (draft) (heritage-walk). Duration: 6 hours.",
    });
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

  it.each([
    ["pt", "Pedido de reserva", "Serviço: Transfer do aeroporto", "Continue no WhatsApp"],
    ["zh-Hant", "預約申請", "服務: 機場接送", "請透過 WhatsApp"],
  ])(
    "localizes the %s WhatsApp request and confirmation",
    async (locale, heading, service, confirmation) => {
      const env = createTestEnv({ WHATSAPP_NUMBER: "+853 2833 8882" });
      const response = await handleApi(
        new Request("http://localhost/api/v1/bookings", {
          method: "POST",
          headers: { "content-type": "application/json", "idempotency-key": `whatsapp-${locale}` },
          body: JSON.stringify(
            bookingPayload({
              locale,
              sourcePage: `/${locale}/services/airport-transfer`,
              communicationChannel: "whatsapp",
              contactName: "",
              phone: "",
              email: "",
            }),
          ),
        }),
        env,
      );
      expect(response.status).toBe(201);
      const body = (await response.json()) as { whatsappUrl: string; nextStep: string };
      expect(decodeURIComponent(body.whatsappUrl)).toContain(heading);
      expect(decodeURIComponent(body.whatsappUrl)).toContain(service);
      expect(body.nextStep).toContain(confirmation);
    },
  );

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
