import { AppError } from "@kaiyue/contracts";
import type { D1Database } from "./env.ts";
import { all, first, nowIso, run } from "./db.ts";

export type DriverRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

export type VehicleRow = {
  id: string;
  plate_number: string;
  make_model: string;
  passenger_capacity: number;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

type Resource = "driver" | "vehicle";

function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("VALIDATION_FAILED", "Check the record details.");
  }
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, field: string, max: number): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 2 || text.length > max) {
    throw new AppError("VALIDATION_FAILED", `Enter a valid ${field}.`, {
      fields: { [field]: `Use 2–${max} characters.` },
    });
  }
  return text;
}

function optionalText(value: unknown, field: string, max: number): string | null {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || value.trim().length > max) {
    throw new AppError("VALIDATION_FAILED", `Enter a valid ${field}.`);
  }
  return value.trim() || null;
}

function phone(value: unknown, field: string, required = false): string | null {
  const text = optionalText(value, field, 32);
  if (required && !text) {
    throw new AppError("VALIDATION_FAILED", `Enter a ${field}.`, {
      fields: { [field]: "Required." },
    });
  }
  if (text && !/^\+?[0-9][0-9 +().-]{5,31}$/.test(text)) {
    throw new AppError("VALIDATION_FAILED", `Enter a valid ${field}.`);
  }
  return text;
}

function email(value: unknown): string | null {
  const text = optionalText(value, "email", 160)?.toLowerCase() ?? null;
  if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
    throw new AppError("VALIDATION_FAILED", "Enter a valid email address.");
  }
  return text;
}

function active(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (value === true) return 1;
  if (value === false) return 0;
  throw new AppError("VALIDATION_FAILED", "Choose an active state.");
}

function capacity(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 14) {
    throw new AppError("VALIDATION_FAILED", "Passenger capacity must be between 1 and 14.");
  }
  return Number(value);
}

export function driverToAdmin(row: DriverRow) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  };
}

export function vehicleToAdmin(row: VehicleRow) {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    makeModel: row.make_model,
    passengerCapacity: row.passenger_capacity,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    notes: row.notes,
    active: Boolean(row.active),
    updatedAt: row.updated_at,
  };
}

async function audit(
  db: D1Database,
  resourceType: Resource,
  resourceId: string,
  eventType: string,
  changedFields: string[],
  actorId: string,
  requestId: string,
) {
  await run(
    db,
    `INSERT INTO inventory_audit_events
      (id, resource_type, resource_id, event_type, actor_id, changed_fields, request_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    resourceType,
    resourceId,
    eventType,
    JSON.stringify(changedFields),
    actorId,
    requestId,
    nowIso(),
  );
}

export async function listDrivers(db: D1Database) {
  return (
    await all<DriverRow>(db, "SELECT * FROM drivers ORDER BY active DESC, name ASC LIMIT 200")
  ).map(driverToAdmin);
}

export async function listVehicles(db: D1Database) {
  return (
    await all<VehicleRow>(
      db,
      "SELECT * FROM vehicles ORDER BY active DESC, plate_number ASC LIMIT 200",
    )
  ).map(vehicleToAdmin);
}

export async function createDriver(
  db: D1Database,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const data = objectInput(input);
  const id = crypto.randomUUID();
  const name = requiredText(data.name, "name", 100);
  const contactPhone = phone(data.phone, "phone", true)!;
  const contactEmail = email(data.email);
  const notes = optionalText(data.notes, "notes", 500);
  const isActive = active(data.active, 1);
  const createdAt = nowIso();
  await run(
    db,
    `INSERT INTO drivers (id, name, phone, email, notes, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    name,
    contactPhone,
    contactEmail,
    notes,
    isActive,
    createdAt,
    createdAt,
  );
  await audit(db, "driver", id, "created", ["name", "phone", "email", "notes"], actorId, requestId);
  return driverToAdmin((await first<DriverRow>(db, "SELECT * FROM drivers WHERE id = ?", id))!);
}

export async function updateDriver(
  db: D1Database,
  id: string,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const previous = await first<DriverRow>(db, "SELECT * FROM drivers WHERE id = ?", id);
  if (!previous) throw new AppError("NOT_FOUND", "Driver not found.");
  const data = objectInput(input);
  const next = {
    name: data.name === undefined ? previous.name : requiredText(data.name, "name", 100),
    phone: data.phone === undefined ? previous.phone : phone(data.phone, "phone", true)!,
    email: data.email === undefined ? previous.email : email(data.email),
    notes: data.notes === undefined ? previous.notes : optionalText(data.notes, "notes", 500),
    active: active(data.active, previous.active),
  };
  const changed = (Object.keys(next) as Array<keyof typeof next>).filter(
    (key) => next[key] !== previous[key],
  );
  if (!changed.length) return driverToAdmin(previous);
  await run(
    db,
    "UPDATE drivers SET name = ?, phone = ?, email = ?, notes = ?, active = ?, updated_at = ? WHERE id = ?",
    next.name,
    next.phone,
    next.email,
    next.notes,
    next.active,
    nowIso(),
    id,
  );
  await audit(db, "driver", id, "updated", changed, actorId, requestId);
  return driverToAdmin((await first<DriverRow>(db, "SELECT * FROM drivers WHERE id = ?", id))!);
}

export async function createVehicle(
  db: D1Database,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const data = objectInput(input);
  const id = crypto.randomUUID();
  const plate = requiredText(data.plateNumber, "plateNumber", 32).toUpperCase();
  const model = requiredText(data.makeModel, "makeModel", 100);
  const seats = capacity(data.passengerCapacity);
  const contactName = optionalText(data.contactName, "contactName", 100);
  const contactPhone = phone(data.contactPhone, "contactPhone");
  const notes = optionalText(data.notes, "notes", 500);
  const isActive = active(data.active, 1);
  const createdAt = nowIso();
  try {
    await run(
      db,
      `INSERT INTO vehicles (id, plate_number, make_model, passenger_capacity, contact_name, contact_phone, notes, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      plate,
      model,
      seats,
      contactName,
      contactPhone,
      notes,
      isActive,
      createdAt,
      createdAt,
    );
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new AppError("CONFLICT", "A vehicle with this plate already exists.");
    throw error;
  }
  await audit(
    db,
    "vehicle",
    id,
    "created",
    ["plateNumber", "makeModel", "passengerCapacity", "contactName", "contactPhone", "notes"],
    actorId,
    requestId,
  );
  return vehicleToAdmin((await first<VehicleRow>(db, "SELECT * FROM vehicles WHERE id = ?", id))!);
}

export async function updateVehicle(
  db: D1Database,
  id: string,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const previous = await first<VehicleRow>(db, "SELECT * FROM vehicles WHERE id = ?", id);
  if (!previous) throw new AppError("NOT_FOUND", "Vehicle not found.");
  const data = objectInput(input);
  const next = {
    plate_number:
      data.plateNumber === undefined
        ? previous.plate_number
        : requiredText(data.plateNumber, "plateNumber", 32).toUpperCase(),
    make_model:
      data.makeModel === undefined
        ? previous.make_model
        : requiredText(data.makeModel, "makeModel", 100),
    passenger_capacity:
      data.passengerCapacity === undefined
        ? previous.passenger_capacity
        : capacity(data.passengerCapacity),
    contact_name:
      data.contactName === undefined
        ? previous.contact_name
        : optionalText(data.contactName, "contactName", 100),
    contact_phone:
      data.contactPhone === undefined
        ? previous.contact_phone
        : phone(data.contactPhone, "contactPhone"),
    notes: data.notes === undefined ? previous.notes : optionalText(data.notes, "notes", 500),
    active: active(data.active, previous.active),
  };
  const changed = (Object.keys(next) as Array<keyof typeof next>).filter(
    (key) => next[key] !== previous[key],
  );
  if (!changed.length) return vehicleToAdmin(previous);
  try {
    await run(
      db,
      "UPDATE vehicles SET plate_number = ?, make_model = ?, passenger_capacity = ?, contact_name = ?, contact_phone = ?, notes = ?, active = ?, updated_at = ? WHERE id = ?",
      next.plate_number,
      next.make_model,
      next.passenger_capacity,
      next.contact_name,
      next.contact_phone,
      next.notes,
      next.active,
      nowIso(),
      id,
    );
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      throw new AppError("CONFLICT", "A vehicle with this plate already exists.");
    throw error;
  }
  await audit(db, "vehicle", id, "updated", changed, actorId, requestId);
  return vehicleToAdmin((await first<VehicleRow>(db, "SELECT * FROM vehicles WHERE id = ?", id))!);
}
