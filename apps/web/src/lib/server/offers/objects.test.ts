import { describe, expect, it } from "vitest";
import { createR2ObjectStore, type OfferR2Bucket } from "./objects.ts";

describe("R2 object store", () => {
  it("deletes display and thumbnail keys one by one", async () => {
    const deleted: Array<string | string[]> = [];
    const bucket: OfferR2Bucket = {
      async put() {
        return undefined;
      },
      async get() {
        return null;
      },
      async delete(keys) {
        deleted.push(keys);
      },
    };
    await createR2ObjectStore(bucket).deleteMany(["display-key", "thumb-key", "display-key", ""]);
    expect(deleted).toEqual(["display-key", "thumb-key"]);
  });
});
