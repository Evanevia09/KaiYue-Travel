import { describe, expect, it } from "vitest";
import {
  decodeCreatedCursor,
  encodeCreatedCursor,
  likePattern,
  parseSearchQuery,
  parseUpdatedSince,
} from "./admin-list-query.ts";

describe("admin list query validation", () => {
  it("accepts trimmed search terms of 2-100 characters and rejects others", () => {
    expect(parseSearchQuery(null)).toBeUndefined();
    expect(parseSearchQuery("")).toBeUndefined();
    expect(parseSearchQuery("  KY-AB  ")).toBe("KY-AB");
    expect(() => parseSearchQuery(" a ")).toThrow(/2 and 100/);
    expect(() => parseSearchQuery("x".repeat(101))).toThrow(/2 and 100/);
  });

  it("escapes LIKE wildcards so user input is literal", () => {
    expect(likePattern("50%_off\\")).toBe("%50\\%\\_off\\\\%");
  });

  it("normalises zoned ISO datetimes to UTC and rejects anything else", () => {
    expect(parseUpdatedSince(null)).toBeUndefined();
    expect(parseUpdatedSince("2026-11-16T19:00:00+08:00")).toBe("2026-11-16T11:00:00.000Z");
    expect(parseUpdatedSince("2026-11-16T11:00:00Z")).toBe("2026-11-16T11:00:00.000Z");
    for (const bad of ["2026-11-16", "2026-11-16T11:00:00", "yesterday", "1700000000"]) {
      expect(() => parseUpdatedSince(bad), bad).toThrow(/updatedSince/);
    }
  });

  it("round-trips an opaque created_at/id cursor and rejects tampering", () => {
    const cursor = encodeCreatedCursor({ createdAt: "2026-11-16T11:00:00.000Z", id: "c1" });
    expect(decodeCreatedCursor(cursor)).toEqual({
      createdAt: "2026-11-16T11:00:00.000Z",
      id: "c1",
    });
    expect(() => decodeCreatedCursor("not-base64!")).toThrow(/cursor/);
    expect(() => decodeCreatedCursor(btoa(JSON.stringify({ createdAt: 1 })))).toThrow(/cursor/);
  });
});
