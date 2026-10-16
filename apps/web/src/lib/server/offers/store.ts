import { AppError, isCompleteOffer, type OfferWriteInput } from "@kaiyue/contracts";
import type { D1Database } from "../env.ts";
import { all, first, nowIso, run } from "../db.ts";

export type OfferPhotoRecord = {
  id: string;
  offerId: string;
  objectKey: string;
  contentType: string;
  isMain: boolean;
  sortOrder: number;
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
    photo: { objectKey: string; contentType: string; isMain: boolean },
  ): Promise<OfferRecord>;
  removePhoto(offerId: string, photoId: string): Promise<{ offer: OfferRecord; objectKey: string }>;
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
  content_type: string;
  is_main: number;
  sort_order: number;
  created_at: string;
};

function mapPhoto(row: PhotoRow): OfferPhotoRecord {
  return {
    id: row.id,
    offerId: row.offer_id,
    objectKey: row.object_key,
    contentType: row.content_type,
    isMain: row.is_main === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
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
    complete: isCompleteOffer(offer),
  };
}

export function toPublicOffer(offer: OfferRecord) {
  const main = offer.photos.find((photo) => photo.isMain) ?? offer.photos[0];
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
      url: `/api/v1/offers/${offer.id}/photos/${photo.id}`,
    })),
    mainPhotoUrl: main ? `/api/v1/offers/${offer.id}/photos/${main.id}` : null,
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
      if (status === "published" && !isCompleteOffer({ ...offer, status: "published" })) {
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
        id: crypto.randomUUID(),
        offerId,
        objectKey: photo.objectKey,
        contentType: photo.contentType,
        isMain: photo.isMain || offer.photos.length === 0,
        sortOrder: offer.photos.length,
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
      return { offer: structuredClone(offer), objectKey: photo.objectKey };
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
      const rows = await all<OfferRow>(db, "SELECT * FROM offers ORDER BY updated_at DESC");
      const records: OfferRecord[] = [];
      for (const row of rows) {
        records.push(mapOffer(row, await photosFor(row.id)));
      }
      return records;
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
      if (status === "published" && !isCompleteOffer({ ...current, status: "published" })) {
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
      await load(offerId);
      const existing = await photosFor(offerId);
      const id = crypto.randomUUID();
      const isMain = photo.isMain || existing.length === 0;
      if (isMain) {
        await run(db, "UPDATE offer_photos SET is_main = 0 WHERE offer_id = ?", offerId);
      }
      await run(
        db,
        `INSERT INTO offer_photos (id, offer_id, object_key, content_type, is_main, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        offerId,
        photo.objectKey,
        photo.contentType,
        isMain ? 1 : 0,
        existing.length,
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
      return { offer: await load(offerId), objectKey: photo.objectKey };
    },
    async setMainPhoto(offerId, photoId) {
      const offer = await load(offerId);
      if (!offer.photos.some((item) => item.id === photoId)) {
        throw new AppError("NOT_FOUND", "Photo not found.");
      }
      await run(db, "UPDATE offer_photos SET is_main = 0 WHERE offer_id = ?", offerId);
      await run(
        db,
        "UPDATE offer_photos SET is_main = 1 WHERE id = ? AND offer_id = ?",
        photoId,
        offerId,
      );
      await run(db, "UPDATE offers SET updated_at = ? WHERE id = ?", nowIso(), offerId);
      return load(offerId);
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
