import { AppError, sha256Hex } from "@kaiyue/contracts";
import { first, run } from "./db.ts";
import type { D1Database } from "./env.ts";

const TTL_MS = 24 * 60 * 60 * 1000;

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
