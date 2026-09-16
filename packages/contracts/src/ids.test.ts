import { describe, expect, it } from "vitest";
import { createBookingReference, createContactReference, sha256Hex } from "./ids.ts";

describe("ids", () => {
  it("creates non-sequential booking references", () => {
    const a = createBookingReference();
    const b = createBookingReference();
    expect(a).toMatch(/^KY-[A-Z2-9]{8}$/);
    expect(a).not.toEqual(b);
  });

  it("creates inquiry references", () => {
    expect(createContactReference()).toMatch(/^INQ-[A-Z2-9]{8}$/);
  });

  it("hashes values stably", async () => {
    expect(await sha256Hex("same")).toEqual(await sha256Hex("same"));
    expect(await sha256Hex("same")).not.toEqual(await sha256Hex("other"));
  });
});
