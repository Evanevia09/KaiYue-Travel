import { formatBookingReference, renderQuote, type ServiceType } from "@kaiyue/contracts";
import { STAGING_ADMIN_HOST, STAGING_MARKETING_HOST } from "./admin-gate.ts";
import type { MailSite } from "./notification-policy.ts";

export type RenderedEmail = { subject: string; text: string; html: string };

export type DetailRow = { label: string; value: string };

export type EmailBrand = { logoUrl?: string; siteUrl?: string };

export const ENGLISH_REFERENCE_LABEL = "Reference number";

export type StaffMessageInput = {
  kind: "booking" | "contact";
  reference: string;
  summary: string;
  details?: DetailRow[];
  syntheticPreview?: boolean;
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
  details?: DetailRow[];
  syntheticPreview?: boolean;
};

export type CustomerLifecycleInput = {
  locale: string;
  name: string | null;
  reference: string;
  timezone: string;
  siteUrl: string;
  details?: DetailRow[];
  syntheticPreview?: boolean;
};

export type QuoteMessageInput = {
  reference: string;
  currency: string;
  total: string;
};

type AckLocale = "en" | "pt" | "zh-Hant";

const STAGING_PREFIX = "[Staging test] ";
const BRAND_NAME = "Kai Yue Travel";
const BRAND_GOLD = "#f3a600";
const BRAND_TEXT = "#1a1a1a";
const HEADER_BG = "#ffffff";
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

export { formatBookingReference };

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
  return rows.filter((row) => singleLine(row.label) !== "" && singleLine(row.value) !== "");
}

const DETAIL_SEMANTIC_ALIASES: Record<string, string> = {
  "reference number": "reference",
  "número de referência": "reference",
  參考編號: "reference",
  reference: "reference",
  "pickup time": "pickup_time",
  "hora de recolha": "pickup_time",
  接載時間: "pickup_time",
  上車時間: "pickup_time",
  pickup: "pickup",
  recolha: "pickup",
  接載地點: "pickup",
  接載: "pickup",
  destination: "destination",
  destino: "destination",
  目的地: "destination",
  service: "service",
  serviço: "service",
  服務: "service",
  passengers: "passengers",
  passageiros: "passengers",
  乘客: "passengers",
  guest: "guest",
  name: "guest",
  nome: "guest",
  姓名: "guest",
  客人: "guest",
  email: "email",
  correio: "email",
  電郵: "email",
  phone: "phone",
  telefone: "phone",
  電話: "phone",
  message: "message",
  mensagem: "message",
  訊息: "message",
  "big luggage": "luggage",
  luggage: "luggage",
  bagagem: "luggage",
  大行李: "luggage",
  "hand carry": "hand_carry",
  手提行李: "hand_carry",
  "special offer": "offer",
  特別優惠: "offer",
  "tour package": "package",
  "professional tour guide": "tour_guide",
};

const DETAIL_LABELS: Record<AckLocale, Record<string, string>> = {
  en: {
    reference: ENGLISH_REFERENCE_LABEL,
    pickup_time: "Pickup time",
    pickup: "Pickup",
    destination: "Destination",
    service: "Service",
    passengers: "Passengers",
    guest: "Guest",
    email: "Email",
    phone: "Phone",
    message: "Message",
    luggage: "Big luggage",
    hand_carry: "Hand carry",
    offer: "Special offer",
    package: "Tour package",
    tour_guide: "Professional tour guide",
  },
  pt: {
    reference: "Número de referência",
    pickup_time: "Hora de recolha",
    pickup: "Recolha",
    destination: "Destino",
    service: "Serviço",
    passengers: "Passageiros",
    guest: "Nome",
    email: "Email",
    phone: "Telefone",
    message: "Mensagem",
    luggage: "Bagagem grande",
    hand_carry: "Bagagem de mão",
    offer: "Oferta especial",
    package: "Pacote de visita",
    tour_guide: "Guia profissional",
  },
  "zh-Hant": {
    reference: "參考編號",
    pickup_time: "接載時間",
    pickup: "接載地點",
    destination: "目的地",
    service: "服務",
    passengers: "乘客",
    guest: "客人",
    email: "電郵",
    phone: "電話",
    message: "訊息",
    luggage: "大行李",
    hand_carry: "手提行李",
    offer: "特別優惠",
    package: "行程套票",
    tour_guide: "專業導遊",
  },
};

function detailSemanticKey(label: string): string {
  return DETAIL_SEMANTIC_ALIASES[label.toLowerCase()] ?? label.toLowerCase();
}

function isReferenceDetail(label: string): boolean {
  return detailSemanticKey(label) === "reference";
}

function localizeMergedRows(locale: AckLocale, rows: DetailRow[]): DetailRow[] {
  const labels = DETAIL_LABELS[locale];
  return rows.map((row) => {
    const key = detailSemanticKey(row.label);
    return { label: labels[key] ?? row.label, value: row.value };
  });
}

function mergeDetailRows(...groups: Array<DetailRow[] | undefined>): DetailRow[] {
  const seen = new Set<string>();
  const merged: DetailRow[] = [];
  for (const group of groups) {
    for (const row of group ?? []) {
      const label = singleLine(row.label);
      const value = singleLine(row.value);
      if (!label || !value) continue;
      const key = detailSemanticKey(label);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ label, value });
    }
  }
  return merged;
}

function originHost(siteUrl: string | undefined): string {
  try {
    if (!siteUrl) return "";
    return new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`).origin;
  } catch {
    return "";
  }
}

function displaySite(siteUrl: string | undefined): string {
  const origin = originHost(siteUrl);
  return origin.replace(/^https:\/\//, "") || singleLine(siteUrl ?? "");
}

function adminDashboardUrl(siteUrl: string | undefined): string {
  try {
    if (!siteUrl) return "";
    const url = new URL(siteUrl.includes("://") ? siteUrl : `https://${siteUrl}`);
    if (url.hostname.toLowerCase() === STAGING_MARKETING_HOST) {
      return `https://${STAGING_ADMIN_HOST}`;
    }
  } catch {
    return "";
  }
  return "";
}

function brandedEmailHtml(
  lang: string,
  subject: string,
  inner: string,
  brand: EmailBrand = {},
): string {
  const title = escapeHtml(subject);
  const brandName = escapeHtml(BRAND_NAME);
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${brandName}" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" style="display:block;border:0;width:${EMAIL_LOGO_WIDTH}px;height:${EMAIL_LOGO_HEIGHT}px;">`
    : "";
  const origin = originHost(brand.siteUrl);
  const footerLink = origin
    ? `<a href="${escapeHtml(origin)}" style="color:#666666;text-decoration:underline;">${escapeHtml(displaySite(brand.siteUrl))}</a>`
    : "";
  const footer = `<p style="margin:24px 0 0;font-size:12px;line-height:1.4;color:#666666;">${brandName}${footerLink ? ` · ${footerLink}` : ""}</p>`;
  return `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#f4f4f4;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;"><tr><td style="background:${HEADER_BG};padding:20px 24px 16px;">${logo}</td></tr><tr><td style="height:4px;line-height:4px;font-size:0;background:${BRAND_GOLD};">&nbsp;</td></tr><tr><td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:${BRAND_TEXT};">${inner}${footer}</td></tr></table></td></tr></table></body></html>`;
}

function valueCellStyle(label: string): string {
  const wrap = isReferenceDetail(label)
    ? "white-space:nowrap;"
    : "white-space:normal;overflow-wrap:anywhere;word-break:break-word;";
  return `padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:${BRAND_TEXT};border-bottom:1px solid #eeeeee;${wrap}`;
}

function rowsHtml(rows: DetailRow[]): string {
  const visible = visibleRows(rows);
  if (visible.length === 0) return "";
  const cells = visible
    .map(
      ({ label, value }) =>
        `<tr><td valign="top" width="44%" style="width:44%;padding:8px 12px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:#555555;border-bottom:1px solid #eeeeee;">${escapeHtml(label)}</td><td valign="top" style="${valueCellStyle(label)}">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">${cells}</table>`;
}

function rowsText(rows: DetailRow[]): string {
  const visible = visibleRows(rows);
  if (visible.length === 0) return "";
  const width = visible.reduce((max, row) => Math.max(max, row.label.length), 0);
  return visible
    .map(({ label, value }) => `${label.padEnd(width)}: ${singleLine(value)}`)
    .join("\n");
}

const SYNTHETIC_BANNER: Record<AckLocale, string> = {
  en: "SYNTHETIC PREVIEW — this is not a stored booking. Do not treat these details as a real reservation.",
  pt: "PRÉ-VISUALIZAÇÃO SINTÉTICA — isto não é uma reserva guardada. Não trate estes dados como uma reserva real.",
  "zh-Hant": "合成預覽 — 此郵件不是已儲存的預約。請勿視為真實訂單。",
};

function bannerHtml(locale: AckLocale, on: boolean | undefined): string {
  if (!on) return "";
  return `<p style="margin:0 0 16px;padding:10px 12px;background:#fff8e6;border:1px solid ${BRAND_GOLD};font-size:13px;color:${BRAND_TEXT};"><strong>${escapeHtml(SYNTHETIC_BANNER[locale])}</strong></p>`;
}

function bannerText(locale: AckLocale, on: boolean | undefined): string[] {
  return on ? [SYNTHETIC_BANNER[locale], ""] : [];
}

export function renderStaffMessage(
  site: MailSite,
  input: StaffMessageInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const heading = input.kind === "booking" ? "New booking request" : "New inquiry";
  const subject = `${prefix(site)}${heading} ${input.reference}`;
  const rows = mergeDetailRows(
    [{ label: ENGLISH_REFERENCE_LABEL, value: input.reference }],
    input.details,
  );
  const adminUrl = adminDashboardUrl(brand.siteUrl);
  const review = adminUrl
    ? `Review it in the Kai Yue admin dashboard (${adminUrl}). Reply to this email to answer the guest directly.`
    : "Review it in the Kai Yue admin dashboard. Reply to this email to answer the guest directly.";
  const text = [
    ...bannerText("en", input.syntheticPreview),
    heading,
    "",
    input.summary,
    "",
    rowsText(rows),
    "",
    review,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
  const html = brandedEmailHtml(
    "en",
    subject,
    `${bannerHtml("en", input.syntheticPreview)}<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(heading)}</h1><p>${escapeHtml(input.summary)}</p>${rowsHtml(rows)}<p>${escapeHtml(review)}</p>`,
    brand,
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
    referenceLabel: ENGLISH_REFERENCE_LABEL,
    notConfirmed: {
      booking:
        "This is not a booking confirmation. Our team will check availability and contact you to confirm the details.",
      contact: "Our team will review your message and reply to you.",
    },
    service: "Service",
    pickupTime: "Pickup time",
    changes: (site) =>
      `To change your request, contact us through ${site} and quote this reference number.`,
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
    referenceLabel: "Número de referência",
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
    referenceLabel: "參考編號",
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

const CONFIRM_COPY: Record<
  AckLocale,
  {
    tag: string;
    heading: string;
    subject: (reference: string) => string;
    greeting: (name: string | null) => string;
    body: string;
    referenceLabel: string;
    changes: (site: string) => string;
    signoff: string;
    automated: string;
  }
> = {
  en: {
    tag: "en",
    heading: "Your chauffeur booking is confirmed",
    subject: (reference) => `Your chauffeur booking is confirmed ${reference}`,
    greeting: (name) => (name ? `Hello ${name},` : "Hello,"),
    body: "We have confirmed your chauffeur booking. The confirmed details are below.",
    referenceLabel: ENGLISH_REFERENCE_LABEL,
    changes: (site) =>
      `If you need to speak with us, contact us through ${site} and quote this reference number.`,
    signoff: "Kai Yue Travel",
    automated: "This is an automated message. Replies to this address are not monitored.",
  },
  pt: {
    tag: "pt-PT",
    heading: "A sua reserva de motorista está confirmada",
    subject: (reference) => `A sua reserva de motorista está confirmada ${reference}`,
    greeting: (name) => (name ? `Olá ${name},` : "Olá,"),
    body: "Confirmámos a sua reserva de motorista. Os detalhes confirmados estão abaixo.",
    referenceLabel: "Número de referência",
    changes: (site) =>
      `Se precisar de nos contactar, use ${site} e indique este número de referência.`,
    signoff: "Kai Yue Travel",
    automated: "Esta é uma mensagem automática. As respostas para este endereço não são lidas.",
  },
  "zh-Hant": {
    tag: "zh-Hant",
    heading: "您的專車預約已確認",
    subject: (reference) => `您的專車預約已確認 ${reference}`,
    greeting: (name) => (name ? `${name} 您好：` : "您好："),
    body: "我們已確認您的專車預約。確認詳情如下。",
    referenceLabel: "參考編號",
    changes: (site) => `如需聯絡我們，請透過 ${site}，並提供此參考編號。`,
    signoff: "Kai Yue Travel",
    automated: "此為自動發送的郵件，請勿直接回覆。",
  },
};

const CANCEL_COPY: Record<
  AckLocale,
  {
    tag: string;
    heading: string;
    subject: (reference: string) => string;
    greeting: (name: string | null) => string;
    body: string;
    referenceLabel: string;
    changes: (site: string) => string;
    signoff: string;
    automated: string;
  }
> = {
  en: {
    tag: "en",
    heading: "Your chauffeur booking has been cancelled",
    subject: (reference) => `Your chauffeur booking has been cancelled ${reference}`,
    greeting: (name) => (name ? `Hello ${name},` : "Hello,"),
    body: "We have cancelled this chauffeur booking.",
    referenceLabel: ENGLISH_REFERENCE_LABEL,
    changes: (site) =>
      `If you still need a chauffeur, contact us through ${site} and quote this reference number.`,
    signoff: "Kai Yue Travel",
    automated: "This is an automated message. Replies to this address are not monitored.",
  },
  pt: {
    tag: "pt-PT",
    heading: "A sua reserva de motorista foi cancelada",
    subject: (reference) => `A sua reserva de motorista foi cancelada ${reference}`,
    greeting: (name) => (name ? `Olá ${name},` : "Olá,"),
    body: "Cancelámos esta reserva de motorista.",
    referenceLabel: "Número de referência",
    changes: (site) =>
      `Se ainda precisar de um motorista, contacte-nos através de ${site} e indique este número de referência.`,
    signoff: "Kai Yue Travel",
    automated: "Esta é uma mensagem automática. As respostas para este endereço não são lidas.",
  },
  "zh-Hant": {
    tag: "zh-Hant",
    heading: "您的專車預約已取消",
    subject: (reference) => `您的專車預約已取消 ${reference}`,
    greeting: (name) => (name ? `${name} 您好：` : "您好："),
    body: "我們已取消此專車預約。",
    referenceLabel: "參考編號",
    changes: (site) => `如仍需要專車，請透過 ${site} 聯絡我們，並提供此參考編號。`,
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

function customerDetailRows(
  locale: AckLocale,
  copy: { tag: string; referenceLabel: string; service: string; pickupTime: string },
  input: CustomerAckInput,
): DetailRow[] {
  const extras: DetailRow[] = [{ label: copy.referenceLabel, value: input.reference }];
  if (input.kind === "booking" && input.serviceType) {
    extras.push({ label: copy.service, value: SERVICE_NAMES[locale][input.serviceType] });
  }
  if (input.kind === "booking" && input.pickupAt) {
    extras.push({
      label: copy.pickupTime,
      value: formatPickup(input.pickupAt, copy.tag, input.timezone),
    });
  }
  return localizeMergedRows(locale, mergeDetailRows(extras, input.details));
}

function closingHtml(signoff: string, automated: string): string {
  return `<p>${escapeHtml(signoff)}</p><p style="font-size:12px;color:#666">${escapeHtml(automated)}</p>`;
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
  const rows = customerDetailRows(locale, copy, input);
  const siteDisplay = displaySite(input.siteUrl) || displaySite(brand.siteUrl);
  const paragraphs = [
    copy.received[input.kind],
    copy.notConfirmed[input.kind],
    copy.changes(siteDisplay),
  ];
  const text = [
    ...bannerText(locale, input.syntheticPreview),
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
    `${bannerHtml(locale, input.syntheticPreview)}<p>${escapeHtml(copy.greeting(name))}</p><p>${escapeHtml(paragraphs[0]!)}</p>${rowsHtml(rows)}<p><strong>${escapeHtml(paragraphs[1]!)}</strong></p><p>${escapeHtml(paragraphs[2]!)}</p>${closingHtml(copy.signoff, copy.automated)}`,
    { ...brand, siteUrl: brand.siteUrl || originHost(input.siteUrl) },
  );
  return { subject, text, html };
}

export function renderCustomerConfirmed(
  site: MailSite,
  input: CustomerLifecycleInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const locale = ackLocale(input.locale);
  const copy = CONFIRM_COPY[locale];
  const reference = singleLine(input.reference);
  const name = input.name ? singleLine(input.name) : null;
  const subject = `${prefix(site)}${copy.subject(reference)}`;
  const rows = localizeMergedRows(
    locale,
    mergeDetailRows([{ label: copy.referenceLabel, value: reference }], input.details),
  );
  const siteDisplay = displaySite(input.siteUrl) || displaySite(brand.siteUrl);
  const text = [
    ...bannerText(locale, input.syntheticPreview),
    copy.greeting(name),
    "",
    copy.body,
    "",
    rowsText(rows),
    "",
    copy.changes(siteDisplay),
    "",
    copy.signoff,
    "",
    copy.automated,
  ].join("\n");
  const html = brandedEmailHtml(
    copy.tag,
    subject,
    `${bannerHtml(locale, input.syntheticPreview)}<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.greeting(name))}</p><p>${escapeHtml(copy.body)}</p>${rowsHtml(rows)}<p>${escapeHtml(copy.changes(siteDisplay))}</p>${closingHtml(copy.signoff, copy.automated)}`,
    { ...brand, siteUrl: brand.siteUrl || originHost(input.siteUrl) },
  );
  return { subject, text, html };
}

export function renderCustomerCancelled(
  site: MailSite,
  input: CustomerLifecycleInput,
  brand: EmailBrand = {},
): RenderedEmail {
  const locale = ackLocale(input.locale);
  const copy = CANCEL_COPY[locale];
  const reference = singleLine(input.reference);
  const name = input.name ? singleLine(input.name) : null;
  const subject = `${prefix(site)}${copy.subject(reference)}`;
  const rows = localizeMergedRows(
    locale,
    mergeDetailRows([{ label: copy.referenceLabel, value: reference }], input.details),
  );
  const siteDisplay = displaySite(input.siteUrl) || displaySite(brand.siteUrl);
  const text = [
    ...bannerText(locale, input.syntheticPreview),
    copy.greeting(name),
    "",
    copy.body,
    "",
    rowsText(rows),
    "",
    copy.changes(siteDisplay),
    "",
    copy.signoff,
    "",
    copy.automated,
  ].join("\n");
  const html = brandedEmailHtml(
    copy.tag,
    subject,
    `${bannerHtml(locale, input.syntheticPreview)}<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.greeting(name))}</p><p>${escapeHtml(copy.body)}</p>${rowsHtml(rows)}<p>${escapeHtml(copy.changes(siteDisplay))}</p>${closingHtml(copy.signoff, copy.automated)}`,
    { ...brand, siteUrl: brand.siteUrl || originHost(input.siteUrl) },
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
    brand,
  );
  return { subject, text: draft.body, html };
}
