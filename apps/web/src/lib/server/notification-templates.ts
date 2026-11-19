import { renderQuote, type ServiceType } from "@kaiyue/contracts";
import type { MailSite } from "./notification-policy.ts";

export type RenderedEmail = { subject: string; text: string; html: string };

export type DetailRow = { label: string; value: string };

export type EmailBrand = { logoUrl?: string };

export type StaffMessageInput = {
  kind: "booking" | "contact";
  reference: string;
  summary: string;
  details?: DetailRow[];
};

export type CustomerAckInput = {
  kind: "booking" | "contact";
  reference: string;
  locale: string;
  name: string | null;
  serviceType?: ServiceType;
  pickupAt?: string;
  timezone: string;
  siteUrl: string;
};

export type QuoteMessageInput = {
  reference: string;
  currency: string;
  total: string;
};

type AckLocale = "en" | "pt" | "zh-Hant";

const STAGING_PREFIX = "[Staging test] ";
const BRAND_NAME = "Kai Yue Travel";
const BRAND_GREEN = "#008c5e";
const BRAND_GOLD = "#f3a600";
const BRAND_TEXT = "#1a1a1a";
export const EMAIL_LOGO_PATH = "/images/kai-yue-travel-group-logo.png";
/** Intrinsic PNG size is 1500×294 (250:49). Keep the email wordmark in that ratio. */
export const EMAIL_LOGO_WIDTH = 250;
export const EMAIL_LOGO_HEIGHT = 49;

export function emailLogoUrl(siteUrl: string | undefined): string {
  try {
    if (!siteUrl) return "";
    return new URL(EMAIL_LOGO_PATH, siteUrl).href;
  } catch {
    return "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function prefix(site: MailSite): string {
  return site === "staging" ? STAGING_PREFIX : "";
}

function visibleRows(rows: DetailRow[]): DetailRow[] {
  return rows.filter((row) => singleLine(row.value) !== "");
}

function brandedEmailHtml(lang: string, subject: string, inner: string, logoUrl?: string): string {
  const title = escapeHtml(subject);
  const brand = escapeHtml(BRAND_NAME);
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${brand}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" style="display:block;border:0;width:${EMAIL_LOGO_WIDTH}px;height:${EMAIL_LOGO_HEIGHT}px;">`
    : "";
  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#f4f4f4;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;"><tr><td style="background:${BRAND_GREEN};padding:20px 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>${logo ? `<td style="padding-right:12px;vertical-align:middle;">${logo}</td>` : ""}<td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">${brand}</td></tr></table></td></tr><tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND_GOLD};">&nbsp;</td></tr><tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${BRAND_TEXT};">${inner}</td></tr></table></td></tr></table></body></html>`;
}

function rowsHtml(rows: DetailRow[]): string {
  const visible = visibleRows(rows);
  if (visible.length === 0) return "";
  const cells = visible
    .map(
      ({ label, value }) =>
        `<tr><th align="left" style="padding:4px 12px 4px 0;vertical-align:top">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0">${cells}</table>`;
}

function rowsText(rows: DetailRow[]): string {
  return visibleRows(rows)
    .map(({ label, value }) => `${label}: ${singleLine(value)}`)
    .join("\n");
}

export function renderStaffMessage(
  site: MailSite,
  input: StaffMessageInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const subject = `${prefix(site)}${input.kind === "booking" ? "New booking request" : "New inquiry"} ${input.reference}`;
  const rows = input.details ?? [];
  const text = [
    input.summary,
    "",
    rowsText(rows),
    "",
    `Reference: ${input.reference}`,
    "Review it in the Kai Yue admin dashboard. Reply to this email to answer the guest directly.",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
  const html = brandedEmailHtml(
    "en",
    subject,
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(subject)}</h1><p>${escapeHtml(input.summary)}</p>${rowsHtml(rows)}<p>Reference: <strong>${escapeHtml(input.reference)}</strong></p><p>Review it in the Kai Yue admin dashboard. Reply to this email to answer the guest directly.</p>`,
    brand.logoUrl,
  );
  return { subject, text, html };
}

const SERVICE_NAMES: Record<AckLocale, Record<ServiceType, string>> = {
  en: {
    airport_transfer: "Airport transfer",
    hotel_transfer: "Hotel transfer",
    point_to_point: "Point to point",
    hourly_charter: "Hourly charter",
    city_tour: "City tour",
    sightseeing: "Macau sightseeing",
    corporate: "Corporate transport",
    custom: "Custom request",
  },
  pt: {
    airport_transfer: "Transfer do aeroporto",
    hotel_transfer: "Transfer de hotel",
    point_to_point: "Ponto a ponto",
    hourly_charter: "Aluguer à hora",
    city_tour: "Passeio pela cidade",
    sightseeing: "Visita a Macau",
    corporate: "Transporte empresarial",
    custom: "Pedido personalizado",
  },
  "zh-Hant": {
    airport_transfer: "機場接送",
    hotel_transfer: "酒店接送",
    point_to_point: "點對點接送",
    hourly_charter: "按小時包車",
    city_tour: "城市遊",
    sightseeing: "澳門觀光",
    corporate: "企業交通",
    custom: "自訂需求",
  },
};

const ACK_COPY: Record<
  AckLocale,
  {
    tag: string;
    subject: (reference: string) => string;
    greeting: (name: string | null) => string;
    received: Record<"booking" | "contact", string>;
    referenceLabel: string;
    notConfirmed: Record<"booking" | "contact", string>;
    service: string;
    pickupTime: string;
    changes: (site: string) => string;
    signoff: string;
    automated: string;
  }
> = {
  en: {
    tag: "en",
    subject: (reference) => `We received your request ${reference}`,
    greeting: (name) => (name ? `Hello ${name},` : "Hello,"),
    received: {
      booking: "Thank you for contacting Kai Yue Travel. We have received your booking request.",
      contact: "Thank you for contacting Kai Yue Travel. We have received your inquiry.",
    },
    referenceLabel: "Your reference",
    notConfirmed: {
      booking:
        "This is not a booking confirmation. Our team will check availability and contact you to confirm the details.",
      contact: "Our team will review your message and reply to you.",
    },
    service: "Service",
    pickupTime: "Pickup time",
    changes: (site) =>
      `To change your request, contact us through ${site} and quote your reference.`,
    signoff: "Kai Yue Travel",
    automated: "This is an automated message. Replies to this address are not monitored.",
  },
  pt: {
    tag: "pt-PT",
    subject: (reference) => `Recebemos o seu pedido ${reference}`,
    greeting: (name) => (name ? `Olá ${name},` : "Olá,"),
    received: {
      booking: "Obrigado por contactar a Kai Yue Travel. Recebemos o seu pedido de reserva.",
      contact: "Obrigado por contactar a Kai Yue Travel. Recebemos a sua mensagem.",
    },
    referenceLabel: "A sua referência",
    notConfirmed: {
      booking:
        "Isto não é uma confirmação de reserva. A nossa equipa irá verificar a disponibilidade e contactá-lo para confirmar os detalhes.",
      contact: "A nossa equipa irá analisar a sua mensagem e responder-lhe.",
    },
    service: "Serviço",
    pickupTime: "Hora de recolha",
    changes: (site) =>
      `Para alterar o seu pedido, contacte-nos através de ${site} e indique a sua referência.`,
    signoff: "Kai Yue Travel",
    automated: "Esta é uma mensagem automática. As respostas para este endereço não são lidas.",
  },
  "zh-Hant": {
    tag: "zh-Hant",
    subject: (reference) => `我們已收到您的申請 ${reference}`,
    greeting: (name) => (name ? `${name} 您好：` : "您好："),
    received: {
      booking: "感謝您聯絡 Kai Yue Travel。我們已收到您的預約申請。",
      contact: "感謝您聯絡 Kai Yue Travel。我們已收到您的查詢。",
    },
    referenceLabel: "您的參考編號",
    notConfirmed: {
      booking: "此郵件並非預約確認。我們的團隊會核實車輛安排，並與您聯絡確認詳情。",
      contact: "我們的團隊會查閱您的訊息並回覆您。",
    },
    service: "服務",
    pickupTime: "接載時間",
    changes: (site) => `如需更改申請，請透過 ${site} 聯絡我們，並提供您的參考編號。`,
    signoff: "Kai Yue Travel",
    automated: "此為自動發送的郵件，請勿直接回覆。",
  },
};

function ackLocale(locale: string): AckLocale {
  if (locale === "pt" || locale.startsWith("pt-")) return "pt";
  if (locale === "zh-Hant" || locale.startsWith("zh")) return "zh-Hant";
  return "en";
}

export function formatPickup(iso: string, tag: string, timezone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date)} (${timezone})`;
}

export function renderCustomerAck(
  site: MailSite,
  input: CustomerAckInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const locale = ackLocale(input.locale);
  const copy = ACK_COPY[locale];
  const name = input.name ? singleLine(input.name) : null;
  const subject = `${prefix(site)}${copy.subject(input.reference)}`;
  const rows: DetailRow[] = [{ label: copy.referenceLabel, value: input.reference }];
  if (input.kind === "booking" && input.serviceType) {
    rows.push({ label: copy.service, value: SERVICE_NAMES[locale][input.serviceType] });
  }
  if (input.kind === "booking" && input.pickupAt) {
    rows.push({
      label: copy.pickupTime,
      value: formatPickup(input.pickupAt, copy.tag, input.timezone),
    });
  }
  const paragraphs = [
    copy.received[input.kind],
    copy.notConfirmed[input.kind],
    copy.changes(input.siteUrl),
  ];
  const text = [
    copy.greeting(name),
    "",
    paragraphs[0],
    "",
    rowsText(rows),
    "",
    paragraphs[1],
    "",
    paragraphs[2],
    "",
    copy.signoff,
    "",
    copy.automated,
  ].join("\n");
  const html = brandedEmailHtml(
    copy.tag,
    subject,
    `<p>${escapeHtml(copy.greeting(name))}</p><p>${escapeHtml(paragraphs[0]!)}</p>${rowsHtml(rows)}<p><strong>${escapeHtml(paragraphs[1]!)}</strong></p><p>${escapeHtml(paragraphs[2]!)}</p><p>${escapeHtml(copy.signoff)}</p><p style="font-size:12px;color:#666">${escapeHtml(copy.automated)}</p>`,
    brand.logoUrl,
  );
  return { subject, text, html };
}

export function renderQuoteEmail(
  site: MailSite,
  input: QuoteMessageInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const draft = renderQuote(input.reference, input.currency, input.total);
  const subject = `${prefix(site)}${draft.subject}`;
  const rows: DetailRow[] = [
    { label: "Reference", value: input.reference },
    { label: "Quoted total", value: `${input.currency} ${input.total}` },
  ];
  const html = brandedEmailHtml(
    "en",
    subject,
    `<p>Hello,</p><p>Thank you for your enquiry with Kai Yue Travel.</p>${rowsHtml(rows)}<p>Please reply if you would like to proceed. Our team will confirm the booking separately.</p><p>${escapeHtml(BRAND_NAME)}</p>`,
    brand.logoUrl,
  );
  return { subject, text: draft.body, html };
}
