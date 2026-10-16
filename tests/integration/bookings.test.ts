import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createMemoryOfferStore } from "../../apps/web/src/lib/server/offers/store.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const sampleOfferId = "3f1c2a90-4b71-4d2e-9c1a-8a0f6d2e1b33";

function publishedOfferStore(status: "draft" | "published" = "published") {
  return createMemoryOfferStore([
    {
      id: sampleOfferId,
      status,
      title: "[Sample] Harbour lights",
      description: "A sample outing with a car and driver.",
      priceFrom: null,
      terms: null,
      createdAt: "2026-10-16T00:00:00.000Z",
      updatedAt: "2026-10-16T00:00:00.000Z",
      photos: [
        {
          id: "photo-1",
          offerId: sampleOfferId,
          objectKey: "offers/sample",
          thumbObjectKey: "offers/sample-thumb",
          contentType: "image/jpeg",
          contentHash: "abc123",
          isMain: true,
          sortOrder: 0,
          width: 1600,
          height: 1200,
          byteSize: 1200,
          createdAt: "2026-10-16T00:00:00.000Z",
        },
      ],
    },
  ]);
}

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

  it("stores a published special offer id and title on the booking", async () => {
    const env = createTestEnv({ offerStore: publishedOfferStore() });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "offer-booking-001" },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "city_tour",
            destination: "",
            tourPackageId: sampleOfferId,
            tourPackageTitle: "[Sample] Harbour lights",
            offerId: sampleOfferId,
            offerTitle: "[Sample] Harbour lights",
            sourcePage: "/special-offers",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const row = await env.DB.prepare(
      "SELECT offer_id, offer_title, notes, service_type FROM bookings",
    ).first<{
      offer_id: string | null;
      offer_title: string | null;
      notes: string;
      service_type: string;
    }>();
    expect(row).toMatchObject({
      offer_id: sampleOfferId,
      offer_title: "[Sample] Harbour lights",
      service_type: "city_tour",
      notes: `Special offer: [Sample] Harbour lights (${sampleOfferId}).`,
    });
  });

  it("labels a special-offer WhatsApp enquiry as special offer, not city tour", async () => {
    const env = createTestEnv({
      WHATSAPP_NUMBER: "+853 2833 8882",
      offerStore: publishedOfferStore(),
    });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "offer-whatsapp-001" },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "city_tour",
            destination: "",
            tourPackageId: sampleOfferId,
            tourPackageTitle: "[Sample] Harbour lights",
            offerId: sampleOfferId,
            offerTitle: "[Sample] Harbour lights",
            communicationChannel: "whatsapp",
            contactName: "",
            phone: "",
            email: "",
            sourcePage: "/special-offers",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { whatsappUrl: string };
    const text = decodeURIComponent(body.whatsappUrl);
    expect(text).toContain("Service: special offer");
    expect(text).toContain("Special offer: [Sample] Harbour lights");
    expect(text).not.toContain("Service: city tour");
  });

  it.each([
    ["pt", "Serviço: Oferta especial"],
    ["zh-Hant", "服務: 特別優惠"],
  ])("localizes the %s special-offer WhatsApp service label", async (locale, service) => {
    const env = createTestEnv({
      WHATSAPP_NUMBER: "+853 2833 8882",
      offerStore: publishedOfferStore(),
    });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `offer-whatsapp-${locale}`,
        },
        body: JSON.stringify(
          bookingPayload({
            locale,
            sourcePage: `/${locale}/special-offers`,
            serviceType: "city_tour",
            destination: "",
            tourPackageId: sampleOfferId,
            tourPackageTitle: "[Sample] Harbour lights",
            offerId: sampleOfferId,
            offerTitle: "[Sample] Harbour lights",
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
    const body = (await response.json()) as { whatsappUrl: string };
    expect(decodeURIComponent(body.whatsappUrl)).toContain(service);
    expect(decodeURIComponent(body.whatsappUrl)).not.toMatch(
      /Serviço: Passeio pela cidade|服務: 城市遊覽|Service: city tour/,
    );
  });

  it("keeps city tour on a City Tours WhatsApp enquiry", async () => {
    const env = createTestEnv({ WHATSAPP_NUMBER: "+853 2833 8882" });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": "city-tour-whatsapp-001",
        },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "city_tour",
            destination: "",
            tourPackageId: "half-day",
            tourPackageTitle: "Half day",
            tourDurationHours: 6,
            communicationChannel: "whatsapp",
            contactName: "",
            phone: "",
            email: "",
            sourcePage: "/services/city-tours/half-day",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(201);
    const body = (await response.json()) as { whatsappUrl: string };
    const text = decodeURIComponent(body.whatsappUrl);
    expect(text).toContain("Service: city tour");
    expect(text).toContain("Tour package: Half day");
    expect(text).not.toContain("Service: special offer");
    expect(text).not.toContain("Special offer:");
  });

  it("rejects an enquiry for an unpublished special offer", async () => {
    const env = createTestEnv({ offerStore: publishedOfferStore("draft") });
    const response = await handleApi(
      new Request("http://localhost/api/v1/bookings", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "offer-booking-002" },
        body: JSON.stringify(
          bookingPayload({
            serviceType: "city_tour",
            destination: "",
            tourPackageId: sampleOfferId,
            tourPackageTitle: "[Sample] Harbour lights",
            offerId: sampleOfferId,
            offerTitle: "[Sample] Harbour lights",
          }),
        ),
      }),
      env,
    );
    expect(response.status).toBe(422);
    const count = await env.DB.prepare("SELECT COUNT(*) as count FROM bookings").first<{
      count: number;
    }>();
    expect(count?.count).toBe(0);
  });
});
