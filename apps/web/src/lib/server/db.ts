import type { D1Database, D1QueryResult } from "./env.ts";

export async function first<T>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  return (
    (await db
      .prepare(sql)
      .bind(...params)
      .first<T>()) ?? null
  );
}

export async function all<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<T>();
  return result.results ?? [];
}

export async function run(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<D1QueryResult> {
  return db
    .prepare(sql)
    .bind(...params)
    .run();
}

export function nowIso(): string {
  return new Date().toISOString();
}
