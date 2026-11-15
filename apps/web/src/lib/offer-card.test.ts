import { describe, expect, it } from "vitest";
import { publicOfferCardImage } from "./offer-card.ts";

describe("publicOfferCardImage", () => {
  it("uses the full main photo URL, not only the thumbnail", () => {
    const image = publicOfferCardImage({
      mainPhotoUrl: "/api/v1/offers/o1/photos/p1/abc",
      mainPhotoThumbUrl: "/api/v1/offers/o1/photos/p1/thumb/abc",
      mainPhotoWidth: 1600,
      mainPhotoHeight: 900,
    });
    expect(image?.src).toBe("/api/v1/offers/o1/photos/p1/abc");
    expect(image?.srcset).toContain("/thumb/abc");
    expect(image?.srcset).toContain("/photos/p1/abc 1600w");
  });

  it("falls back to the selected main photo when the list URL is missing", () => {
    const image = publicOfferCardImage({
      mainPhotoUrl: null,
      photos: [
        { url: "/full-b", thumbUrl: "/thumb-b", isMain: false },
        { url: "/full-a", thumbUrl: "/thumb-a", isMain: true, width: 1200, height: 800 },
      ],
    });
    expect(image).toEqual({
      src: "/full-a",
      srcset: "/thumb-a 480w, /full-a 1600w",
      width: 1200,
      height: 800,
    });
  });

  it("returns null when no photo exists", () => {
    expect(publicOfferCardImage({ mainPhotoUrl: null, photos: [] })).toBeNull();
  });
});
