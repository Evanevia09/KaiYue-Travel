import { describe, expect, it } from "vitest";
import { bookingsStatusPath, locationPath, statusFromSearch } from "./list-query.ts";

describe("bookings status URL", () => {
  it("reads a valid status and ignores unknown values", () => {
    expect(statusFromSearch("?status=enquiry")).toBe("enquiry");
    expect(statusFromSearch("status=assigned")).toBe("assigned");
    expect(statusFromSearch("?status=nope")).toBe("");
    expect(statusFromSearch("")).toBe("");
  });

  it("builds a list path that dashboard KPI deep links can share", () => {
    expect(bookingsStatusPath("enquiry")).toBe("/admin/bookings?status=enquiry");
    expect(bookingsStatusPath("")).toBe("/admin/bookings");
    expect(bookingsStatusPath("nope")).toBe("/admin/bookings");
    expect(locationPath("/admin/bookings", "?status=completed")).toBe(
      "/admin/bookings?status=completed",
    );
  });
});
