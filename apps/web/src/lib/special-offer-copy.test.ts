import { describe, expect, it } from "vitest";
import { formatOfferFromPrice } from "./special-offer-copy.ts";

describe("formatOfferFromPrice", () => {
  it("shows MOP without changing the stored amount", () => {
    expect(formatOfferFromPrice("en", 88)).toBe("From MOP 88");
    expect(formatOfferFromPrice("pt", 88)).toBe("Desde MOP 88");
    expect(formatOfferFromPrice("zh-Hant", 88)).toBe("MOP 88 起");
    expect(formatOfferFromPrice("en", 88.5)).toBe("From MOP 88.5");
  });
});
