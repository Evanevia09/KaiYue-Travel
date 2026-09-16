import { describe, expect, it } from "vitest";
import { isPlausiblePhone, normalizePhone } from "./phone.ts";

describe("phone", () => {
  it("keeps a leading plus and strips separators", () => {
    expect(normalizePhone("+853 2833 8882")).toBe("+85328338882");
  });

  it("rejects short numbers", () => {
    expect(isPlausiblePhone("12345")).toBe(false);
    expect(isPlausiblePhone("+85328338882")).toBe(true);
  });
});
