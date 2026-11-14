import { describe, expect, it } from "vitest";
import {
  ASSIGNMENT_PAIR_ERROR,
  ASSIGNMENT_REQUIRED_ERROR,
  assignmentValidationError,
  emptyToNull,
  parseAssignmentInput,
} from "./assignment.ts";

describe("assignment validation", () => {
  it("rejects saving with no driver and no vehicle when nothing is assigned", () => {
    expect(
      assignmentValidationError(
        { driverId: null, vehicleId: null },
        { driverId: null, vehicleId: null },
      ),
    ).toBe(ASSIGNMENT_REQUIRED_ERROR);
  });

  it("still allows clearing an existing assignment", () => {
    expect(
      assignmentValidationError(
        { driverId: "driver-1", vehicleId: "vehicle-1" },
        { driverId: null, vehicleId: null },
      ),
    ).toBeNull();
  });

  it("requires driver and vehicle together", () => {
    expect(
      assignmentValidationError(
        { driverId: null, vehicleId: null },
        { driverId: "driver-1", vehicleId: null },
      ),
    ).toBe(ASSIGNMENT_PAIR_ERROR);
    expect(
      assignmentValidationError(
        { driverId: null, vehicleId: null },
        { driverId: null, vehicleId: "vehicle-1" },
      ),
    ).toBe(ASSIGNMENT_PAIR_ERROR);
  });

  it("accepts a paired assignment", () => {
    expect(
      assignmentValidationError(
        { driverId: null, vehicleId: null },
        { driverId: "driver-1", vehicleId: "vehicle-1" },
      ),
    ).toBeNull();
  });

  it("reads empty form values as null and rejects incomplete JSON", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("driver-1")).toBe("driver-1");
    expect(parseAssignmentInput({ driverId: "driver-1" })).toBeNull();
    expect(parseAssignmentInput({ driverId: null, vehicleId: null })).toEqual({
      driverId: null,
      vehicleId: null,
    });
  });
});
