import { describe, expect, it } from "vitest";
import { canTransitionBooking, canTransitionContact } from "./status.ts";

describe("booking transitions", () => {
  it("allows the documented happy path", () => {
    expect(canTransitionBooking("enquiry", "assigned")).toBe(true);
    expect(canTransitionBooking("assigned", "completed")).toBe(true);
  });

  it("allows cancellation from active states", () => {
    expect(canTransitionBooking("enquiry", "cancelled")).toBe(true);
    expect(canTransitionBooking("assigned", "cancelled")).toBe(true);
  });

  it("rejects reopen and skips", () => {
    expect(canTransitionBooking("cancelled", "enquiry")).toBe(false);
    expect(canTransitionBooking("completed", "assigned")).toBe(false);
    expect(canTransitionBooking("enquiry", "completed")).toBe(false);
  });
});

describe("contact transitions", () => {
  it("follows new → replied → closed", () => {
    expect(canTransitionContact("new", "replied")).toBe(true);
    expect(canTransitionContact("replied", "closed")).toBe(true);
    expect(canTransitionContact("closed", "new")).toBe(false);
  });
});
