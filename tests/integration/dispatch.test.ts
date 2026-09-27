import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createTestEnv, futurePickup } from "../helpers/memory-d1.ts";

const admin = (path: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json", origin: "http://localhost:4321" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

async function booking(env: ReturnType<typeof createTestEnv>, pickupAt: string) {
  const response = await handleApi(
    new Request("http://localhost/api/v1/bookings", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({
        serviceType: "point_to_point",
        pickupLocation: "Macau Tower",
        destination: "Taipa",
        pickupAt,
        passengerCount: 3,
        communicationChannel: "whatsapp",
        message: "Test",
        privacyAccepted: true,
        sourcePage: "/",
        sourceTrigger: "test",
        sourceMode: "page",
        locale: "en",
      }),
    }),
    env,
  );
  expect(response.status).toBe(201);
  return (await response.json()) as { reference: string };
}

describe("dispatch administration", () => {
  it("protects inventory routes and validates assignments", async () => {
    const env = createTestEnv();
    const denied = await handleApi(admin("/api/v1/admin/drivers"), {
      ...env,
      ENVIRONMENT: "production",
      DEV_ADMIN_BYPASS: "false",
    });
    expect(denied.status).toBe(401);
    const driverResponse = await handleApi(
      admin("/api/v1/admin/drivers", "POST", { name: "Alex Chan", phone: "+853 6666 8888" }),
      env,
    );
    expect(driverResponse.status).toBe(201);
    const driver = ((await driverResponse.json()) as { item: { id: string } }).item;
    const small = await handleApi(
      admin("/api/v1/admin/vehicles", "POST", {
        plateNumber: "MA-01",
        makeModel: "Compact",
        passengerCapacity: 2,
      }),
      env,
    );
    expect(small.status).toBe(201);
    const smallCar = ((await small.json()) as { item: { id: string } }).item;
    const created = await booking(env, futurePickup());
    const detail = await handleApi(admin(`/api/v1/admin/bookings/${created.reference}`), env);
    const updatedAt = ((await detail.json()) as { booking: { updatedAt: string } }).booking
      .updatedAt;
    const rejected = await handleApi(
      admin(`/api/v1/admin/bookings/${created.reference}/assignment`, "PATCH", {
        driverId: driver.id,
        vehicleId: smallCar.id,
        expectedUpdatedAt: updatedAt,
      }),
      env,
    );
    expect(rejected.status).toBe(422);
    const large = await handleApi(
      admin("/api/v1/admin/vehicles", "POST", {
        plateNumber: "MA-02",
        makeModel: "MPV",
        passengerCapacity: 7,
        contactName: "Partner",
        contactPhone: "+853 6655 1122",
      }),
      env,
    );
    const car = ((await large.json()) as { item: { id: string } }).item;
    const assigned = await handleApi(
      admin(`/api/v1/admin/bookings/${created.reference}/assignment`, "PATCH", {
        driverId: driver.id,
        vehicleId: car.id,
        expectedUpdatedAt: updatedAt,
      }),
      env,
    );
    expect(assigned.status).toBe(200);
    const assignedBody = (await assigned.json()) as {
      booking: { driverId: string; vehicleId: string };
    };
    expect(assignedBody.booking.driverId).toBe(driver.id);
    expect(assignedBody.booking.vehicleId).toBe(car.id);
  });

  it("edits details and paginates identical pickup times without dropping rows", async () => {
    const env = createTestEnv();
    const pickupAt = futurePickup();
    const refs = await Promise.all([
      booking(env, pickupAt),
      booking(env, pickupAt),
      booking(env, pickupAt),
    ]);
    const firstPage = await handleApi(admin("/api/v1/admin/bookings?limit=2"), env);
    const page = (await firstPage.json()) as {
      items: Array<{ reference: string; updatedAt: string }>;
      nextCursor: string;
      total: number;
    };
    expect(page.total).toBe(3);
    const secondPage = await handleApi(
      admin(`/api/v1/admin/bookings?limit=2&cursor=${encodeURIComponent(page.nextCursor)}`),
      env,
    );
    const next = (await secondPage.json()) as { items: Array<{ reference: string }> };
    expect(new Set([...page.items, ...next.items].map((item) => item.reference))).toEqual(
      new Set(refs.map((item) => item.reference)),
    );
    const target = page.items[0]!;
    const edited = await handleApi(
      admin(`/api/v1/admin/bookings/${target.reference}`, "PATCH", {
        expectedUpdatedAt: target.updatedAt,
        pickupLocation: "Grand Lisboa",
        destination: "Taipa",
        pickupAt,
        returnAt: null,
        passengerCount: 2,
        contactName: "Test Guest",
        phone: null,
        email: null,
        message: "Updated",
      }),
      env,
    );
    expect(edited.status).toBe(200);
    expect(
      ((await edited.json()) as { booking: { pickupLocation: string } }).booking.pickupLocation,
    ).toBe("Grand Lisboa");
    const stale = await handleApi(
      admin(`/api/v1/admin/bookings/${target.reference}`, "PATCH", {
        expectedUpdatedAt: target.updatedAt,
      }),
      env,
    );
    expect(stale.status).toBe(409);
  });

  it("creates and edits driver and vehicle records through the admin API", async () => {
    const env = createTestEnv();
    const createdDriver = await handleApi(
      admin("/api/v1/admin/drivers", "POST", {
        name: "Sam Lei",
        phone: "+853 6666 1111",
        email: "sam@example.com",
        active: false,
      }),
      env,
    );
    expect(createdDriver.status).toBe(201);
    const driver = ((await createdDriver.json()) as { item: { id: string; active: boolean } }).item;
    expect(driver.active).toBe(false);
    const editedDriver = await handleApi(
      admin(`/api/v1/admin/drivers/${driver.id}`, "PATCH", {
        phone: "+853 6666 2222",
        active: true,
      }),
      env,
    );
    expect(editedDriver.status).toBe(200);
    expect(
      (await editedDriver.json()) as { item: { phone: string; active: boolean } },
    ).toMatchObject({
      item: { phone: "+853 6666 2222", active: true },
    });

    const createdVehicle = await handleApi(
      admin("/api/v1/admin/vehicles", "POST", {
        plateNumber: "MA-10",
        makeModel: "MPV",
        passengerCapacity: 6,
        active: false,
      }),
      env,
    );
    expect(createdVehicle.status).toBe(201);
    const vehicle = ((await createdVehicle.json()) as { item: { id: string; active: boolean } })
      .item;
    expect(vehicle.active).toBe(false);
    const editedVehicle = await handleApi(
      admin(`/api/v1/admin/vehicles/${vehicle.id}`, "PATCH", {
        makeModel: "Premium MPV",
        contactName: "Partner",
        contactPhone: "+853 6655 9999",
        active: true,
      }),
      env,
    );
    expect(editedVehicle.status).toBe(200);
    expect(
      (await editedVehicle.json()) as { item: { makeModel: string; active: boolean } },
    ).toMatchObject({
      item: { makeModel: "Premium MPV", active: true },
    });
    const roster = await handleApi(admin("/api/v1/admin/drivers"), env);
    const fleet = await handleApi(admin("/api/v1/admin/vehicles"), env);
    expect((await roster.json()) as { items: Array<{ id: string }> }).toMatchObject({
      items: [{ id: driver.id }],
    });
    expect((await fleet.json()) as { items: Array<{ id: string }> }).toMatchObject({
      items: [{ id: vehicle.id }],
    });
  });
});
