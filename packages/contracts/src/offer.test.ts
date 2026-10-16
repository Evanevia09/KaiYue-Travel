import { describe, expect, it } from "vitest";
import { isCompleteOffer, offerWriteSchema } from "./offer.ts";

describe("offer validation", () => {
  it("accepts a complete write payload and drops empty optional fields", () => {
    const parsed = offerWriteSchema.parse({
      title: " Harbour circuit ",
      description: "A private car and driver for an evening outing.",
      priceFrom: 880,
      terms: "",
    });
    expect(parsed.title).toBe("Harbour circuit");
    expect(parsed.priceFrom).toBe(880);
    expect(parsed.terms).toBeUndefined();
  });

  it("rejects an empty title, overlong copy, and a non-positive price", () => {
    expect(offerWriteSchema.safeParse({ title: "  ", description: "Valid" }).success).toBe(false);
    expect(
      offerWriteSchema.safeParse({ title: "Valid", description: "x".repeat(2001) }).success,
    ).toBe(false);
    expect(
      offerWriteSchema.safeParse({ title: "Valid", description: "Valid", priceFrom: 0 }).success,
    ).toBe(false);
    expect(
      offerWriteSchema.safeParse({ title: "Valid", description: "Valid", priceFrom: -12 }).success,
    ).toBe(false);
  });

  it("treats only published offers with copy and a main photo as complete", () => {
    expect(
      isCompleteOffer({
        status: "published",
        title: "Evening drive",
        description: "Car and driver.",
        photos: [{ isMain: true }],
      }),
    ).toBe(true);
    expect(
      isCompleteOffer({
        status: "draft",
        title: "Evening drive",
        description: "Car and driver.",
        photos: [{ isMain: true }],
      }),
    ).toBe(false);
    expect(
      isCompleteOffer({
        status: "published",
        title: "Evening drive",
        description: "Car and driver.",
        photos: [{ isMain: false }],
      }),
    ).toBe(false);
  });
});
