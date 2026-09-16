import { z } from "zod";
import { isPlausiblePhone, normalizePhone } from "./phone.ts";

export const INQUIRY_TYPES = ["general", "corporate", "partnership", "media"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const contactCreateSchema = z
  .object({
    inquiryType: z.enum(INQUIRY_TYPES),
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(8).max(32),
    email: z
      .string()
      .trim()
      .email()
      .max(160)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value ? value : undefined)),
    company: optionalText(120),
    message: z.string().trim().min(10).max(2000),
    locale: z.string().trim().min(2).max(16).default("en"),
    sourcePage: z.string().trim().min(1).max(200),
    privacyAccepted: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.inquiryType === "corporate" && !value.company) {
      ctx.addIssue({
        code: "custom",
        path: ["company"],
        message: "Company name is required for corporate inquiries.",
      });
    }

    if (!isPlausiblePhone(normalizePhone(value.phone))) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a valid phone number with country code.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    phone: normalizePhone(value.phone),
    phoneDisplay: value.phone.trim(),
    email: value.email?.toLowerCase(),
  }));

export type ContactCreateInput = z.input<typeof contactCreateSchema>;
export type ContactCreatePayload = z.output<typeof contactCreateSchema>;
