import { describe, expect, it } from "vitest";
import {
  editorAfterWrite,
  filesFromDataTransfer,
  offerSaveTarget,
  takeInputFiles,
  withMainPhoto,
  withOfferStatus,
  withoutPhoto,
} from "./offer-editor.ts";

describe("offer photo file inputs", () => {
  it("copies the live FileList before the input value is cleared", () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "harbour.jpg", {
      type: "image/jpeg",
    });
    let value = "harbour.jpg";
    const input = {
      get files() {
        if (!value) {
          return Object.assign([] as File[], { item: () => null }) as unknown as FileList;
        }
        const list = [file];
        return Object.assign(list, {
          item: (index: number) => list[index] ?? null,
        }) as unknown as FileList;
      },
      get value() {
        return value;
      },
      set value(next: string) {
        value = next;
      },
    };

    const copied = takeInputFiles(input);
    expect(copied).toHaveLength(1);
    expect(copied[0]?.name).toBe("harbour.jpg");
    expect(input.value).toBe("");
    expect(Array.from(input.files ?? [])).toHaveLength(0);
  });

  it("reads dropped files from a data transfer list", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "drop.jpg", { type: "image/jpeg" });
    const data = { files: [file] } as unknown as DataTransfer;
    expect(filesFromDataTransfer(data)).toEqual([file]);
    expect(filesFromDataTransfer(null)).toEqual([]);
  });
});

describe("offer editor save target", () => {
  it("switches Create draft onto the saved offer so a second click patches instead of posting another draft", () => {
    let editingId: string | null = null;
    expect(offerSaveTarget(editingId)).toEqual({
      method: "POST",
      path: "/api/admin/offers",
    });

    const created = editorAfterWrite({ id: "offer-harbour", title: "Harbour" });
    editingId = created.id;

    expect(offerSaveTarget(editingId)).toEqual({
      method: "PATCH",
      path: "/api/admin/offers/offer-harbour",
    });
    expect(offerSaveTarget(editingId).path).not.toBe("/api/admin/offers");
  });

  it("optimistically swaps the main photo and restores a main photo after a delete", () => {
    const offer = {
      id: "offer-1",
      status: "draft" as "draft" | "published",
      photos: [
        { id: "a", isMain: true },
        { id: "b", isMain: false },
      ],
    };
    expect(withMainPhoto(offer, "b").photos.map((photo) => photo.isMain)).toEqual([false, true]);
    expect(withoutPhoto(offer, "a").photos).toEqual([{ id: "b", isMain: true }]);
    expect(withOfferStatus(offer, "draft").status).toBe("draft");
    const published: typeof offer = { ...offer, status: "published" };
    expect(withOfferStatus(published, "draft").status).toBe("draft");
  });
});
