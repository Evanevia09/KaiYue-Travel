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

export type EmailAddress = { email: string; name?: string };

export type OutboundEmail = {
  to: string | string[];
  from: string | EmailAddress;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string | EmailAddress;
  headers?: Record<string, string>;
};

/** Cloudflare Email Service `send_email` binding. */
export type SendEmailBinding = {
  send(message: OutboundEmail): Promise<{ messageId: string }>;
};

export type AppEnv = {
  DB: D1Database;
  ENVIRONMENT?: string;
  ENV?: string;
  PUBLIC_SITE_URL?: string;
  BUSINESS_TIMEZONE?: string;
  BOOKING_NOTICE_HOURS?: string;
  NOTIFICATIONS_ENABLED?: string;
  STAGING_QUOTE_EMAIL_ENABLED?: string;
  EMAIL?: SendEmailBinding;
  NOTIFY_FROM_EMAIL?: string;
  NOTIFY_FROM_NAME?: string;
  NOTIFY_STAFF_TO?: string;
  NOTIFY_ALLOWED_RECIPIENTS?: string;
  WHATSAPP_NUMBER?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_ADMIN_BYPASS?: string;
  BETTER_AUTH_SECRET?: string;
  ADMIN_EMAILS?: string;
  ADMIN_PRIMARY_EMAIL?: string;
  ADMIN_SETUP_TOKEN?: string;
  TEMP_ADMIN_EXPIRES_AT?: string;
  ADMIN_STAGING_TEST_PASSWORD_MIN?: string;
  OFFERS_BUCKET?: import("./offers/objects.ts").OfferR2Bucket;
  offerStore?: import("./offers/store.ts").OfferStore;
  objectStore?: import("./offers/objects.ts").ObjectStore;
};

export function noticeHours(env: AppEnv): number {
  const parsed = Number(env.BOOKING_NOTICE_HOURS ?? 24);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 24;
}

export function businessTimezone(env: AppEnv): string {
  return env.BUSINESS_TIMEZONE || "Asia/Macau";
}

export function isDevelopment(env: AppEnv): boolean {
  return env.ENVIRONMENT === "development" || env.ENVIRONMENT === "local" || env.ENV === "local";
}
