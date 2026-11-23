import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EmailAddress } from "./env.ts";
import {
  emailLogoUrl,
  formatBookingReference,
  formatPickup,
  renderCustomerAck,
  renderCustomerCancelled,
  renderCustomerConfirmed,
  renderStaffMessage,
  type DetailRow,
  type EmailBrand,
  type RenderedEmail,
} from "./notification-templates.ts";

export const PREVIEW_TO = "scalingsmb@gmail.com";
export const PREVIEW_FROM: EmailAddress = {
  email: "bookings@notify.kaiyuemacau.com",
  name: "Kai Yue Travel",
};
export const PREVIEW_SITE_URL = "https://staging.kaiyuemacau.com";
export const PREVIEW_ADMIN_URL = "https://admin-staging.kaiyuemacau.com";
export const PREVIEW_SERIAL = 42;
export const PREVIEW_TIMEZONE = "Asia/Macau";
export const PREVIEW_PICKUP_AT = "2026-12-15T02:30:00.000Z";

export type PreviewMessageId =
  "staff-new-enquiry" | "customer-request-received" | "customer-confirmed" | "customer-cancelled";

export type PreviewMessage = {
  id: PreviewMessageId;
  purpose: string;
  to: [typeof PREVIEW_TO];
  from: EmailAddress;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
};

export type PreviewManifest = {
  generatedAt: string;
  purpose: "owner-preview-synthetic-not-a-stored-booking";
  site: "staging";
  serial: number;
  reference: string;
  from: EmailAddress;
  recipients: [typeof PREVIEW_TO];
  messages: PreviewMessage[];
};

function previewBrand(): EmailBrand {
  return { logoUrl: emailLogoUrl(PREVIEW_SITE_URL), siteUrl: PREVIEW_SITE_URL };
}

function previewDetails(): DetailRow[] {
  return [
    { label: "Guest", value: "Synthetic Preview Guest" },
    { label: "Service", value: "Airport transfer" },
    { label: "Pickup", value: "Macau International Airport (arrivals)" },
    { label: "Destination", value: "Synthetic Hotel, Cotai" },
    { label: "Pickup time", value: formatPickup(PREVIEW_PICKUP_AT, "en", PREVIEW_TIMEZONE) },
    { label: "Passengers", value: "2" },
    { label: "Big luggage", value: "1" },
    { label: "Hand carry", value: "1" },
    { label: "Message", value: "Synthetic preview only — not a stored booking." },
  ];
}

function wrap(
  id: PreviewMessageId,
  purpose: string,
  rendered: RenderedEmail,
  replyTo?: string,
): PreviewMessage {
  return {
    id,
    purpose,
    to: [PREVIEW_TO],
    from: PREVIEW_FROM,
    ...(replyTo ? { replyTo } : {}),
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  };
}

export function buildLifecyclePreviewSet(generatedAt = new Date().toISOString()): PreviewManifest {
  const brand = previewBrand();
  const reference = formatBookingReference(PREVIEW_SERIAL);
  const details = previewDetails();
  const guest = {
    locale: "en",
    name: "Synthetic Preview Guest",
    reference,
    timezone: PREVIEW_TIMEZONE,
    siteUrl: PREVIEW_SITE_URL,
    details,
    syntheticPreview: true,
  };

  const staff = wrap(
    "staff-new-enquiry",
    "Staff new enquiry notice (synthetic preview)",
    renderStaffMessage(
      "staging",
      {
        kind: "booking",
        reference,
        summary: "A new chauffeur booking request is waiting for review.",
        details,
        syntheticPreview: true,
      },
      brand,
    ),
    PREVIEW_TO,
  );
  const receipt = wrap(
    "customer-request-received",
    "Guest request-received acknowledgement (not a confirmation)",
    renderCustomerAck(
      "staging",
      {
        kind: "booking",
        reference,
        locale: "en",
        name: guest.name,
        serviceType: "airport_transfer",
        pickupAt: PREVIEW_PICKUP_AT,
        timezone: PREVIEW_TIMEZONE,
        siteUrl: PREVIEW_SITE_URL,
        details,
        syntheticPreview: true,
      },
      brand,
    ),
  );
  const confirmed = wrap(
    "customer-confirmed",
    "Guest confirmation (synthetic preview; renderer only)",
    renderCustomerConfirmed("staging", guest, brand),
  );
  const cancelled = wrap(
    "customer-cancelled",
    "Guest cancellation (synthetic preview; renderer only)",
    renderCustomerCancelled("staging", guest, brand),
  );

  return {
    generatedAt,
    purpose: "owner-preview-synthetic-not-a-stored-booking",
    site: "staging",
    serial: PREVIEW_SERIAL,
    reference,
    from: PREVIEW_FROM,
    recipients: [PREVIEW_TO],
    messages: [staff, receipt, confirmed, cancelled],
  };
}

export async function writeLifecyclePreviewArtifacts(
  dir: string,
  generatedAt?: string,
): Promise<PreviewManifest> {
  const manifest = buildLifecyclePreviewSet(generatedAt);
  await mkdir(dir, { recursive: true });
  const names: Record<PreviewMessageId, string> = {
    "staff-new-enquiry": "staff-new-enquiry",
    "customer-request-received": "customer-request-received",
    "customer-confirmed": "customer-confirmed",
    "customer-cancelled": "customer-cancelled",
  };
  for (const message of manifest.messages) {
    const stem = names[message.id];
    await writeFile(path.join(dir, `${stem}.html`), message.html, "utf8");
    await writeFile(path.join(dir, `${stem}.txt`), message.text, "utf8");
  }
  await writeFile(
    path.join(dir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  return manifest;
}
