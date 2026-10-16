import { describe, expect, it } from "vitest";
import {
  editorAfterWrite,
  offerSaveTarget,
  withMainPhoto,
  withOfferStatus,
  withoutPhoto,
} from "./offer-editor.ts";

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
