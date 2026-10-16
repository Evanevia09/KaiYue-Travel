import { describe, expect, it } from "vitest";
import { editorAfterWrite, offerSaveTarget } from "./offer-editor.ts";

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
});
