export type AssignmentIds = {
  driverId: string | null;
  vehicleId: string | null;
};

export const ASSIGNMENT_PAIR_ERROR = "Choose both a driver and vehicle, or clear both.";
export const ASSIGNMENT_REQUIRED_ERROR = "Choose a driver and a vehicle.";

export function emptyToNull(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asId(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

export function parseAssignmentInput(data: Record<string, unknown>): AssignmentIds | null {
  const driverId = asId(data.driverId);
  const vehicleId = asId(data.vehicleId);
  if (driverId === undefined || vehicleId === undefined) return null;
  return { driverId, vehicleId };
}

export function assignmentValidationError(
  current: AssignmentIds,
  next: AssignmentIds,
): string | null {
  if (Boolean(next.driverId) !== Boolean(next.vehicleId)) {
    return ASSIGNMENT_PAIR_ERROR;
  }
  if (!next.driverId && !next.vehicleId && !current.driverId && !current.vehicleId) {
    return ASSIGNMENT_REQUIRED_ERROR;
  }
  return null;
}
