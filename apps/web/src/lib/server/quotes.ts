import { AppError, QUOTE_CURRENCIES, QUOTE_TOTAL_PATTERN, renderQuote } from "@kaiyue/contracts";
import { resolveHostRole } from "./admin-gate.ts";
import { first, nowIso } from "./db.ts";
import type { AppEnv } from "./env.ts";
import { json, readJson } from "./http.ts";
import { hashRequest } from "./idempotency.ts";
import { consumeMcpApproval } from "./mcp-access.ts";
import { normalizeAddress, recipientAllowed, resolveMailPolicy } from "./notification-policy.ts";

type QuoteRecord = {
  id: string;
  reference: string;
  email: string | null;
  updated_at: string;
  status: string;
};

export async function sendStagingQuote(
  request: Request,
  env: AppEnv,
  actorId: string,
  requestId: string,
  approve = consumeMcpApproval,
) {
  const policy = resolveMailPolicy(env, "staging-quote");
  if (!policy.ok || resolveHostRole(env, request) !== "staging-admin") {
    throw new AppError("FORBIDDEN", "Staging quote email is unavailable on this host.");
  }

  const data = (await readJson(request)) as Record<string, unknown> | null;
  const reference = data?.reference;
  const currency = QUOTE_CURRENCIES.find((value) => value === data?.currency);
  const total = data?.total;
  if (
    typeof reference !== "string" ||
    !/^(KY|INQ)-[A-Z2-9]{8}$/.test(reference) ||
    !currency ||
    typeof total !== "string" ||
    !QUOTE_TOTAL_PATTERN.test(total) ||
    Number(total) <= 0 ||
    typeof data?.expectedUpdatedAt !== "string"
  ) {
    throw new AppError(
      "VALIDATION_FAILED",
      "Provide a reference, current updatedAt, currency, and positive quote total.",
    );
  }

  const kind = reference.startsWith("KY-") ? "booking" : "contact";
  const table = kind === "booking" ? "bookings" : "contacts";
  const record = await first<QuoteRecord>(
    env.DB,
    `SELECT id, reference, email, updated_at, status FROM ${table} WHERE reference = ?`,
    reference,
  );
  if (!record) throw new AppError("NOT_FOUND", "The quote record was not found.");
  if (data.expectedUpdatedAt !== record.updated_at) {
    throw new AppError("CONFLICT", "The quote record changed. Review it again before sending.");
  }
  if (["completed", "cancelled", "closed"].includes(record.status)) {
    throw new AppError("INVALID_TRANSITION", "The record is closed to new quotations.");
  }
  const recipient = normalizeAddress(record.email);
  if (!recipient || recipient !== policy.staffTo || !recipientAllowed(policy, recipient)) {
    throw new AppError("FORBIDDEN", "The record must use the approved staging test inbox.");
  }

  const key = await hashRequest(["staging-quote", kind, record.id, recipient, currency, total]);
  const existing = await first<{ status_code: number }>(
    env.DB,
    "SELECT status_code FROM idempotency_keys WHERE key_hash = ?",
    key,
  );
  const result = { reference, currency, total, status: "submitted" };
  if (existing?.status_code === 200) return json(result, 200, requestId);
  if (existing)
    throw new AppError("CONFLICT", "A submission already exists. Check the staging inbox.");
  const draft = renderQuote(reference, currency, total);
  const review = await approve(
    env,
    actorId,
    ["quote", reference, record.updated_at, recipient, currency, total],
    `Send this quote to the approved staging test inbox?\n\n${draft.subject}\n\n${draft.body}`,
  );
  if (review) {
    throw new AppError("CONFLICT", "Human approval is required for this quote.", {
      fields: { reviewUrl: review },
    });
  }
  const when = nowIso();
  const claim = await first<{ key_hash: string }>(
    env.DB,
    `INSERT INTO idempotency_keys (key_hash, request_hash, response_json, status_code, expires_at, created_at)
     SELECT ?, ?, '{}', 202, '9999-01-01T00:00:00.000Z', ?
     FROM ${table} WHERE id = ? AND updated_at = ?
     ON CONFLICT(key_hash) DO NOTHING RETURNING key_hash`,
    key,
    key,
    when,
    record.id,
    record.updated_at,
  );
  if (!claim) {
    const prior = await first<{ status_code: number }>(
      env.DB,
      "SELECT status_code FROM idempotency_keys WHERE key_hash = ?",
      key,
    );
    if (prior?.status_code === 200) return json(result, 200, requestId);
    throw new AppError(
      "CONFLICT",
      "The booking changed or another quote submission exists. Refresh the record and check the staging inbox.",
    );
  }

  try {
    await policy.binding.send({
      from: policy.from,
      to: recipient,
      subject: draft.subject,
      text: draft.body,
    });
  } catch {
    throw new AppError(
      "UNAVAILABLE",
      "Email submission could not be verified. Check the staging inbox.",
    );
  }
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE idempotency_keys SET status_code = 200, response_json = ? WHERE key_hash = ?",
    ).bind(JSON.stringify(result), key),
    env.DB.prepare(
      `INSERT INTO audit_events (id, entity_type, entity_id, event_type, actor_id, request_id, created_at)
       VALUES (?, ?, ?, 'quote_email_submitted', ?, ?, ?)`,
    ).bind(crypto.randomUUID(), kind, record.id, actorId, requestId, when),
  ]);
  return json(result, 200, requestId);
}
