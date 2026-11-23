import { AppError, sha256Hex } from "@kaiyue/contracts";
import { first, nowIso, run } from "./db.ts";
import type { D1Database } from "./env.ts";

const TTL_MS = 24 * 60 * 60 * 1000;
export const IDEMPOTENCY_PROCESSING = 202;
export const IDEMPOTENCY_COMPLETE = 201;

export type IdempotentResult = {
  status: number;
  body: unknown;
};

export async function hashIdempotency(key: string): Promise<string> {
  return sha256Hex(key.trim().toLowerCase());
}

export async function hashRequest(payload: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(payload));
}

export async function readIdempotency(
  db: D1Database,
  keyHash: string,
  requestHash: string,
): Promise<IdempotentResult | null> {
  const row = await first<{
    request_hash: string;
    response_json: string;
    status_code: number;
    expires_at: string;
  }>(
    db,
    "SELECT request_hash, response_json, status_code, expires_at FROM idempotency_keys WHERE key_hash = ?",
    keyHash,
  );

  if (!row) {
    return null;
  }

  if (Date.parse(row.expires_at) <= Date.now()) {
    await run(db, "DELETE FROM idempotency_keys WHERE key_hash = ?", keyHash);
    return null;
  }

  if (row.request_hash !== requestHash) {
    throw new AppError(
      "IDEMPOTENCY_CONFLICT",
      "This request was already sent with different details. Do not submit a second booking.",
    );
  }

  return {
    status: row.status_code,
    body: JSON.parse(row.response_json) as unknown,
  };
}

export async function writeIdempotency(
  db: D1Database,
  keyHash: string,
  requestHash: string,
  result: IdempotentResult,
): Promise<void> {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  await run(
    db,
    `INSERT INTO idempotency_keys (key_hash, request_hash, response_json, status_code, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    keyHash,
    requestHash,
    JSON.stringify(result.body),
    result.status,
    expiresAt,
    createdAt,
  );
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 128) {
    throw new AppError("VALIDATION_FAILED", "A valid Idempotency-Key header is required.", {
      status: 400,
    });
  }
  return key;
}

export type BookingCreateClaim =
  | { kind: "fresh" }
  | { kind: "replay"; result: IdempotentResult }
  | { kind: "persisted"; reference: string };

function claimReference(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const reference = (body as { reference?: unknown }).reference;
  return typeof reference === "string" && reference.length > 0 ? reference : undefined;
}

export async function claimBookingCreate(
  db: D1Database,
  keyHash: string,
  requestHash: string,
): Promise<BookingCreateClaim> {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const inserted = await first<{ key_hash: string }>(
    db,
    `INSERT INTO idempotency_keys (key_hash, request_hash, response_json, status_code, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       request_hash = excluded.request_hash,
       response_json = excluded.response_json,
       status_code = excluded.status_code,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at
     WHERE idempotency_keys.expires_at <= excluded.created_at
     RETURNING key_hash`,
    keyHash,
    requestHash,
    JSON.stringify({ state: "claimed" }),
    IDEMPOTENCY_PROCESSING,
    expiresAt,
    createdAt,
  );
  if (inserted) return { kind: "fresh" };

  const existing = await readIdempotency(db, keyHash, requestHash);
  if (!existing) {
    throw new AppError(
      "CONFLICT",
      "This request is already being processed. Retry shortly with the same Idempotency-Key.",
    );
  }
  if (existing.status === IDEMPOTENCY_COMPLETE) {
    return { kind: "replay", result: existing };
  }
  const reference = claimReference(existing.body);
  if (existing.status === IDEMPOTENCY_PROCESSING && reference) {
    return { kind: "persisted", reference };
  }
  throw new AppError(
    "CONFLICT",
    "This request is already being processed. Retry shortly with the same Idempotency-Key.",
  );
}

export async function bindBookingCreateClaim(
  db: D1Database,
  keyHash: string,
  reference: string,
): Promise<void> {
  await run(
    db,
    `UPDATE idempotency_keys SET response_json = ? WHERE key_hash = ? AND status_code = ?`,
    JSON.stringify({ state: "persisted", reference }),
    keyHash,
    IDEMPOTENCY_PROCESSING,
  );
}

export async function finishBookingCreate(
  db: D1Database,
  keyHash: string,
  requestHash: string,
  result: IdempotentResult,
): Promise<void> {
  await run(
    db,
    `UPDATE idempotency_keys SET request_hash = ?, response_json = ?, status_code = ? WHERE key_hash = ?`,
    requestHash,
    JSON.stringify(result.body),
    result.status,
    keyHash,
  );
}

export async function abandonBookingCreateClaim(db: D1Database, keyHash: string): Promise<void> {
  await run(
    db,
    `DELETE FROM idempotency_keys
     WHERE key_hash = ? AND status_code = ? AND json_extract(response_json, '$.reference') IS NULL`,
    keyHash,
    IDEMPOTENCY_PROCESSING,
  );
}
