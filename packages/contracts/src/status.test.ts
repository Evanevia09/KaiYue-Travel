import { describe, expect, it } from "vitest";
import { canTransitionBooking, canTransitionContact } from "./status.ts";

describe("booking transitions", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionBooking("new", "confirmed")).toBe(true);
    expect(canTransitionBooking("confirmed", "in_progress")).toBe(true);
    expect(canTransitionBooking("in_progress", "completed")).toBe(true);
  });

  it("allows cancellation from active states", () => {
    expect(canTransitionBooking("new", "cancelled")).toBe(true);
    expect(canTransitionBooking("confirmed", "cancelled")).toBe(true);
    expect(canTransitionBooking("in_progress", "cancelled")).toBe(true);
  });

  it("rejects reopen and skips", () => {
    expect(canTransitionBooking("cancelled", "new")).toBe(false);
    expect(canTransitionBooking("completed", "confirmed")).toBe(false);
    expect(canTransitionBooking("new", "completed")).toBe(false);
  });
});

describe("contact transitions", () => {
  it("follows new → replied → closed", () => {
    expect(canTransitionContact("new", "replied")).toBe(true);
    expect(canTransitionContact("replied", "closed")).toBe(true);
    expect(canTransitionContact("closed", "new")).toBe(false);
  });
});
