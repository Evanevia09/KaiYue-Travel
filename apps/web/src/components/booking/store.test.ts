import { describe, expect, it } from "vitest";
import { emptyDraft, isDirty } from "./store.ts";

describe("booking draft", () => {
  it("is clean when empty and dirty after journey input", () => {
    expect(isDirty(emptyDraft())).toBe(false);
    expect(isDirty({ ...emptyDraft(), pickupLocation: "Airport" })).toBe(true);
  });
});
