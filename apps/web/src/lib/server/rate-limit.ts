import { AppError } from "@kaiyue/contracts";
import { first, run } from "./db.ts";
import type { D1Database } from "./env.ts";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_HITS = 8;

export async function enforceRateLimit(db: D1Database, bucket: string): Promise<void> {
  const now = Date.now();
  const row = await first<{ count: number; window_start: string }>(
    db,
    "SELECT count, window_start FROM rate_limits WHERE bucket = ?",
    bucket,
  );

  if (!row || now - Date.parse(row.window_start) >= WINDOW_MS) {
    await run(
      db,
      `INSERT INTO rate_limits (bucket, count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET count = 1, window_start = excluded.window_start`,
      bucket,
      new Date(now).toISOString(),
    );
    return;
  }

  if (row.count >= MAX_HITS) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please wait a few minutes and try again.",
    );
  }

  await run(db, "UPDATE rate_limits SET count = count + 1 WHERE bucket = ?", bucket);
}
