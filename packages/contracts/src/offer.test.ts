import { describe, expect, it } from "vitest";
import { isCompleteOffer, isOfferReady, offerWriteSchema, scaledOfferImageSize } from "./offer.ts";

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

  it("scales the long edge and leaves smaller images unchanged", () => {
    expect(scaledOfferImageSize(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(scaledOfferImageSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(scaledOfferImageSize(1200, 4000, 480)).toEqual({ width: 144, height: 480 });
  });
});
