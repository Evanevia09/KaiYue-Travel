import { describe, expect, it } from "vitest";
import { formatWhen } from "./api.ts";

describe("formatWhen", () => {
  it("formats timestamps in Asia/Macau so SSR and the browser match", () => {
    expect(formatWhen("2026-10-16T04:05:00.000Z")).toBe("16/10/2026, 12:05");
  });
});
