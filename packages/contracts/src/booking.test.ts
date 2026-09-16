import { describe, expect, it } from "vitest";
import { bookingCreateSchema, validatePickupNotice } from "./booking.ts";

const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

function validBooking(overrides: Record<string, unknown> = {}) {
  return {
    serviceType: "airport_transfer",
    pickupLocation: "Macau International Airport",
    destination: "The Londoner Macao",
    pickupAt: future,
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

describe("bookingCreateSchema", () => {
  it("accepts a complete airport transfer", () => {
    const parsed = bookingCreateSchema.parse(validBooking());
    expect(parsed.phone).toBe("+85362345678");
    expect(parsed.destination).toBe("The Londoner Macao");
  });

  it("allows hourly charter without destination", () => {
    const parsed = bookingCreateSchema.parse(
      validBooking({ serviceType: "hourly_charter", destination: "" }),
    );
    expect(parsed.destination).toBeUndefined();
  });

  it("requires destination for other services", () => {
    const result = bookingCreateSchema.safeParse(validBooking({ destination: "" }));
    expect(result.success).toBe(false);
  });

  it("rejects return before pickup", () => {
    const result = bookingCreateSchema.safeParse(
      validBooking({
        returnAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("validatePickupNotice", () => {
  it("rejects times inside the notice window", () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(validatePickupNotice(soon, 24)).toMatch(/at least 24 hours/);
  });

  it("accepts times beyond the notice window", () => {
    expect(validatePickupNotice(future, 24)).toBeUndefined();
  });
});
