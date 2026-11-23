const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

export function createIdempotencyKey(): string {
  return crypto.randomUUID();
}

export function createPublicReference(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(
    bytes,
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join("");
  return `${prefix}-${body}`;
}

export function createBookingReference(): string {
  return createPublicReference("KY");
}

export function createContactReference(): string {
  return createPublicReference("INQ");
}

export const SERIAL_BOOKING_REFERENCE = /^KY[0-9]{5,}$/;
export const LEGACY_BOOKING_REFERENCE = /^KY-[A-Z2-9]{8}$/;

/** Display/store format for new chauffeur bookings: KY + at least five digits, no hyphen. */
export function formatBookingReference(serial: number): string {
  if (!Number.isInteger(serial) || serial < 1) {
    throw new Error("invalid_booking_reference_serial");
  }
  return `KY${String(serial).padStart(5, "0")}`;
}

export function isChauffeurBookingReference(value: string): boolean {
  return SERIAL_BOOKING_REFERENCE.test(value) || LEGACY_BOOKING_REFERENCE.test(value);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
