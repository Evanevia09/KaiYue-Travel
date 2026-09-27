import { AppError } from "@kaiyue/contracts";
import type { D1Database } from "./env.ts";
import { first } from "./db.ts";
import { bookingToAdmin, getBookingByReference, type BookingRow } from "./bookings.ts";
import type { DriverRow, VehicleRow } from "./inventory.ts";

function inputObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("VALIDATION_FAILED", "Check the booking details.");
  }
  return input as Record<string, unknown>;
}

function nextTimestamp(previous: string): string {
  return new Date(Math.max(Date.now(), Date.parse(previous) + 1)).toISOString();
}

function text(value: unknown, label: string, max: number, required = false): string | null {
  if (value !== null && typeof value !== "string")
    throw new AppError("VALIDATION_FAILED", `Check ${label}.`);
  const cleaned = (value ?? "") as string;
  const trimmed = cleaned.trim();
  if (trimmed.length > max || (required && trimmed.length < 2)) {
    throw new AppError("VALIDATION_FAILED", `Check ${label}.`);
  }
  return trimmed || null;
}

async function audit(
  db: D1Database,
  row: BookingRow,
  kind: string,
  fields: string[],
  actorId: string,
  requestId: string,
  updatedAt: string,
) {
  return db
    .prepare(
      `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
    VALUES (?, 'booking', ?, ?, ?, NULL, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), row.id, kind, actorId, JSON.stringify(fields), requestId, updatedAt);
}

export async function editBooking(
  db: D1Database,
  reference: string,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const row = await getBookingByReference(db, reference);
  if (!row) throw new AppError("NOT_FOUND", "Booking not found.");
  const data = inputObject(input);
  if (data.expectedUpdatedAt !== row.updated_at)
    throw new AppError("CONFLICT", "This booking changed. Refresh and try again.");
  const pickupLocation = text(data.pickupLocation, "pickup location", 200, true)!;
  const destination = text(
    data.destination,
    "destination",
    200,
    row.service_type !== "hourly_charter",
  );
  const pickupAt =
    typeof data.pickupAt === "string" && !Number.isNaN(Date.parse(data.pickupAt))
      ? new Date(data.pickupAt).toISOString()
      : null;
  const returnAt = data.returnAt
    ? typeof data.returnAt === "string" && !Number.isNaN(Date.parse(data.returnAt))
      ? new Date(data.returnAt).toISOString()
      : null
    : null;
  if (!pickupAt || (data.returnAt && !returnAt) || (returnAt && returnAt <= pickupAt))
    throw new AppError("VALIDATION_FAILED", "Check pickup and return times.");
  const passengers = data.passengerCount;
  if (
    typeof passengers !== "number" ||
    !Number.isInteger(passengers) ||
    passengers < 1 ||
    passengers > 14
  )
    throw new AppError("VALIDATION_FAILED", "Passengers must be between 1 and 14.");
  if (row.vehicle_id) {
    const assignedVehicle = await first<VehicleRow>(
      db,
      "SELECT * FROM vehicles WHERE id = ?",
      row.vehicle_id,
    );
    if (assignedVehicle && passengers > assignedVehicle.passenger_capacity) {
      throw new AppError(
        "VALIDATION_FAILED",
        "Passenger count exceeds the assigned vehicle capacity.",
      );
    }
  }
  const contactName = text(data.contactName, "name", 100);
  const phone = text(data.phone, "phone", 32);
  const email = text(data.email, "email", 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError("VALIDATION_FAILED", "Enter a valid email.");
  const message = text(data.message, "message", 2000) ?? "";
  const updatedAt = nextTimestamp(row.updated_at);
  const fields = [
    "pickupLocation",
    "destination",
    "pickupAt",
    "returnAt",
    "passengerCount",
    "contactName",
    "phone",
    "email",
    "message",
  ].filter((name) => {
    const dbKey =
      (
        {
          pickupLocation: "pickup_location",
          pickupAt: "pickup_at",
          returnAt: "return_at",
          passengerCount: "passenger_count",
          contactName: "contact_name",
        } as Record<string, keyof BookingRow>
      )[name] ?? (name as keyof BookingRow);
    const next = (
      {
        pickupLocation,
        destination,
        pickupAt,
        returnAt,
        passengerCount: passengers,
        contactName,
        phone,
        email,
        message,
      } as Record<string, unknown>
    )[name];
    return row[dbKey] !== next;
  });
  if (fields.length === 0) return { booking: bookingToAdmin(row) };
  await db.batch([
    db
      .prepare(
        `UPDATE bookings SET pickup_location=?, destination=?, pickup_at=?, return_at=?, passenger_count=?, contact_name=?, phone=?, phone_display=?, email=?, message=?, updated_at=? WHERE id=? AND updated_at=?`,
      )
      .bind(
        pickupLocation,
        destination,
        pickupAt,
        returnAt,
        passengers,
        contactName,
        phone,
        phone,
        email,
        message,
        updatedAt,
        row.id,
        row.updated_at,
      ),
    await audit(db, row, "details_edit", fields, actorId, requestId, updatedAt),
  ]);
  const updated = await getBookingByReference(db, reference);
  return { booking: bookingToAdmin(updated!) };
}

export async function assignBooking(
  db: D1Database,
  reference: string,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const row = await getBookingByReference(db, reference);
  if (!row) throw new AppError("NOT_FOUND", "Booking not found.");
  const data = inputObject(input);
  if (data.expectedUpdatedAt !== row.updated_at)
    throw new AppError("CONFLICT", "This booking changed. Refresh and try again.");
  const driverId =
    data.driverId === null ? null : typeof data.driverId === "string" ? data.driverId : undefined;
  const vehicleId =
    data.vehicleId === null
      ? null
      : typeof data.vehicleId === "string"
        ? data.vehicleId
        : undefined;
  if (driverId === undefined || vehicleId === undefined || Boolean(driverId) !== Boolean(vehicleId))
    throw new AppError("VALIDATION_FAILED", "Choose both a driver and vehicle, or clear both.");
  if (driverId && vehicleId) {
    const [driver, vehicle] = await Promise.all([
      first<DriverRow>(db, "SELECT * FROM drivers WHERE id = ?", driverId),
      first<VehicleRow>(db, "SELECT * FROM vehicles WHERE id = ?", vehicleId),
    ]);
    if (!driver?.active || !vehicle?.active)
      throw new AppError("VALIDATION_FAILED", "Choose active driver and vehicle records.");
    if (vehicle.passenger_capacity < row.passenger_count)
      throw new AppError("VALIDATION_FAILED", "Vehicle capacity is below passenger count.");
  }
  if (row.driver_id === driverId && row.vehicle_id === vehicleId)
    return { booking: bookingToAdmin(row) };
  const updatedAt = nextTimestamp(row.updated_at);
  await db.batch([
    db
      .prepare(
        "UPDATE bookings SET driver_id=?, vehicle_id=?, updated_at=? WHERE id=? AND updated_at=?",
      )
      .bind(driverId, vehicleId, updatedAt, row.id, row.updated_at),
    await audit(
      db,
      row,
      "assignment_change",
      ["driverId", "vehicleId"],
      actorId,
      requestId,
      updatedAt,
    ),
  ]);
  const updated = await getBookingByReference(db, reference);
  return { booking: bookingToAdmin(updated!) };
}
