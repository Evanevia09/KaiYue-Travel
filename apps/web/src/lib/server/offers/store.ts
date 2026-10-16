import { AppError, isOfferReady, type OfferWriteInput } from "@kaiyue/contracts";
import type { D1Database } from "../env.ts";
import { all, first, nowIso, run } from "../db.ts";

export type OfferPhotoRecord = {
  id: string;
  offerId: string;
  objectKey: string;
  thumbObjectKey: string;
  contentType: string;
  contentHash: string;
  isMain: boolean;
  sortOrder: number;
  width: number | null;
  height: number | null;
  byteSize: number | null;
  createdAt: string;
};

export type OfferRecord = {
  id: string;
  status: "draft" | "published";
  title: string;
  description: string;
  priceFrom: number | null;
  terms: string | null;
  createdAt: string;
  updatedAt: string;
  photos: OfferPhotoRecord[];
};

export type OfferStore = {
  list(): Promise<OfferRecord[]>;
  get(id: string): Promise<OfferRecord | null>;
  create(input: OfferWriteInput): Promise<OfferRecord>;
  update(id: string, input: OfferWriteInput): Promise<OfferRecord>;
  setStatus(id: string, status: "draft" | "published"): Promise<OfferRecord>;
  delete(id: string): Promise<OfferRecord>;
  addPhoto(
    offerId: string,
    photo: {
      id?: string;
      objectKey: string;
      thumbObjectKey: string;
      contentType: string;
      contentHash: string;
      isMain: boolean;
      width?: number | null;
      height?: number | null;
      byteSize?: number | null;
    },
  ): Promise<OfferRecord>;
  listPublished(): Promise<OfferRecord[]>;
  removePhoto(
    offerId: string,
    photoId: string,
  ): Promise<{ offer: OfferRecord; objectKeys: string[] }>;
  setMainPhoto(offerId: string, photoId: string): Promise<OfferRecord>;
  recordAudit(input: {
    offerId: string;
    eventType: string;
    actorId: string;
    fromValue?: string | null;
    toValue?: string | null;
    requestId: string;
  }): Promise<void>;
};

type OfferRow = {
  id: string;
  status: "draft" | "published";
  title: string;
  description: string;
  price_from: number | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  offer_id: string;
  object_key: string;
  thumb_object_key: string | null;
  content_type: string;
  content_hash: string | null;
  is_main: number;
  sort_order: number;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  created_at: string;
};

function mapPhoto(row: PhotoRow): OfferPhotoRecord {
  const contentHash = row.content_hash?.trim() || row.id;
  return {
    id: row.id,
    offerId: row.offer_id,
    objectKey: row.object_key,
    thumbObjectKey: row.thumb_object_key?.trim() || row.object_key,
    contentType: row.content_type,
    contentHash,
    isMain: row.is_main === 1,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    byteSize: row.byte_size,
    createdAt: row.created_at,
  };
}

export function offerPhotoVersion(photo: Pick<OfferPhotoRecord, "id" | "contentHash">): string {
  return photo.contentHash?.trim() || photo.id;
}

export function offerPhotoObjectKeys(
  photo: Pick<OfferPhotoRecord, "objectKey" | "thumbObjectKey">,
): string[] {
  return [...new Set([photo.objectKey, photo.thumbObjectKey].filter(Boolean))];
}

export function offerPhotoUrls(
  offerId: string,
  photo: Pick<OfferPhotoRecord, "id" | "contentHash">,
  options: { admin?: boolean } = {},
) {
  const version = offerPhotoVersion(photo);
  const base = options.admin
    ? `/api/admin/offers/${offerId}/photos`
    : `/api/v1/offers/${offerId}/photos`;
  return {
    url: `${base}/${photo.id}/${version}`,
    thumbUrl: `${base}/${photo.id}/thumb/${version}`,
  };
}

function mapOffer(row: OfferRow, photos: OfferPhotoRecord[]): OfferRecord {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    description: row.description,
    priceFrom: row.price_from,
    terms: row.terms,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos: photos.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
    ),
  };
}

export function toAdminOffer(offer: OfferRecord) {
  return {
    ...offer,
    complete: isOfferReady(offer),
    photos: offer.photos.map((photo) => ({
      ...photo,
      ...offerPhotoUrls(offer.id, photo, { admin: true }),
    })),
  };
}

export function toPublicOffer(offer: OfferRecord) {
  const main = offer.photos.find((photo) => photo.isMain) ?? offer.photos[0];
  const mainUrls = main ? offerPhotoUrls(offer.id, main) : null;
  return {
    id: offer.id,
    title: offer.title,
    description: offer.description,
    priceFrom: offer.priceFrom,
    terms: offer.terms ?? "",
    photos: offer.photos.map((photo) => ({
      id: photo.id,
      contentType: photo.contentType,
      isMain: photo.isMain,
      width: photo.width,
      height: photo.height,
      ...offerPhotoUrls(offer.id, photo),
    })),
    mainPhotoUrl: mainUrls?.url ?? null,
    mainPhotoThumbUrl: mainUrls?.thumbUrl ?? null,
    mainPhotoWidth: main?.width ?? null,
    mainPhotoHeight: main?.height ?? null,
    updatedAt: offer.updatedAt,
  };
}

export function createMemoryOfferStore(seed: OfferRecord[] = []): OfferStore {
  const offers = new Map(seed.map((offer) => [offer.id, structuredClone(offer)]));
  const audits: unknown[] = [];

  const requireOffer = (id: string) => {
    const offer = offers.get(id);
    if (!offer) throw new AppError("NOT_FOUND", "Offer not found.");
    return offer;
  };

  return {
    async list() {
      return [...offers.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async listPublished() {
      return (await this.list()).filter((offer) => offer.status === "published");
    },
    async get(id) {
      const offer = offers.get(id);
      return offer ? structuredClone(offer) : null;
    },
    async create(input) {
      const now = nowIso();
      const offer: OfferRecord = {
        id: crypto.randomUUID(),
        status: "draft",
        title: input.title,
        description: input.description,
        priceFrom: input.priceFrom ?? null,
        terms: input.terms ?? null,
        createdAt: now,
        updatedAt: now,
        photos: [],
      };
      offers.set(offer.id, offer);
      return structuredClone(offer);
    },
    async update(id, input) {
      const offer = requireOffer(id);
      offer.title = input.title;
      offer.description = input.description;
      offer.priceFrom = input.priceFrom ?? null;
      offer.terms = input.terms ?? null;
      offer.updatedAt = nowIso();
      return structuredClone(offer);
    },
    async setStatus(id, status) {
      const offer = requireOffer(id);
      if (status === "published" && !isOfferReady(offer)) {
        throw new AppError(
          "VALIDATION_FAILED",
          "Publish requires a title, description, and a main photo.",
        );
      }
      offer.status = status;
      offer.updatedAt = nowIso();
      return structuredClone(offer);
    },
    async delete(id) {
      const offer = requireOffer(id);
      offers.delete(id);
      return structuredClone(offer);
    },
    async addPhoto(offerId, photo) {
      const offer = requireOffer(offerId);
      const record: OfferPhotoRecord = {
        id: photo.id ?? crypto.randomUUID(),
        offerId,
        objectKey: photo.objectKey,
        thumbObjectKey: photo.thumbObjectKey || photo.objectKey,
        contentType: photo.contentType,
        contentHash: photo.contentHash,
        isMain: photo.isMain || offer.photos.length === 0,
        sortOrder: offer.photos.length,
        width: photo.width ?? null,
        height: photo.height ?? null,
        byteSize: photo.byteSize ?? null,
        createdAt: nowIso(),
      };
      if (record.isMain) {
        offer.photos = offer.photos.map((item) => ({ ...item, isMain: false }));
      }
      offer.photos.push(record);
      offer.updatedAt = nowIso();
      return structuredClone(offer);
    },
    async removePhoto(offerId, photoId) {
      const offer = requireOffer(offerId);
      const photo = offer.photos.find((item) => item.id === photoId);
      if (!photo) throw new AppError("NOT_FOUND", "Photo not found.");
      offer.photos = offer.photos.filter((item) => item.id !== photoId);
      if (photo.isMain && offer.photos[0]) offer.photos[0].isMain = true;
      offer.updatedAt = nowIso();
      return { offer: structuredClone(offer), objectKeys: offerPhotoObjectKeys(photo) };
    },
    async setMainPhoto(offerId, photoId) {
      const offer = requireOffer(offerId);
      if (!offer.photos.some((item) => item.id === photoId)) {
        throw new AppError("NOT_FOUND", "Photo not found.");
      }
      offer.photos = offer.photos.map((item) => ({ ...item, isMain: item.id === photoId }));
      offer.updatedAt = nowIso();
      return structuredClone(offer);
    },
    async recordAudit(input) {
      audits.push({ ...input, createdAt: nowIso() });
    },
  };
}

async function loadMany(db: D1Database, status?: "published"): Promise<OfferRecord[]> {
  const rows = status
    ? await all<OfferRow>(
        db,
        "SELECT * FROM offers WHERE status = ? ORDER BY updated_at DESC",
        status,
      )
    : await all<OfferRow>(db, "SELECT * FROM offers ORDER BY updated_at DESC");
  if (rows.length === 0) return [];
  const photoRows =
    status === "published"
      ? await all<PhotoRow>(
          db,
          `SELECT offer_photos.* FROM offer_photos
           INNER JOIN offers ON offers.id = offer_photos.offer_id
           WHERE offers.status = 'published'
           ORDER BY offer_photos.sort_order ASC, offer_photos.created_at ASC`,
        )
      : await all<PhotoRow>(
          db,
          "SELECT * FROM offer_photos ORDER BY sort_order ASC, created_at ASC",
        );
  const photosByOffer = new Map<string, OfferPhotoRecord[]>();
  for (const photo of photoRows) {
    const list = photosByOffer.get(photo.offer_id) ?? [];
    list.push(mapPhoto(photo));
    photosByOffer.set(photo.offer_id, list);
  }
  return rows.map((row) => mapOffer(row, photosByOffer.get(row.id) ?? []));
}

export function createD1OfferStore(db: D1Database): OfferStore {
  async function photosFor(offerId: string): Promise<OfferPhotoRecord[]> {
    const rows = await all<PhotoRow>(
      db,
      "SELECT * FROM offer_photos WHERE offer_id = ? ORDER BY sort_order ASC, created_at ASC",
      offerId,
    );
    return rows.map(mapPhoto);
  }

  async function load(id: string): Promise<OfferRecord> {
    const row = await first<OfferRow>(db, "SELECT * FROM offers WHERE id = ?", id);
    if (!row) throw new AppError("NOT_FOUND", "Offer not found.");
    return mapOffer(row, await photosFor(id));
  }

  return {
    async list() {
      return loadMany(db);
    },
    async listPublished() {
      return loadMany(db, "published");
    },
    async get(id) {
      const row = await first<OfferRow>(db, "SELECT * FROM offers WHERE id = ?", id);
      return row ? mapOffer(row, await photosFor(id)) : null;
    },
    async create(input) {
      const id = crypto.randomUUID();
      const now = nowIso();
      await run(
        db,
        `INSERT INTO offers (id, status, title, description, price_from, terms, created_at, updated_at)
         VALUES (?, 'draft', ?, ?, ?, ?, ?, ?)`,
        id,
        input.title,
        input.description,
        input.priceFrom ?? null,
        input.terms ?? null,
        now,
        now,
      );
      return load(id);
    },
    async update(id, input) {
      const now = nowIso();
      const result = await run(
        db,
        `UPDATE offers SET title = ?, description = ?, price_from = ?, terms = ?, updated_at = ? WHERE id = ?`,
        input.title,
        input.description,
        input.priceFrom ?? null,
        input.terms ?? null,
        now,
        id,
      );
      if (result.meta.changes === 0) throw new AppError("NOT_FOUND", "Offer not found.");
      return load(id);
    },
    async setStatus(id, status) {
      const current = await load(id);
      if (status === "published" && !isOfferReady(current)) {
        throw new AppError(
          "VALIDATION_FAILED",
          "Publish requires a title, description, and a main photo.",
        );
      }
      await run(
        db,
        "UPDATE offers SET status = ?, updated_at = ? WHERE id = ?",
        status,
        nowIso(),
        id,
      );
      return load(id);
    },
    async delete(id) {
      const current = await load(id);
      await run(db, "DELETE FROM offer_photos WHERE offer_id = ?", id);
      await run(db, "DELETE FROM offers WHERE id = ?", id);
      return current;
    },
    async addPhoto(offerId, photo) {
      const existing = await load(offerId);
      const id = photo.id ?? crypto.randomUUID();
      const isMain = photo.isMain || existing.photos.length === 0;
      if (isMain) {
        await run(db, "UPDATE offer_photos SET is_main = 0 WHERE offer_id = ?", offerId);
      }
      await run(
        db,
        `INSERT INTO offer_photos (
           id, offer_id, object_key, thumb_object_key, content_type, content_hash,
           is_main, sort_order, width, height, byte_size, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        offerId,
        photo.objectKey,
        photo.thumbObjectKey || photo.objectKey,
        photo.contentType,
        photo.contentHash,
        isMain ? 1 : 0,
        existing.photos.length,
        photo.width ?? null,
        photo.height ?? null,
        photo.byteSize ?? null,
        nowIso(),
      );
      await run(db, "UPDATE offers SET updated_at = ? WHERE id = ?", nowIso(), offerId);
      return load(offerId);
    },
    async removePhoto(offerId, photoId) {
      const offer = await load(offerId);
      const photo = offer.photos.find((item) => item.id === photoId);
      if (!photo) throw new AppError("NOT_FOUND", "Photo not found.");
      await run(db, "DELETE FROM offer_photos WHERE id = ? AND offer_id = ?", photoId, offerId);
      if (photo.isMain) {
        const remaining = offer.photos.filter((item) => item.id !== photoId);
        if (remaining[0]) {
          await run(db, "UPDATE offer_photos SET is_main = 1 WHERE id = ?", remaining[0].id);
        }
      }
      await run(db, "UPDATE offers SET updated_at = ? WHERE id = ?", nowIso(), offerId);
      return { offer: await load(offerId), objectKeys: offerPhotoObjectKeys(photo) };
    },
    async setMainPhoto(offerId, photoId) {
      const offer = await load(offerId);
      if (!offer.photos.some((item) => item.id === photoId)) {
        throw new AppError("NOT_FOUND", "Photo not found.");
      }
      const now = nowIso();
      await db.batch([
        db.prepare("UPDATE offer_photos SET is_main = 0 WHERE offer_id = ?").bind(offerId),
        db
          .prepare("UPDATE offer_photos SET is_main = 1 WHERE id = ? AND offer_id = ?")
          .bind(photoId, offerId),
        db.prepare("UPDATE offers SET updated_at = ? WHERE id = ?").bind(now, offerId),
      ]);
      return {
        ...offer,
        updatedAt: now,
        photos: offer.photos.map((item) => ({ ...item, isMain: item.id === photoId })),
      };
    },
    async recordAudit(input) {
      await run(
        db,
        `INSERT INTO offer_audit_events (id, offer_id, event_type, actor_id, from_value, to_value, request_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        input.offerId,
        input.eventType,
        input.actorId,
        input.fromValue ?? null,
        input.toValue ?? null,
        input.requestId,
        nowIso(),
      );
    },
  };
}
