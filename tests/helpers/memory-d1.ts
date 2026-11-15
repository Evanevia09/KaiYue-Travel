import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import type { AppEnv, D1Database, D1QueryResult } from "../../apps/web/src/lib/server/env.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type StatementFailure = ((sql: string) => boolean) | null;
const injectedFailures = new WeakMap<object, StatementFailure>();

export function setD1StatementFailure(db: D1Database, failIf: StatementFailure): void {
  if (failIf) {
    injectedFailures.set(db, failIf);
    return;
  }
  injectedFailures.delete(db);
}

class MemoryPreparedStatement {
  constructor(
    readonly db: DatabaseSync,
    readonly sql: string,
    private readonly params: unknown[] = [],
    private readonly failIf: () => StatementFailure = () => null,
  ) {}

  bind(...params: unknown[]): MemoryPreparedStatement {
    return new MemoryPreparedStatement(this.db, this.sql, params, this.failIf);
  }

  private rejectIfInjected(): void {
    const failIf = this.failIf();
    if (failIf?.(this.sql)) {
      throw new Error("injected statement failure");
    }
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    this.rejectIfInjected();
    const row = this.db.prepare(this.sql).get(...(this.params as never[]));
    return (row as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>> {
    this.rejectIfInjected();
    const results = this.db.prepare(this.sql).all(...(this.params as never[])) as T[];
    return {
      success: true,
      results,
      meta: { changes: results.length, last_row_id: 0, duration: 0 },
    };
  }

  async run<T = Record<string, unknown>>(): Promise<D1QueryResult<T>> {
    this.rejectIfInjected();
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
    return new MemoryPreparedStatement(this.db, sql, [], () => injectedFailures.get(this) ?? null);
  }

  async batch<T = unknown>(
    statements: MemoryPreparedStatement[],
  ): Promise<Array<D1QueryResult<T>>> {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const results: Array<D1QueryResult<T>> = [];
      for (const statement of statements) {
        if (/^\s*select/i.test(statement.sql)) {
          results.push((await statement.all()) as D1QueryResult<T>);
        } else {
          results.push((await statement.run()) as D1QueryResult<T>);
        }
      }
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // The original statement error is the one callers must see.
      }
      throw error;
    }
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
