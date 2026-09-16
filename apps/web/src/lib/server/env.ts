export type D1Meta = {
  changes: number;
  last_row_id: number;
  duration: number;
};

export type D1QueryResult<T = Record<string, unknown>> = {
  success: boolean;
  results: T[];
  meta: D1Meta;
};

export type D1Statement = {
  bind(...params: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>;
  run<T = Record<string, unknown>>(): Promise<D1QueryResult<T>>;
};

export type D1Database = {
  prepare(sql: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<Array<D1QueryResult<T>>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
};

export type AppEnv = {
  DB: D1Database;
  ENVIRONMENT?: string;
  PUBLIC_SITE_URL?: string;
  BUSINESS_TIMEZONE?: string;
  BOOKING_NOTICE_HOURS?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  RESEND_STAFF_TO?: string;
  RESEND_REPLY_TO?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_ADMIN_BYPASS?: string;
};

export function noticeHours(env: AppEnv): number {
  const parsed = Number(env.BOOKING_NOTICE_HOURS ?? 24);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 24;
}

export function businessTimezone(env: AppEnv): string {
  return env.BUSINESS_TIMEZONE || "Asia/Macau";
}

export function isDevelopment(env: AppEnv): boolean {
  return (env.ENVIRONMENT ?? "development") === "development";
}
