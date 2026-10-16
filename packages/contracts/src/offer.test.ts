import { describe, expect, it } from "vitest";
import { isCompleteOffer, isOfferReady, offerWriteSchema } from "./offer.ts";

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

  it("treats copy plus a main photo as ready, and only published ready offers as complete", () => {
    const ready = {
      title: "Evening drive",
      description: "Car and driver.",
      photos: [{ isMain: true }],
    };
    expect(isOfferReady(ready)).toBe(true);
    expect(isCompleteOffer({ status: "published", ...ready })).toBe(true);
    expect(isCompleteOffer({ status: "draft", ...ready })).toBe(false);
    expect(
      isOfferReady({
        title: "Evening drive",
        description: "Car and driver.",
        photos: [{ isMain: false }],
      }),
    ).toBe(false);
  });
});
