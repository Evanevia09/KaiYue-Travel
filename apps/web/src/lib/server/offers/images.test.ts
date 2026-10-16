import { describe, expect, it } from "vitest";
import { assertOfferImage, hashOfferImage, offerObjectKey } from "./images.ts";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe("offer image helpers", () => {
  it("hashes bytes and versions object keys", async () => {
    const hash = await hashOfferImage(jpeg);
    expect(hash).toMatch(/^[0-9a-f]{20}$/);
    expect(offerObjectKey("offer-1", "photo-1", hash, "image/webp")).toBe(
      `offers/offer-1/photo-1/${hash}.webp`,
    );
    expect(offerObjectKey("offer-1", "photo-1", hash, "image/jpeg", "thumb")).toBe(
      `offers/offer-1/photo-1/${hash}.thumb.jpg`,
    );
  });

  it("rejects a declared JPEG that is not a JPEG", () => {
    expect(() => assertOfferImage(new Uint8Array([0x00, 0x01]), "image/jpeg")).toThrow(
      /JPEG, PNG, or WebP/i,
    );
  });
});
