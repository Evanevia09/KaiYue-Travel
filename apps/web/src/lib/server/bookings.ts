import {
  AppError,
  bookingCreateSchema,
  canTransitionBooking,
  createBookingReference,
  getPublicConfig,
  validatePickupNotice,
  type BookingCreatePayload,
  type BookingStatus,
  type NotificationState,
} from "@kaiyue/contracts";
import type { AppEnv, D1Database } from "./env.ts";
import { noticeHours } from "./env.ts";
import { all, first, nowIso, run } from "./db.ts";
import { clientIp, fail, logSafe, readJson } from "./http.ts";
import {
  hashIdempotency,
  hashRequest,
  readIdempotency,
  requireIdempotencyKey,
  writeIdempotency,
} from "./idempotency.ts";
import { sendNotifications } from "./notifications.ts";
import { enforceRateLimit } from "./rate-limit.ts";

export type BookingRow = {
  id: string;
  reference: string;
  status: BookingStatus;
  service_type: string;
  pickup_location: string;
  destination: string | null;
  pickup_at: string;
  return_at: string | null;
  passenger_count: number;
  luggage_count: number | null;
  vehicle_preference: string | null;
  contact_name: string;
  phone: string;
  phone_display: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  source_page: string;
  source_trigger: string;
  source_mode: string;
  locale: string;
  notification_state: NotificationState;
  created_at: string;
  updated_at: string;
};

export function bookingToPublic(row: BookingRow) {
  return {
    reference: row.reference,
    status: row.status,
    receivedAt: row.created_at,
    nextStep: getPublicConfig().confirmationCopy,
  };
}

export function bookingToAdmin(row: BookingRow) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceType: row.service_type,
    pickupLocation: row.pickup_location,
    destination: row.destination,
    pickupAt: row.pickup_at,
    returnAt: row.return_at,
    passengerCount: row.passenger_count,
    luggageCount: row.luggage_count,
    vehiclePreference: row.vehicle_preference,
    contactName: row.contact_name,
    phone: row.phone_display,
    email: row.email,
    company: row.company,
    notes: row.notes,
    sourcePage: row.source_page,
    sourceTrigger: row.source_trigger,
    sourceMode: row.source_mode,
    locale: row.locale,
    notificationState: row.notification_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function persistBooking(env: AppEnv, payload: BookingCreatePayload): Promise<BookingRow> {
  const id = crypto.randomUUID();
  const reference = createBookingReference();
  const now = nowIso();
  await run(
    env.DB,
    `INSERT INTO bookings (
      id, reference, status, service_type, pickup_location, destination, pickup_at, return_at,
      passenger_count, luggage_count, vehicle_preference, contact_name, phone, phone_display,
      email, company, notes, source_page, source_trigger, source_mode, locale, notification_state,
      created_at, updated_at
    ) VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    id,
    reference,
    payload.serviceType,
    payload.pickupLocation,
    payload.destination ?? null,
    payload.pickupAt,
    payload.returnAt ?? null,
    payload.passengerCount,
    payload.luggageCount ?? null,
    payload.vehiclePreference ?? null,
    payload.contactName,
    payload.phone,
    payload.phoneDisplay,
    payload.email ?? null,
    payload.company ?? null,
    payload.notes ?? null,
    payload.sourcePage,
    payload.sourceTrigger,
    payload.sourceMode,
    payload.locale,
    now,
    now,
  );
  const row = await first<BookingRow>(env.DB, "SELECT * FROM bookings WHERE id = ?", id);
  if (!row) {
    throw new AppError("UNAVAILABLE", "Could not store the booking request.");
  }
  return row;
}

export async function createBooking(
  request: Request,
  env: AppEnv,
  requestId: string,
): Promise<Response> {
  const idempotencyKey = requireIdempotencyKey(request);
  await enforceRateLimit(env.DB, `booking:${clientIp(request)}`);

  const raw = await readJson(request);
  if (
    raw &&
    typeof raw === "object" &&
    "website" in raw &&
    typeof (raw as { website?: unknown }).website === "string" &&
    (raw as { website: string }).website.length > 0
  ) {
    return new Response(
      JSON.stringify({
        reference: "KY-HIDDEN",
        status: "new",
        receivedAt: nowIso(),
        nextStep: getPublicConfig().confirmationCopy,
      }),
      { status: 201, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const parsed = bookingCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "form";
      fields[path] ??= issue.message;
    }
    throw new AppError("VALIDATION_FAILED", "Check the highlighted fields.", { fields });
  }

  const noticeError = validatePickupNotice(parsed.data.pickupAt, noticeHours(env));
  if (noticeError) {
    fail("VALIDATION_FAILED", "Check the highlighted fields.", { pickupAt: noticeError });
  }

  const keyHash = await hashIdempotency(idempotencyKey);
  const requestHash = await hashRequest(parsed.data);
  const replay = await readIdempotency(env.DB, keyHash, requestHash);
  if (replay) {
    return new Response(JSON.stringify(replay.body), {
      status: replay.status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-request-id": requestId,
        "cache-control": "no-store",
      },
    });
  }

  let row: BookingRow;
  try {
    row = await persistBooking(env, parsed.data);
  } catch (error) {
    logSafe("error", "booking_persist_failed", { requestId });
    throw new AppError("UNAVAILABLE", "Could not store the booking request.", { cause: error });
  }

  const notificationState = await sendNotifications(env, {
    kind: "booking",
    reference: row.reference,
    requestId,
    summary: "A new chauffeur booking request is waiting for review.",
  });
  await run(
    env.DB,
    "UPDATE bookings SET notification_state = ?, updated_at = ? WHERE id = ?",
    notificationState,
    nowIso(),
    row.id,
  );
  row.notification_state = notificationState;

  const body = bookingToPublic(row);
  await writeIdempotency(env.DB, keyHash, requestHash, { status: 201, body });
  logSafe("info", "booking_created", {
    requestId,
    reference: row.reference,
    notificationState,
  });
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
      "cache-control": "no-store",
    },
  });
}

export async function getBookingByReference(
  db: D1Database,
  reference: string,
): Promise<BookingRow | null> {
  return first<BookingRow>(db, "SELECT * FROM bookings WHERE reference = ?", reference);
}

export async function listBookings(
  db: D1Database,
  filters: {
    status?: string;
    serviceType?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  },
): Promise<{ items: BookingRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  const clauses = ["1 = 1"];
  const params: unknown[] = [];
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.serviceType) {
    clauses.push("service_type = ?");
    params.push(filters.serviceType);
  }
  if (filters.from) {
    clauses.push("pickup_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    clauses.push("pickup_at <= ?");
    params.push(filters.to);
  }
  if (filters.cursor) {
    clauses.push("pickup_at > ?");
    params.push(filters.cursor);
  }
  const rows = await all<BookingRow>(
    db,
    `SELECT * FROM bookings WHERE ${clauses.join(" AND ")} ORDER BY pickup_at ASC LIMIT ?`,
    ...params,
    limit + 1,
  );
  const extra = rows.length > limit;
  const items = extra ? rows.slice(0, limit) : rows;
  return {
    items,
    nextCursor: extra ? (items.at(-1)?.pickup_at ?? null) : null,
  };
}

export async function updateBookingStatus(
  db: D1Database,
  row: BookingRow,
  nextStatus: BookingStatus,
  actorId: string,
  requestId: string,
): Promise<BookingRow> {
  if (!canTransitionBooking(row.status, nextStatus)) {
    throw new AppError(
      "INVALID_TRANSITION",
      `Cannot change status from ${row.status} to ${nextStatus}.`,
    );
  }
  const updatedAt = nowIso();
  await db.batch([
    db
      .prepare("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?")
      .bind(nextStatus, updatedAt, row.id),
    db
      .prepare(
        `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         VALUES (?, 'booking', ?, 'status_change', ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), row.id, actorId, row.status, nextStatus, requestId, updatedAt),
  ]);
  const updated = await first<BookingRow>(db, "SELECT * FROM bookings WHERE id = ?", row.id);
  if (!updated) {
    throw new AppError("UNAVAILABLE", "Could not update booking status.");
  }
  return updated;
}
