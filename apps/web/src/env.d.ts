/// <reference types="astro/client" />

type AppBindings = {
  DB: import("./lib/server/env").D1Database;
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

declare namespace App {
  interface Locals {
    requestId: string;
    cfContext?: ExecutionContext;
  }
}

declare module "cloudflare:workers" {
  export const env: AppBindings;
}
