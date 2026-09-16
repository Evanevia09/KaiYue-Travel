import { z } from "zod";
import { isPlausiblePhone, normalizePhone } from "./phone.ts";

export const SERVICE_TYPES = [
  "airport_transfer",
  "hotel_transfer",
  "point_to_point",
  "hourly_charter",
  "sightseeing",
  "corporate",
  "custom",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

export const VEHICLE_PREFERENCES = ["no_preference", "executive_van", "sedan"] as const;
export type VehiclePreference = (typeof VEHICLE_PREFERENCES)[number];

export const BOOKING_SOURCE_MODES = ["embedded", "bottom-sheet", "page"] as const;
export type BookingSourceMode = (typeof BOOKING_SOURCE_MODES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const bookingCreateSchema = z
  .object({
    serviceType: z.enum(SERVICE_TYPES),
    pickupLocation: z.string().trim().min(2).max(160),
    destination: optionalText(160),
    pickupAt: z.string().datetime({ offset: true }),
    returnAt: z.string().datetime({ offset: true }).optional(),
    passengerCount: z.number().int().min(1).max(14),
    luggageCount: z.number().int().min(0).max(20).optional(),
    vehiclePreference: z.enum(VEHICLE_PREFERENCES).optional(),
    contactName: z.string().trim().min(2).max(80),
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
    notes: optionalText(800),
    locale: z.string().trim().min(2).max(16).default("en"),
    sourcePage: z.string().trim().min(1).max(200),
    sourceTrigger: z.string().trim().min(1).max(80),
    sourceMode: z.enum(BOOKING_SOURCE_MODES),
    privacyAccepted: z.literal(true),
    website: z.string().max(0).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.serviceType !== "hourly_charter" && !value.destination) {
      ctx.addIssue({
        code: "custom",
        path: ["destination"],
        message: "Enter a destination.",
      });
    }

    const pickup = Date.parse(value.pickupAt);
    if (Number.isNaN(pickup)) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupAt"],
        message: "Enter a valid pickup time.",
      });
      return;
    }

    if (value.returnAt) {
      const returnAt = Date.parse(value.returnAt);
      if (Number.isNaN(returnAt) || returnAt <= pickup) {
        ctx.addIssue({
          code: "custom",
          path: ["returnAt"],
          message: "Return time must be after pickup.",
        });
      }
    }

    const phone = normalizePhone(value.phone);
    if (!isPlausiblePhone(phone)) {
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

export type BookingCreateInput = z.input<typeof bookingCreateSchema>;
export type BookingCreatePayload = z.output<typeof bookingCreateSchema>;

export function destinationRequired(serviceType: ServiceType): boolean {
  return serviceType !== "hourly_charter";
}

export function validatePickupNotice(
  pickupAt: string,
  noticeHours: number,
  now = new Date(),
): string | undefined {
  const pickup = Date.parse(pickupAt);
  if (Number.isNaN(pickup)) {
    return "Enter a valid pickup time.";
  }
  const minimum = now.getTime() + noticeHours * 60 * 60 * 1000;
  if (pickup < minimum) {
    return noticeHours > 0
      ? `Pickup must be at least ${noticeHours} hours from now.`
      : "Pickup must be in the future.";
  }
  return undefined;
}
