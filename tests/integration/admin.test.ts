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
        contactName: "Morgan Lee",
        phone: "+853 6666 1111",
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
    expect(response.status).toBe(401);
  });

  it("allows the local development bypass and records audited status changes", async () => {
    const env = createTestEnv();
    const created = await createBooking(env);
    const deniedPublic = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}`),
      { ...env, ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "false" },
    );
    expect(deniedPublic.status).toBe(401);

    const listed = await handleApi(new Request("http://localhost/api/v1/admin/bookings"), env);
    expect(listed.status).toBe(200);
    const listBody = (await listed.json()) as { items: Array<{ reference: string }> };
    expect(listBody.items[0]?.reference).toBe(created.reference);

    const patched = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: "http://localhost:4321" },
        body: JSON.stringify({ status: "confirmed" }),
      }),
      env,
    );
    expect(patched.status).toBe(200);

    const invalid = await handleApi(
      new Request(`http://localhost/api/v1/admin/bookings/${created.reference}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: "http://localhost:4321" },
        body: JSON.stringify({ status: "completed" }),
      }),
      env,
    );
    expect(invalid.status).toBe(409);

    const events = await env.DB.prepare("SELECT COUNT(*) as count FROM audit_events").first<{
      count: number;
    }>();
    expect(events?.count).toBe(1);
  });
});
