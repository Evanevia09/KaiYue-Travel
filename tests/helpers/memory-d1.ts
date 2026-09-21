import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { AppEnv, D1Database, D1QueryResult } from "../../apps/web/src/lib/server/env.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

class MemoryPreparedStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: unknown[] = [],
  ) {}

  bind(...params: unknown[]): MemoryPreparedStatement {
    return new MemoryPreparedStatement(this.db, this.sql, params);
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...(this.params as never[]));
    return (row as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>> {
    const results = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return {
      success: true,
      results,
      meta: { changes: results.length, last_row_id: 0, duration: 0 },
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1QueryResult<T>> {
    const info = this.db.prepare(this.sql).run(...(this.params as never[]));
    return {
      success: true,
      results: [],
      meta: {
        changes: Number(info.changes),
        last_row_id: Number(info.lastInsertRowid),
        duration: 0,
      },
    };
  }
}

class MemoryD1 {
  constructor(private readonly db: DatabaseSync) {}

  prepare(sql: string): MemoryPreparedStatement {
    return new MemoryPreparedStatement(this.db, sql);
  }

  async batch<T = unknown>(
    statements: MemoryPreparedStatement[],
  ): Promise<Array<D1QueryResult<T>>> {
    const results: Array<D1QueryResult<T>> = [];
    for (const statement of statements) {
      results.push((await statement.run()) as D1QueryResult<T>);
    }
    return results;
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    this.db.exec(query);
    return { count: 0, duration: 0 };
  }
}

export function createTestEnv(overrides: Partial<AppEnv> = {}): AppEnv {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of readdirSync(resolve(root, "migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(resolve(root, "migrations", migration), "utf8"));
  }
  return {
    DB: new MemoryD1(sqlite) as unknown as D1Database,
    ENVIRONMENT: "development",
    PUBLIC_SITE_URL: "http://localhost:4321",
    BUSINESS_TIMEZONE: "Asia/Macau",
    BOOKING_NOTICE_HOURS: "0",
    DEV_ADMIN_BYPASS: "true",
    RESEND_FROM: "Kai Yue Travel <notifications@example.invalid>",
    RESEND_STAFF_TO: "ops@example.invalid",
    ...overrides,
  };
}

export function futurePickup(hours = 48): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
