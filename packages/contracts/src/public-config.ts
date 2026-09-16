import { SERVICE_TYPES } from "./booking.ts";
import { INQUIRY_TYPES } from "./contact.ts";

export const DEFAULT_BUSINESS_TIMEZONE = "Asia/Macau";
export const DEFAULT_LOCALE = "en";
export const DEFAULT_NOTICE_HOURS = 24;

export const SERVICE_LABELS: Record<(typeof SERVICE_TYPES)[number], string> = {
  airport_transfer: "Airport transfer",
  hotel_transfer: "Hotel transfer",
  point_to_point: "Point to point",
  hourly_charter: "Hourly charter",
  sightseeing: "Macau sightseeing",
  corporate: "Corporate transport",
  custom: "Custom request",
};

export const INQUIRY_LABELS: Record<(typeof INQUIRY_TYPES)[number], string> = {
  general: "General inquiry",
  corporate: "Corporate / B2B",
  partnership: "Partnership",
  media: "Media",
};

export type PublicConfig = {
  timezone: string;
  locale: string;
  noticeHours: number;
  serviceTypes: typeof SERVICE_TYPES;
  inquiryTypes: typeof INQUIRY_TYPES;
  serviceLabels: typeof SERVICE_LABELS;
  inquiryLabels: typeof INQUIRY_LABELS;
  confirmationCopy: string;
};

export function getPublicConfig(
  overrides?: Partial<Pick<PublicConfig, "timezone" | "noticeHours">>,
): PublicConfig {
  return {
    timezone: overrides?.timezone ?? DEFAULT_BUSINESS_TIMEZONE,
    locale: DEFAULT_LOCALE,
    noticeHours: overrides?.noticeHours ?? DEFAULT_NOTICE_HOURS,
    serviceTypes: SERVICE_TYPES,
    inquiryTypes: INQUIRY_TYPES,
    serviceLabels: SERVICE_LABELS,
    inquiryLabels: INQUIRY_LABELS,
    confirmationCopy:
      "Your request has been received and is awaiting confirmation from our team. This is not a confirmed booking.",
  };
}
