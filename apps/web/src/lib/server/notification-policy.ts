import { STAGING_MARKETING_HOST, productionNotificationsAllowed } from "./admin-gate.ts";
import type { AppEnv, EmailAddress, SendEmailBinding } from "./env.ts";

export type MailSite = "production" | "staging";

export type MailPolicy =
  | {
      ok: true;
      site: MailSite;
      binding: SendEmailBinding;
      from: EmailAddress;
      staffTo: string;
      /** Null only on production without a lock; staging always has a non-empty lock. */
      allowedRecipients: ReadonlySet<string> | null;
    }
  | { ok: false; state: "skipped" | "failed"; reason: string };

const EMAIL_SHAPE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export function normalizeAddress(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  return EMAIL_SHAPE.test(trimmed) ? trimmed : null;
}

function parseAllowlist(raw: string | undefined): Set<string> | null {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;
  const normalized = entries.map(normalizeAddress);
  if (normalized.some((entry) => entry === null)) return null;
  return new Set(normalized as string[]);
}

/**
 * Site identity comes only from the explicit PUBLIC_SITE_URL overlay value, never from
 * ENVIRONMENT (official staging runs with ENVIRONMENT="production").
 */
export function mailSite(env: Pick<AppEnv, "PUBLIC_SITE_URL">): MailSite | null {
  if (productionNotificationsAllowed(env)) return "production";
  try {
    const url = new URL((env.PUBLIC_SITE_URL ?? "").trim());
    if (url.protocol === "https:" && url.hostname.toLowerCase() === STAGING_MARKETING_HOST) {
      return "staging";
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveMailPolicy(
  env: AppEnv,
  purpose: "notifications" | "staging-quote" = "notifications",
): MailPolicy {
  const site = mailSite(env);
  if (!site) return { ok: false, state: "skipped", reason: "unrecognized_site" };
  const enabled =
    purpose === "staging-quote"
      ? site === "staging" && env.STAGING_QUOTE_EMAIL_ENABLED === "true"
      : (env.NOTIFICATIONS_ENABLED ?? "").trim() === "true";
  if (!enabled) {
    return { ok: false, state: "skipped", reason: "notifications_disabled" };
  }
  if (!env.EMAIL || typeof env.EMAIL.send !== "function") {
    return { ok: false, state: "skipped", reason: "missing_email_binding" };
  }

  const allowedRecipients = parseAllowlist(env.NOTIFY_ALLOWED_RECIPIENTS);
  if (site === "staging" && !allowedRecipients) {
    return { ok: false, state: "skipped", reason: "recipient_lock_missing" };
  }
  if (site === "production" && (env.NOTIFY_ALLOWED_RECIPIENTS ?? "").trim() && !allowedRecipients) {
    return { ok: false, state: "skipped", reason: "recipient_lock_invalid" };
  }

  const fromEmail = normalizeAddress(env.NOTIFY_FROM_EMAIL);
  const staffTo = normalizeAddress(env.NOTIFY_STAFF_TO);
  if (!fromEmail || !staffTo) {
    return { ok: false, state: "failed", reason: "missing_sender_or_recipient" };
  }
  const name = (env.NOTIFY_FROM_NAME ?? "").replace(/[\r\n"<>]/g, "").trim();

  return {
    ok: true,
    site,
    binding: env.EMAIL,
    from: name ? { email: fromEmail, name } : { email: fromEmail },
    staffTo,
    allowedRecipients,
  };
}

export function recipientAllowed(
  policy: Extract<MailPolicy, { ok: true }>,
  address: string,
): boolean {
  return policy.allowedRecipients === null || policy.allowedRecipients.has(address);
}
