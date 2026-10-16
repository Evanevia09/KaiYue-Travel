export type StoredObject = {
  body: Uint8Array;
  contentType: string;
};

export type ObjectStore = {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
};

export type OfferR2Object = {
  arrayBuffer(): Promise<ArrayBuffer>;
  httpMetadata?: { contentType?: string };
};

export type OfferR2Bucket = {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType: string } },
  ): Promise<unknown>;
  get(key: string): Promise<OfferR2Object | null>;
  delete(keys: string | string[]): Promise<void>;
};

export function createMemoryObjectStore(): ObjectStore {
  const objects = new Map<string, StoredObject>();
  return {
    async put(key, bytes, contentType) {
      objects.set(key, { body: bytes, contentType });
    },
    async get(key) {
      const value = objects.get(key);
      return value ? { body: value.body, contentType: value.contentType } : null;
    },
    async delete(key) {
      objects.delete(key);
    },
    async deleteMany(keys) {
      for (const key of keys) objects.delete(key);
    },
  };
}

export function createR2ObjectStore(bucket: OfferR2Bucket): ObjectStore {
  return {
    async put(key, bytes, contentType) {
      await bucket.put(key, bytes, { httpMetadata: { contentType } });
    },
    async get(key) {
      const object = await bucket.get(key);
      if (!object) return null;
      return {
        body: new Uint8Array(await object.arrayBuffer()),
        contentType: object.httpMetadata?.contentType || "application/octet-stream",
      };
    },
    async delete(key) {
      await bucket.delete(key);
    },
    async deleteMany(keys) {
      const unique = [...new Set(keys.filter(Boolean))];
      for (const key of unique) {
        await bucket.delete(key);
      }
    },
  };
}
