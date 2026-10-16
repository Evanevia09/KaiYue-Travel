import {
  AppError,
  isCompleteOffer,
  offerWriteSchema,
  type OfferWriteInput,
} from "@kaiyue/contracts";
import type { AppEnv } from "../env.ts";
import { assertOfferImage, hashOfferImage, offerObjectKey } from "./images.ts";
import { createMemoryObjectStore, createR2ObjectStore, type ObjectStore } from "./objects.ts";
import {
  createD1OfferStore,
  createMemoryOfferStore,
  offerPhotoObjectKeys,
  offerPhotoVersion,
  toAdminOffer,
  toPublicOffer,
  type OfferStore,
} from "./store.ts";

export function offerRuntime(env: AppEnv): { store: OfferStore; objects: ObjectStore } {
  return {
    store: env.offerStore ?? (env.DB ? createD1OfferStore(env.DB) : createMemoryOfferStore()),
    objects:
      env.objectStore ??
      (env.OFFERS_BUCKET ? createR2ObjectStore(env.OFFERS_BUCKET) : createMemoryObjectStore()),
  };
}

export function parseOfferWrite(input: unknown): OfferWriteInput {
  const parsed = offerWriteSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".") || "form"] ??= issue.message;
    }
    throw new AppError("VALIDATION_FAILED", "Check the highlighted fields.", { fields });
  }
  return parsed.data;
}

export async function listAdminOffers(env: AppEnv) {
  const { store } = offerRuntime(env);
  return { items: (await store.list()).map(toAdminOffer) };
}

export async function getAdminOffer(env: AppEnv, id: string) {
  const offer = await offerRuntime(env).store.get(id);
  if (!offer) throw new AppError("NOT_FOUND", "Offer not found.");
  return { item: toAdminOffer(offer) };
}

export async function listPublicOffers(env: AppEnv) {
  const { store } = offerRuntime(env);
  const items = (await store.listPublished())
    .filter((offer) => isCompleteOffer(offer))
    .map(toPublicOffer);
  return { items };
}

export async function getPublicOffer(env: AppEnv, id: string) {
  const offer = await offerRuntime(env).store.get(id);
  if (!offer || !isCompleteOffer(offer)) {
    throw new AppError("NOT_FOUND", "Offer not found.");
  }
  return { item: toPublicOffer(offer) };
}

export async function createOffer(env: AppEnv, input: unknown, actorId: string, requestId: string) {
  const { store } = offerRuntime(env);
  const offer = await store.create(parseOfferWrite(input));
  await store.recordAudit({
    offerId: offer.id,
    eventType: "created",
    actorId,
    requestId,
    toValue: "draft",
  });
  return { item: toAdminOffer(offer) };
}

export async function updateOffer(
  env: AppEnv,
  id: string,
  input: unknown,
  actorId: string,
  requestId: string,
) {
  const { store } = offerRuntime(env);
  const offer = await store.update(id, parseOfferWrite(input));
  await store.recordAudit({
    offerId: id,
    eventType: "updated",
    actorId,
    requestId,
  });
  return { item: toAdminOffer(offer) };
}

export async function publishOffer(env: AppEnv, id: string, actorId: string, requestId: string) {
  const { store } = offerRuntime(env);
  const offer = await store.setStatus(id, "published", {
    eventType: "published",
    actorId,
    requestId,
    fromValue: "draft",
    toValue: "published",
  });
  return { item: toAdminOffer(offer) };
}

export async function unpublishOffer(env: AppEnv, id: string, actorId: string, requestId: string) {
  const { store } = offerRuntime(env);
  const offer = await store.setStatus(id, "draft", {
    eventType: "unpublished",
    actorId,
    requestId,
    fromValue: "published",
    toValue: "draft",
  });
  return { item: toAdminOffer(offer) };
}

export async function deleteOffer(env: AppEnv, id: string, actorId: string, requestId: string) {
  const { store, objects } = offerRuntime(env);
  const offer = await store.delete(id);
  await objects.deleteMany(offer.photos.flatMap((photo) => offerPhotoObjectKeys(photo)));
  await store.recordAudit({
    offerId: id,
    eventType: "deleted",
    actorId,
    requestId,
    fromValue: offer.status,
  });
  return { deleted: true, id };
}

export async function addOfferPhoto(
  env: AppEnv,
  offerId: string,
  file: {
    bytes: Uint8Array;
    type: string;
    thumbnail?: { bytes: Uint8Array; type: string };
    width?: number | null;
    height?: number | null;
  },
  actorId: string,
  requestId: string,
) {
  const contentType = assertOfferImage(file.bytes, file.type);
  const { store, objects } = offerRuntime(env);
  const existing = await store.get(offerId);
  if (!existing) throw new AppError("NOT_FOUND", "Offer not found.");
  const photoId = crypto.randomUUID();
  const contentHash = await hashOfferImage(file.bytes);
  const objectKey = offerObjectKey(offerId, photoId, contentHash, contentType);
  const storedKeys = [objectKey];
  await objects.put(objectKey, file.bytes, contentType);
  let thumbObjectKey = objectKey;
  try {
    if (file.thumbnail) {
      const thumbType = assertOfferImage(file.thumbnail.bytes, file.thumbnail.type);
      thumbObjectKey = offerObjectKey(offerId, photoId, contentHash, thumbType, "thumb");
      await objects.put(thumbObjectKey, file.thumbnail.bytes, thumbType);
      storedKeys.push(thumbObjectKey);
    }
    const offer = await store.addPhoto(offerId, {
      id: photoId,
      objectKey,
      thumbObjectKey,
      contentType,
      contentHash,
      isMain: existing.photos.length === 0,
      width: file.width ?? null,
      height: file.height ?? null,
      byteSize: file.bytes.byteLength,
    });
    await store.recordAudit({
      offerId,
      eventType: "photo_added",
      actorId,
      requestId,
    });
    return { item: toAdminOffer(offer) };
  } catch (error) {
    await objects.deleteMany(storedKeys);
    throw error;
  }
}

export async function deleteOfferPhoto(
  env: AppEnv,
  offerId: string,
  photoId: string,
  actorId: string,
  requestId: string,
) {
  const { store, objects } = offerRuntime(env);
  const { offer, objectKeys } = await store.removePhoto(offerId, photoId);
  await objects.deleteMany(objectKeys);
  await store.recordAudit({
    offerId,
    eventType: "photo_deleted",
    actorId,
    requestId,
  });
  return { item: toAdminOffer(offer) };
}

export async function setMainOfferPhoto(
  env: AppEnv,
  offerId: string,
  photoId: string,
  actorId: string,
  requestId: string,
) {
  const { store } = offerRuntime(env);
  const offer = await store.setMainPhoto(offerId, photoId);
  await store.recordAudit({
    offerId,
    eventType: "main_photo",
    actorId,
    requestId,
    toValue: photoId,
  });
  return { item: toAdminOffer(offer) };
}

export async function readOfferPhoto(
  env: AppEnv,
  offerId: string,
  photoId: string,
  options: { publicOnly?: boolean; variant?: "full" | "thumb"; version?: string } = {},
) {
  const { store, objects } = offerRuntime(env);
  const offer = await store.get(offerId);
  if (!offer) throw new AppError("NOT_FOUND", "Offer not found.");
  if (options.publicOnly && !isCompleteOffer(offer)) {
    throw new AppError("NOT_FOUND", "Offer not found.");
  }
  const photo = offer.photos.find((item) => item.id === photoId);
  if (!photo) throw new AppError("NOT_FOUND", "Photo not found.");
  if (options.version && options.version !== offerPhotoVersion(photo)) {
    throw new AppError("NOT_FOUND", "Photo not found.");
  }
  const objectKey = options.variant === "thumb" ? photo.thumbObjectKey : photo.objectKey;
  const object = await objects.get(objectKey);
  if (!object) throw new AppError("NOT_FOUND", "Photo not found.");
  return { ...object, photo };
}
