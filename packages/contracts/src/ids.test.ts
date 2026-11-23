import { describe, expect, it } from "vitest";
import {
  createBookingReference,
  createContactReference,
  formatBookingReference,
  isChauffeurBookingReference,
  sha256Hex,
} from "./ids.ts";

describe("ids", () => {
  it("keeps the legacy random formatter for historical KY-xxxxxxxx values", () => {
    const a = createBookingReference();
    const b = createBookingReference();
    expect(a).toMatch(/^KY-[A-Z2-9]{8}$/);
    expect(a).not.toEqual(b);
  });

  it("formats the durable KY##### chauffeur reference and expands instead of wrapping", () => {
    expect(formatBookingReference(1)).toBe("KY00001");
    expect(formatBookingReference(42)).toBe("KY00042");
    expect(formatBookingReference(10000)).toBe("KY10000");
    expect(formatBookingReference(100000)).toBe("KY100000");
    expect(() => formatBookingReference(0)).toThrow("invalid_booking_reference_serial");
  });

  it("accepts new serial refs and legacy KY-xxxxxxxx, and rejects contact refs", () => {
    expect(isChauffeurBookingReference("KY00042")).toBe(true);
    expect(isChauffeurBookingReference("KY100000")).toBe(true);
    expect(isChauffeurBookingReference("KY-ABCDEFGH")).toBe(true);
    expect(isChauffeurBookingReference("KY0001")).toBe(false);
    expect(isChauffeurBookingReference("INQ-ABCDEFGH")).toBe(false);
  });

  it("creates inquiry references", () => {
    expect(createContactReference()).toMatch(/^INQ-[A-Z2-9]{8}$/);
  });

  it("hashes values stably", async () => {
    expect(await sha256Hex("same")).toEqual(await sha256Hex("same"));
    expect(await sha256Hex("same")).not.toEqual(await sha256Hex("other"));
  });
});
