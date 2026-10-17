import { describe, expect, it } from "vitest";
import { adminFetchInit, formatWhen } from "./api.ts";

describe("formatWhen", () => {
  it("formats timestamps in Asia/Macau so SSR and the browser match", () => {
    expect(formatWhen("2026-10-16T04:05:00.000Z")).toBe("16/10/2026, 12:05");
    expect(formatWhen("2026-10-16T04:05:00.000Z", "zh-Hant")).toBe("2026年10月16日 12:05");
  });
});

describe("adminFetchInit", () => {
  it("keeps mutating admin requests alive if the page unloads", () => {
    expect(adminFetchInit().keepalive).toBe(false);
    expect(adminFetchInit({ method: "POST", body: "{}" }).keepalive).toBe(true);
    expect(adminFetchInit({ method: "DELETE" }).keepalive).toBe(true);
  });
});
