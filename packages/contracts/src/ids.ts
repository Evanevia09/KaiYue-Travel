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

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
