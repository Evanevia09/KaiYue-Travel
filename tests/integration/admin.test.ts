import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

async function createBooking(env: ReturnType<typeof createTestEnv>) {
  const response = await handleApi(
    new Request("http://localhost/api/v1/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `admin-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        serviceType: "point_to_point",
        pickupLocation: "Senado Square",
        destination: "Macau Tower",
        pickupAt: futurePickup(),
        passengerCount: 3,
        communicationChannel: "email",
        contactName: "Morgan Lee",
        phone: "+853 6666 1111",
        email: "morgan@example.com",
        message: "Please confirm this transfer.",
        privacyAccepted: true,
        sourcePage: "/services",
        sourceTrigger: "service-card",
        sourceMode: "bottom-sheet",
        locale: "en",
      }),
    }),
    env,
  );
  return (await response.json()) as { reference: string };
}

describe("admin authorization and mutations", () => {
  it("denies admin APIs without Access identity outside development bypass", async () => {
    const env = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "true" });
    const response = await handleApi(new Request("http://localhost/api/v1/admin/summary"), env);
    expect(response.status).toBe(403);
  });

  it("allows the local development bypass and records audited status changes", async () => {
    const env = createTestEnv();
    const created = await createBooking(env);
    const deniedPublic = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}`),
      { ...env, ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" },
    );
    expect(deniedPublic.status).toBe(403);

    const listed = await handleApi(new Request("http://localhost/api/v1/admin/bookings"), env);
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { items: Array<{ reference: string }> };
    expect(listBody.items[0]?.reference).toBe(created.reference);

    const patched = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: "http://localhost:4321" },
        body: JSON.stringify({ status: "assigned" }),
      }),
      env,
    );
    expect(patched.status).toBe(200);

    const invalid = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: "http://localhost:4321" },
        body: JSON.stringify({ status: "enquiry" }),
      }),
      env,
    );
    expect(invalid.status).toBe(409);

    const events = await env.DB.prepare("SELECT COUNT(*) as count FROM audit_events").first<{
      count: number;
    }>();
    expect(events?.count).toBe(1);
  });

  it("stores a staff manual enquiry without labelling it WhatsApp", async () => {
    const env = createTestEnv();
    const created = await handleApi(
      new Request("http://localhost/api/v1/admin/bookings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:4321",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          serviceType: "point_to_point",
          pickupLocation: "Macau Tower",
          destination: "Taipa",
          pickupAt: futurePickup(),
          passengerCount: 2,
          communicationChannel: "admin",
          contactName: "Desk guest",
          phone: "+853 6234 5678",
          message: "Called the office.",
          sourcePage: "/admin/bookings",
          sourceTrigger: "admin-manual",
          sourceMode: "page",
          locale: "en",
        }),
      }),
      env,
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as { reference: string };
    const detail = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${body.reference}`, {
        headers: { origin: "http://localhost:4321" },
      }),
      env,
    );
    expect(detail.status).toBe(200);
    const stored = (await detail.json()) as {
      booking: { communicationChannel: string; sourceTrigger: string };
    };
    expect(stored.booking.communicationChannel).toBe("admin");
    expect(stored.booking.sourceTrigger).toBe("admin-manual");
  });
});

describe("booking decision statuses", () => {
  it("persists, filters, and audits distinct approval, confirmation, and denial", async () => {
    const env = createTestEnv();
    const first = await createBooking(env);
    const second = await createBooking(env);
    const path = (reference: string) => `http://localhost/api/v1/admin/bookings/${reference}`;
    const get = async (reference: string) =>
      (await (await handleApi(new Request(path(reference)), env)).json()).booking as {
        status: string;
        updatedAt: string;
      };
    const change = async (reference: string, status: string, expectedUpdatedAt: string) =>
      handleApi(
        new Request(`${path(reference)}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json", origin: "http://localhost:4321" },
          body: JSON.stringify({ status, expectedUpdatedAt }),
        }),
        env,
      );

    const entry = await get(first.reference);
    expect((await change(first.reference, "confirmed", entry.updatedAt)).status).toBe(409);
    expect((await change(first.reference, "approved", entry.updatedAt)).status).toBe(200);
    expect((await change(first.reference, "confirmed", entry.updatedAt)).status).toBe(409);
    const approved = await get(first.reference);
    expect(approved.status).toBe("approved");
    expect((await change(first.reference, "confirmed", approved.updatedAt)).status).toBe(200);
    expect((await get(first.reference)).status).toBe("confirmed");
    expect(
      (await change(second.reference, "denied", (await get(second.reference)).updatedAt)).status,
    ).toBe(200);
    expect((await get(second.reference)).status).toBe("denied");

    for (const [reference, status] of [
      [first.reference, "confirmed"],
      [second.reference, "denied"],
    ]) {
      const response = await handleApi(
        new Request(`http://localhost/api/v1/admin/bookings?status=${status}`),
        env,
      );
      expect(response.status).toBe(200);
      expect((await response.json()).items).toMatchObject([{ reference, status }]);
    }
    const log = await env.DB.prepare(
      "SELECT to_value FROM audit_events WHERE event_type = 'status_change' ORDER BY rowid",
    ).all();
    expect(log.results.map((event) => event.to_value)).toEqual(["approved", "confirmed", "denied"]);
  });
});
