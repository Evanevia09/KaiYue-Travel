import { z } from "zod";

export const OFFER_STATUSES = ["draft", "published"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_TITLE_MAX = 120;
export const OFFER_DESCRIPTION_MAX = 2000;
export const OFFER_TERMS_MAX = 4000;
export const OFFER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const OFFER_IMAGE_MAX_EDGE = 1600;
export const OFFER_THUMB_MAX_EDGE = 480;
export const OFFER_IMAGE_CACHE_SECONDS = 31536000;
export const OFFER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type OfferImageType = (typeof OFFER_IMAGE_TYPES)[number];

export function scaledOfferImageSize(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: maxEdge, height: Math.round(maxEdge * 0.68) };
  }
  if (longEdge <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
};

export const offerWriteSchema = z.object({
  title: z.string().trim().min(1).max(OFFER_TITLE_MAX),
  description: z.string().trim().min(1).max(OFFER_DESCRIPTION_MAX),
  priceFrom: z.preprocess(
    emptyToUndefined,
    z.number().positive().finite().max(1_000_000).optional(),
  ),
  terms: z.preprocess(emptyToUndefined, z.string().trim().max(OFFER_TERMS_MAX).optional()),
});

export type OfferWriteInput = z.infer<typeof offerWriteSchema>;

export function isOfferReady(offer: {
  title: string;
  description: string;
  photos: Array<{ isMain: boolean }>;
}): boolean {
  return (
    offer.title.trim().length > 0 &&
    offer.description.trim().length > 0 &&
    offer.photos.length > 0 &&
    offer.photos.some((photo) => photo.isMain)
  );
}

export function isCompleteOffer(offer: {
  status: string;
  title: string;
  description: string;
  photos: Array<{ isMain: boolean }>;
}): boolean {
  return offer.status === "published" && isOfferReady(offer);
}
