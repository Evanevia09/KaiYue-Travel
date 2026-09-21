import { AppError, BOOKING_STATUSES, CONTACT_STATUSES } from "@kaiyue/contracts";
import type { AppEnv, D1Database } from "./env.ts";
import { businessTimezone } from "./env.ts";
import { all, first, nowIso, run } from "./db.ts";
import { readJson } from "./http.ts";
import {
  bookingToAdmin,
  getBookingByReference,
  listBookings,
  updateBookingStatus,
  type BookingRow,
} from "./bookings.ts";
import { contactToAdmin, listContacts, updateContactStatus, type ContactRow } from "./contacts.ts";

function startOfToday(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return `${parts}T00:00:00.000Z`;
}

export async function adminSummary(env: AppEnv) {
  const timezone = businessTimezone(env);
  const today = startOfToday(timezone);
  const [
    newBookingsToday,
    assignedUpcoming,
    completedThisMonth,
    cancelledThisMonth,
    newInquiries,
    notificationFailures,
    recent,
  ] = await Promise.all([
    first<{ count: number }>(
      env.DB,
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'enquiry' AND created_at >= ?",
      today,
    ),
    first<{ count: number }>(
      env.DB,
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'assigned' AND pickup_at >= ?",
      new Date().toISOString(),
    ),
    first<{ count: number }>(
      env.DB,
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed' AND updated_at >= ?",
      today.slice(0, 8) + "01T00:00:00.000Z",
    ),
    first<{ count: number }>(
      env.DB,
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'cancelled' AND updated_at >= ?",
      today.slice(0, 8) + "01T00:00:00.000Z",
    ),
    first<{ count: number }>(env.DB, "SELECT COUNT(*) as count FROM contacts WHERE status = 'new'"),
    first<{ count: number }>(
      env.DB,
      "SELECT COUNT(*) as count FROM bookings WHERE notification_state IN ('failed', 'pending')",
    ),
    all<BookingRow>(env.DB, "SELECT * FROM bookings ORDER BY created_at DESC LIMIT 8"),
  ]);

  return {
    timezone,
    newBookingsToday: newBookingsToday?.count ?? 0,
    assignedUpcoming: assignedUpcoming?.count ?? 0,
    completedThisMonth: completedThisMonth?.count ?? 0,
    cancelledThisMonth: cancelledThisMonth?.count ?? 0,
    newInquiries: newInquiries?.count ?? 0,
    notificationFailures: notificationFailures?.count ?? 0,
    recent: recent.map(bookingToAdmin),
  };
}

export async function addNote(
  db: D1Database,
  entityType: "booking" | "contact",
  entityId: string,
  body: string,
  actorId: string,
) {
  const trimmed = body.trim();
  if (trimmed.length < 2 || trimmed.length > 1000) {
    throw new AppError("VALIDATION_FAILED", "Note must be between 2 and 1000 characters.", {
      fields: { body: "Enter a short internal note." },
    });
  }
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await run(
    db,
    `INSERT INTO admin_notes (id, entity_type, entity_id, body, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    entityType,
    entityId,
    trimmed,
    actorId,
    createdAt,
  );
  return { id, entityType, entityId, body: trimmed, createdBy: actorId, createdAt };
}

export async function listNotes(
  db: D1Database,
  entityType: "booking" | "contact",
  entityId: string,
) {
  return all<{
    id: string;
    body: string;
    created_by: string;
    created_at: string;
  }>(
    db,
    "SELECT id, body, created_by, created_at FROM admin_notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
    entityType,
    entityId,
  );
}

export async function listEvents(
  db: D1Database,
  entityType: "booking" | "contact",
  entityId: string,
) {
  return all<{
    id: string;
    event_type: string;
    actor_id: string;
    from_value: string | null;
    to_value: string | null;
    created_at: string;
  }>(
    db,
    "SELECT id, event_type, actor_id, from_value, to_value, created_at FROM audit_events WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC",
    entityType,
    entityId,
  );
}

export async function handleAdminBookingsList(request: Request, env: AppEnv) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  if (status && !BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])) {
    throw new AppError("VALIDATION_FAILED", "Unknown booking status.");
  }
  const result = await listBookings(env.DB, {
    status,
    serviceType: url.searchParams.get("serviceType") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20),
  });
  return {
    items: result.items.map(bookingToAdmin),
    nextCursor: result.nextCursor,
  };
}

export async function handleAdminBookingDetail(env: AppEnv, reference: string) {
  const row = await getBookingByReference(env.DB, reference);
  if (!row) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  const [notes, events] = await Promise.all([
    listNotes(env.DB, "booking", row.id),
    listEvents(env.DB, "booking", row.id),
  ]);
  return { booking: bookingToAdmin(row), notes, events };
}

export async function handleAdminBookingStatus(
  request: Request,
  env: AppEnv,
  reference: string,
  actorId: string,
  requestId: string,
) {
  const row = await getBookingByReference(env.DB, reference);
  if (!row) {
    throw new AppError("NOT_FOUND", "Booking not found.");
  }
  const body = (await readJson(request)) as { status?: string };
  if (
    !body.status ||
    !BOOKING_STATUSES.includes(body.status as (typeof BOOKING_STATUSES)[number])
  ) {
    throw new AppError("VALIDATION_FAILED", "Choose a valid status.");
  }
  const updated = await updateBookingStatus(
    env.DB,
    row,
    body.status as (typeof BOOKING_STATUSES)[number],
    actorId,
    requestId,
  );
  return { booking: bookingToAdmin(updated) };
}

export async function handleAdminContactsList(request: Request, env: AppEnv) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  if (status && !CONTACT_STATUSES.includes(status as (typeof CONTACT_STATUSES)[number])) {
    throw new AppError("VALIDATION_FAILED", "Unknown inquiry status.");
  }
  const result = await listContacts(env.DB, {
    status,
    inquiryType: url.searchParams.get("inquiryType") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20),
  });
  return {
    items: result.items.map(contactToAdmin),
    nextCursor: result.nextCursor,
  };
}

export async function handleAdminContactDetail(env: AppEnv, id: string) {
  const row = await first<ContactRow>(
    env.DB,
    "SELECT * FROM contacts WHERE id = ? OR reference = ?",
    id,
    id,
  );
  if (!row) {
    throw new AppError("NOT_FOUND", "Inquiry not found.");
  }
  const [notes, events] = await Promise.all([
    listNotes(env.DB, "contact", row.id),
    listEvents(env.DB, "contact", row.id),
  ]);
  return { contact: contactToAdmin(row), notes, events };
}

export async function handleAdminContactStatus(
  request: Request,
  env: AppEnv,
  id: string,
  actorId: string,
  requestId: string,
) {
  const existing = await first<ContactRow>(
    env.DB,
    "SELECT * FROM contacts WHERE id = ? OR reference = ?",
    id,
    id,
  );
  if (!existing) {
    throw new AppError("NOT_FOUND", "Inquiry not found.");
  }
  const body = (await readJson(request)) as { status?: string };
  if (
    !body.status ||
    !CONTACT_STATUSES.includes(body.status as (typeof CONTACT_STATUSES)[number])
  ) {
    throw new AppError("VALIDATION_FAILED", "Choose a valid status.");
  }
  const updated = await updateContactStatus(
    env.DB,
    existing,
    body.status as (typeof CONTACT_STATUSES)[number],
    actorId,
    requestId,
  );
  return { contact: contactToAdmin(updated) };
}
