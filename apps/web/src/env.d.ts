/// <reference types="astro/client" />

type AppBindings = {
  DB: import("./lib/server/env").D1Database;
  ENVIRONMENT?: string;
  ENV?: string;
  PUBLIC_SITE_URL?: string;
  OFFERS_BUCKET?: import("./lib/server/offers/objects").OfferR2Bucket;
  BUSINESS_TIMEZONE?: string;
  BOOKING_NOTICE_HOURS?: string;
  NOTIFICATIONS_ENABLED?: string;
  EMAIL?: import("./lib/server/env").SendEmailBinding;
  NOTIFY_FROM_EMAIL?: string;
  NOTIFY_FROM_NAME?: string;
  NOTIFY_STAFF_TO?: string;
  NOTIFY_ALLOWED_RECIPIENTS?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  DEV_ADMIN_BYPASS?: string;
  BETTER_AUTH_SECRET?: string;
  ADMIN_EMAILS?: string;
  ADMIN_PRIMARY_EMAIL?: string;
  ADMIN_SETUP_TOKEN?: string;
  TEMP_ADMIN_EXPIRES_AT?: string;
  ADMIN_STAGING_TEST_PASSWORD_MIN?: string;
};

declare namespace App {
  interface Locals {
    requestId: string;
    cfContext?: ExecutionContext;
  }
}

declare module "cloudflare:workers" {
  export const env: AppBindings;
}
