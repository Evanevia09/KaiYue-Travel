import {
  AppError,
  canTransitionContact,
  contactCreateSchema,
  createContactReference,
  type ContactStatus,
  type NotificationState,
} from "@kaiyue/contracts";
import type { AppEnv, D1Database } from "./env.ts";
import { all, first, nowIso, run } from "./db.ts";
import { clientIp, logSafe, readJson } from "./http.ts";
import {
  hashIdempotency,
  hashRequest,
  readIdempotency,
  requireIdempotencyKey,
  writeIdempotency,
} from "./idempotency.ts";
import { sendNotifications } from "./notifications.ts";
import { enforceRateLimit } from "./rate-limit.ts";

export type ContactRow = {
  id: string;
  reference: string;
  status: ContactStatus;
  inquiry_type: string;
  name: string;
  phone: string;
  phone_display: string;
  email: string | null;
  company: string | null;
  message: string;
  source_page: string;
  locale: string;
  notification_state: NotificationState;
  created_at: string;
  updated_at: string;
};

export function contactToPublic(row: ContactRow) {
  return {
    reference: row.reference,
    receivedAt: row.created_at,
    nextStep:
      "Your inquiry has been received. Our team will follow up using the contact details you provided.",
  };
}

export function contactToAdmin(row: ContactRow) {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    inquiryType: row.inquiry_type,
    name: row.name,
    phone: row.phone_display,
    email: row.email,
    company: row.company,
    message: row.message,
    sourcePage: row.source_page,
    locale: row.locale,
    notificationState: row.notification_state,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createContact(
  request: Request,
  env: AppEnv,
  requestId: string,
): Promise<Response> {
  const idempotencyKey = requireIdempotencyKey(request);
  await enforceRateLimit(env.DB, `contact:${clientIp(request)}`);
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
        reference: "INQ-HIDDEN",
        receivedAt: nowIso(),
        nextStep: "Your inquiry has been received.",
      }),
      { status: 201, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }

  const parsed = contactCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".") || "form";
      fields[path] ??= issue.message;
    }
    throw new AppError("VALIDATION_FAILED", "Check the highlighted fields.", { fields });
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

  const id = crypto.randomUUID();
  const reference = createContactReference();
  const now = nowIso();

  try {
    await run(
      env.DB,
      `INSERT INTO contacts (
        id, reference, status, inquiry_type, name, phone, phone_display, email, company, message,
        source_page, locale, notification_state, created_at, updated_at
      ) VALUES (?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      id,
      reference,
      parsed.data.inquiryType,
      parsed.data.name,
      parsed.data.phone,
      parsed.data.phoneDisplay,
      parsed.data.email ?? null,
      parsed.data.company ?? null,
      parsed.data.message,
      parsed.data.sourcePage,
      parsed.data.locale,
      now,
      now,
    );
  } catch (error) {
    logSafe("error", "contact_persist_failed", { requestId });
    throw new AppError("UNAVAILABLE", "Could not store the inquiry.", { cause: error });
  }

  const notificationState = await sendNotifications(env, {
    kind: "contact",
    reference,
    requestId,
    summary: "A new website inquiry is waiting for review.",
  });
  await run(
    env.DB,
    "UPDATE contacts SET notification_state = ?, updated_at = ? WHERE id = ?",
    notificationState,
    nowIso(),
    id,
  );

  const row = await first<ContactRow>(env.DB, "SELECT * FROM contacts WHERE id = ?", id);
  if (!row) {
    throw new AppError("UNAVAILABLE", "Could not store the inquiry.");
  }

  const body = contactToPublic(row);
  await writeIdempotency(env.DB, keyHash, requestHash, { status: 201, body });
  logSafe("info", "contact_created", { requestId, reference, notificationState });
  return new Response(JSON.stringify(body), {
    status: 201,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
      "cache-control": "no-store",
    },
  });
}

export async function listContacts(
  db: D1Database,
  filters: { status?: string; inquiryType?: string; cursor?: string; limit?: number },
): Promise<{ items: ContactRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
  const clauses = ["1 = 1"];
  const params: unknown[] = [];
  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.inquiryType) {
    clauses.push("inquiry_type = ?");
    params.push(filters.inquiryType);
  }
  if (filters.cursor) {
    clauses.push("created_at < ?");
    params.push(filters.cursor);
  }
  const rows = await all<ContactRow>(
    db,
    `SELECT * FROM contacts WHERE ${clauses.join(" AND ")} ORDER BY created_at DESC LIMIT ?`,
    ...params,
    limit + 1,
  );
  const extra = rows.length > limit;
  const items = extra ? rows.slice(0, limit) : rows;
  return { items, nextCursor: extra ? (items.at(-1)?.created_at ?? null) : null };
}

export async function updateContactStatus(
  db: D1Database,
  row: ContactRow,
  nextStatus: ContactStatus,
  actorId: string,
  requestId: string,
): Promise<ContactRow> {
  if (!canTransitionContact(row.status, nextStatus)) {
    throw new AppError(
      "INVALID_TRANSITION",
      `Cannot change status from ${row.status} to ${nextStatus}.`,
    );
  }
  const updatedAt = nowIso();
  await db.batch([
    db
      .prepare("UPDATE contacts SET status = ?, updated_at = ? WHERE id = ?")
      .bind(nextStatus, updatedAt, row.id),
    db
      .prepare(
        `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         VALUES (?, 'contact', ?, 'status_change', ?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), row.id, actorId, row.status, nextStatus, requestId, updatedAt),
  ]);
  const updated = await first<ContactRow>(db, "SELECT * FROM contacts WHERE id = ?", row.id);
  if (!updated) {
    throw new AppError("UNAVAILABLE", "Could not update inquiry status.");
  }
  return updated;
}
