import {
  AppError,
  BOOKING_STATUSES,
  CONTACT_STATUSES,
  type BookingStatus,
} from "@kaiyue/contracts";
import { parseSearchQuery, parseUpdatedSince } from "./admin-list-query.ts";
import type { AppEnv, D1Database } from "./env.ts";
import { businessTimezone } from "./env.ts";
import { all, first, nowIso } from "./db.ts";
import { readJson } from "./http.ts";
import {
  bookingAdminColumns,
  bookingMailDetails,
  bookingStatusSql,
  bookingToAdmin,
  claimLifecycleMailSend,
  getBookingByReference,
  markLifecycleMailSkipped,
  listBookings,
  setLifecycleMailState,
  updateBookingStatus,
  type BookingRow,
  type LifecycleMailKind,
  type LifecycleMailState,
} from "./bookings.ts";
import { contactToAdmin, listContacts, updateContactStatus, type ContactRow } from "./contacts.ts";
import { sendLifecycleCustomerMail } from "./notifications.ts";

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

function countFrom(result: { results?: unknown[] } | undefined): number {
  const row = result?.results?.[0];
  if (!row || typeof row !== "object" || !("count" in row)) return 0;
  return Number(row.count ?? 0);
}

export async function adminSummary(env: AppEnv) {
  const timezone = businessTimezone(env);
  const today = startOfToday(timezone);
  const monthStart = `${today.slice(0, 8)}01T00:00:00.000Z`;
  const results = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) as count FROM bookings WHERE ${bookingStatusSql} = 'enquiry' AND created_at >= ?`,
    ).bind(today),
    env.DB.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'assigned' AND pickup_at >= ?",
    ).bind(new Date().toISOString()),
    env.DB.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE status = 'completed' AND updated_at >= ?",
    ).bind(monthStart),
    env.DB.prepare(
      `SELECT COUNT(*) as count FROM bookings WHERE ${bookingStatusSql} = 'cancelled' AND updated_at >= ?`,
    ).bind(monthStart),
    env.DB.prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'"),
    env.DB.prepare(
      "SELECT COUNT(*) as count FROM bookings WHERE notification_state IN ('failed', 'pending')",
    ),
    env.DB.prepare(`SELECT ${bookingAdminColumns} FROM bookings ORDER BY created_at DESC LIMIT 8`),
  ]);

  return {
    timezone,
    newBookingsToday: countFrom(results[0]),
    assignedUpcoming: countFrom(results[1]),
    completedThisMonth: countFrom(results[2]),
    cancelledThisMonth: countFrom(results[3]),
    newInquiries: countFrom(results[4]),
    notificationFailures: countFrom(results[5]),
    recent: ((results[6]?.results ?? []) as BookingRow[]).map(bookingToAdmin),
  };
}

export async function addNote(
  db: D1Database,
  entityType: "booking" | "contact",
  entityId: string,
  body: string,
  actorId: string,
  requestId: string,
) {
  const trimmed = body.trim();
  if (trimmed.length < 2 || trimmed.length > 1000) {
    throw new AppError("VALIDATION_FAILED", "Note must be between 2 and 1000 characters.", {
      fields: { body: "Enter a short internal note." },
    });
  }
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await db.batch([
    db
      .prepare(
        `INSERT INTO admin_notes (id, entity_type, entity_id, body, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, entityType, entityId, trimmed, actorId, createdAt),
    db
      .prepare(
        `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         VALUES (?, ?, ?, 'note_added', ?, NULL, NULL, ?, ?)`,
      )
      .bind(crypto.randomUUID(), entityType, entityId, actorId, requestId, createdAt),
  ]);
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
    q: parseSearchQuery(url.searchParams.get("q")),
    updatedSince: parseUpdatedSince(url.searchParams.get("updatedSince")),
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20),
  });
  return {
    items: result.items.map(bookingToAdmin),
    nextCursor: result.nextCursor,
    total: result.total,
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
  const body = (await readJson(request)) as { status?: string; expectedUpdatedAt?: string };
  if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== row.updated_at) {
    throw new AppError("CONFLICT", "This booking changed. Refresh and try again.");
  }
  if (
    !body.status ||
    !BOOKING_STATUSES.includes(body.status as (typeof BOOKING_STATUSES)[number])
  ) {
    throw new AppError("VALIDATION_FAILED", "Choose a valid status.");
  }
  const nextStatus = body.status as (typeof BOOKING_STATUSES)[number];
  const updated = await updateBookingStatus(env.DB, row, nextStatus, actorId, requestId);
  if (nextStatus === "confirmed" || nextStatus === "cancelled") {
    await deliverLifecycleMail(env, updated, nextStatus, requestId, {
      id: actorId,
      requestId,
    });
    const afterMail = await getBookingByReference(env.DB, updated.reference);
    return { booking: bookingToAdmin(afterMail ?? updated) };
  }
  return { booking: bookingToAdmin(updated) };
}

export async function handleAdminLifecycleMail(
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
  const body = (await readJson(request)) as { kind?: string };
  if (body.kind !== "confirmed" && body.kind !== "cancelled") {
    throw new AppError("VALIDATION_FAILED", "Choose confirmed or cancelled guest email.");
  }
  const kind: LifecycleMailKind = body.kind;
  const workflow = (row.decision_status ?? row.status) as BookingStatus;
  if (workflow !== kind) {
    throw new AppError(
      "INVALID_TRANSITION",
      `Guest ${kind} email can only be retried when the booking is ${kind}.`,
    );
  }
  const outcome = await deliverLifecycleMail(env, row, kind, requestId, {
    id: actorId,
    requestId,
  });
  if (outcome === "stale") {
    throw new AppError("CONFLICT", "This booking changed. Refresh and try again.");
  }
  if (outcome === "pending") {
    throw new AppError(
      "CONFLICT",
      "Guest email delivery is unconfirmed. Do not resend this message.",
    );
  }
  if (outcome === "skipped") {
    throw new AppError("CONFLICT", "Guest email is not sent for this booking channel.");
  }
  const after = await getBookingByReference(env.DB, row.reference);
  return { booking: bookingToAdmin(after ?? row), mailState: outcome };
}

async function deliverLifecycleMail(
  env: AppEnv,
  row: BookingRow,
  kind: LifecycleMailKind,
  requestId: string,
  actor: { id: string; requestId: string },
): Promise<LifecycleMailState | "stale"> {
  if (row.communication_channel !== "email") {
    const skipped = await markLifecycleMailSkipped(env.DB, row, kind, actor);
    switch (skipped) {
      case "claimed":
      case "stale":
        return "stale";
      case "sent":
      case "skipped":
      case "pending":
      case "failed":
        return skipped;
      default: {
        const unreachable: never = skipped;
        return unreachable;
      }
    }
  }
  const claim = await claimLifecycleMailSend(env.DB, row, kind, actor);
  switch (claim) {
    case "claimed":
      break;
    case "stale":
      return "stale";
    case "sent":
    case "skipped":
    case "pending":
    case "failed":
      return claim;
    default: {
      const unreachable: never = claim;
      return unreachable;
    }
  }
  const outcome = await sendLifecycleCustomerMail(env, {
    kind,
    reference: row.reference,
    requestId,
    communicationChannel: row.communication_channel,
    locale: row.locale,
    name: row.contact_name,
    email: row.email,
    details: bookingMailDetails(row, businessTimezone(env), row.locale),
    alreadySent: false,
  });
  const stored: LifecycleMailState =
    outcome === "sent" ? "sent" : outcome === "skipped" ? "skipped" : "failed";
  await setLifecycleMailState(env.DB, row, kind, stored, actor);
  return stored;
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
    q: parseSearchQuery(url.searchParams.get("q")),
    updatedSince: parseUpdatedSince(url.searchParams.get("updatedSince")),
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
