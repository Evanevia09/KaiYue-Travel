import { AppError, OFFER_IMAGE_MAX_BYTES, OFFER_IMAGE_TYPES } from "@kaiyue/contracts";

const SIGNATURES = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
} as const;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const header = new TextDecoder().decode(bytes.slice(0, 4));
  const format = new TextDecoder().decode(bytes.slice(8, 12));
  return header === "RIFF" && format === "WEBP";
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const head = new TextDecoder()
    .decode(bytes.slice(0, 256))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  return head.startsWith("<svg") || head.startsWith("<?xml");
}

export function detectImageType(bytes: Uint8Array): (typeof OFFER_IMAGE_TYPES)[number] | null {
  if (looksLikeSvg(bytes)) return null;
  if (startsWith(bytes, SIGNATURES["image/jpeg"])) return "image/jpeg";
  if (startsWith(bytes, SIGNATURES["image/png"])) return "image/png";
  if (isWebp(bytes)) return "image/webp";
  return null;
}

export function assertOfferImage(
  bytes: Uint8Array,
  declaredType: string,
): (typeof OFFER_IMAGE_TYPES)[number] {
  if (bytes.byteLength === 0) {
    throw new AppError("VALIDATION_FAILED", "Choose a JPEG, PNG, or WebP image.", {
      fields: { photo: "Choose a JPEG, PNG, or WebP image." },
    });
  }
  if (bytes.byteLength > OFFER_IMAGE_MAX_BYTES) {
    throw new AppError("VALIDATION_FAILED", "Each photo must be 5 MB or smaller.", {
      fields: { photo: "Each photo must be 5 MB or smaller." },
    });
  }
  const detected = detectImageType(bytes);
  const mime = declaredType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (
    !detected ||
    !OFFER_IMAGE_TYPES.includes(mime as (typeof OFFER_IMAGE_TYPES)[number]) ||
    detected !== mime
  ) {
    throw new AppError("VALIDATION_FAILED", "Only JPEG, PNG, or WebP files are accepted.", {
      fields: { photo: "Only JPEG, PNG, or WebP files are accepted." },
    });
  }
  return detected;
}

export function offerObjectKey(
  offerId: string,
  contentType: (typeof OFFER_IMAGE_TYPES)[number],
): string {
  const extension =
    contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  return `offers/${offerId}/${crypto.randomUUID()}.${extension}`;
}
