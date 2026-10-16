import { AppError, OFFER_IMAGE_MAX_BYTES, OFFER_ORIGINAL_MAX_BYTES } from "@kaiyue/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { optimizeOfferPhoto } from "./offer-image.ts";

describe("optimizeOfferPhoto", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects originals over 25 MB before resizing", async () => {
    const file = new File([new Uint8Array(OFFER_ORIGINAL_MAX_BYTES + 1)], "huge.jpg", {
      type: "image/jpeg",
    });
    await expect(optimizeOfferPhoto(file)).rejects.toMatchObject({
      message: "Each original photo must be 25 MB or smaller.",
    });
  });

  it("accepts a 6 MB original when the resized output stays under 5 MB", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      async () =>
        ({
          width: 4000,
          height: 3000,
          close() {},
        }) as ImageBitmap,
    );
    class FakeOffscreenCanvas {
      width: number;
      height: number;
      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }
      getContext() {
        return { drawImage() {} };
      }
      convertToBlob() {
        return Promise.resolve(new Blob([new Uint8Array(24_000)], { type: "image/webp" }));
      }
    }
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "phone.jpg", { type: "image/jpeg" });
    const result = await optimizeOfferPhoto(file);
    expect(result.display.width).toBe(1600);
    expect(result.display.height).toBe(1200);
    expect(result.display.file.size).toBeLessThan(OFFER_IMAGE_MAX_BYTES);
    expect(result.thumbnail.file.size).toBeLessThan(OFFER_IMAGE_MAX_BYTES);
  });

  it("shows a resize error instead of returning the original when encoding fails", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      async () =>
        ({
          width: 4000,
          height: 3000,
          close() {},
        }) as ImageBitmap,
    );
    class FakeOffscreenCanvas {
      constructor(
        public width: number,
        public height: number,
      ) {}
      getContext() {
        return { drawImage() {} };
      }
      convertToBlob() {
        return Promise.reject(new Error("encode failed"));
      }
    }
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    const file = new File([new Uint8Array(1200)], "phone.jpg", { type: "image/jpeg" });
    await expect(optimizeOfferPhoto(file)).rejects.toBeInstanceOf(AppError);
    await expect(optimizeOfferPhoto(file)).rejects.toThrow(/Could not resize this photo/);
  });
});
