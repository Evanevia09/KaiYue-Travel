import { describe, expect, it } from "vitest";
import { handleApi } from "../../apps/web/src/lib/server/router.ts";
import { createMemoryObjectStore } from "../../apps/web/src/lib/server/offers/objects.ts";
import { createMemoryOfferStore } from "../../apps/web/src/lib/server/offers/store.ts";
import { createTestEnv } from "../helpers/memory-d1.ts";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");

function env() {
  return createTestEnv({
    offerStore: createMemoryOfferStore(),
    objectStore: createMemoryObjectStore(),
  });
}

async function admin(path: string, init?: RequestInit, testEnv = env()) {
  return handleApi(
    new Request(`http://localhost:4321${path}`, {
      ...init,
      headers: {
        origin: "http://localhost:4321",
        ...(init?.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(init?.headers ?? {}),
      },
    }),
    testEnv,
  );
}

describe("special offers API", () => {
  it("applies photo and dashboard indexes", async () => {
    const listed = await createTestEnv()
      .DB.prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all<{ name: string }>();
    const names = listed.results.map((row) => row.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "idx_offers_status_updated",
        "idx_offer_photos_offer",
        "idx_offer_photos_hash",
        "idx_bookings_status_created",
        "idx_bookings_status_updated",
        "idx_bookings_notification_state",
      ]),
    );
  });

  it("rejects unauthenticated admin offer routes in production", async () => {
    const production = createTestEnv({ ENVIRONMENT: "production", DEV_ADMIN_BYPASS: "true" });
    const response = await handleApi(
      new Request("https://kaiyue-travel.scalingsmb.workers.dev/api/admin/offers"),
      production,
    );
    expect(response.status).toBe(403);
  });

  it("hides drafts from the public list and detail endpoints", async () => {
    const testEnv = env();
    const created = await admin(
      "/api/admin/offers",
      {
        method: "POST",
        body: JSON.stringify({ title: "Draft outing", description: "Car and driver." }),
      },
      testEnv,
    );
    expect(created.status).toBe(201);
    const offer = ((await created.json()) as { item: { id: string } }).item;

    const listed = await handleApi(new Request("http://localhost:4321/api/v1/offers"), testEnv);
    expect(listed.status).toBe(200);
    expect(((await listed.json()) as { items: unknown[] }).items).toEqual([]);

    const detail = await handleApi(
      new Request(`http://localhost:4321/api/v1/offers/${offer.id}`),
      testEnv,
    );
    expect(detail.status).toBe(404);
  });

  it("rejects invalid copy, oversize uploads, and a renamed SVG", async () => {
    const testEnv = env();
    const invalid = await admin(
      "/api/admin/offers",
      { method: "POST", body: JSON.stringify({ title: "", description: "Missing title" }) },
      testEnv,
    );
    expect(invalid.status).toBe(422);

    const created = await admin(
      "/api/admin/offers",
      { method: "POST", body: JSON.stringify({ title: "Harbour", description: "Evening drive." }) },
      testEnv,
    );
    const id = ((await created.json()) as { item: { id: string } }).item.id;

    const renamed = new FormData();
    renamed.set("photo", new File([svg], "harbour.jpg", { type: "image/jpeg" }));
    const renamedResponse = await admin(
      `/api/admin/offers/${id}/photos`,
      { method: "POST", body: renamed },
      testEnv,
    );
    expect(renamedResponse.status).toBe(422);

    const huge = new Uint8Array(5 * 1024 * 1024 + 24);
    huge.set(jpeg, 0);
    const oversized = new FormData();
    oversized.set("photo", new File([huge], "big.jpg", { type: "image/jpeg" }));
    const oversizedResponse = await admin(
      `/api/admin/offers/${id}/photos`,
      { method: "POST", body: oversized },
      testEnv,
    );
    expect(oversizedResponse.status).toBe(422);
  });

  it("publishes a complete offer and deletes stored objects", async () => {
    const objects = createMemoryObjectStore();
    const testEnv = createTestEnv({
      offerStore: createMemoryOfferStore(),
      objectStore: objects,
    });
    const created = await admin(
      "/api/admin/offers",
      {
        method: "POST",
        body: JSON.stringify({ title: "Sunset drive", description: "Car and driver." }),
      },
      testEnv,
    );
    const id = ((await created.json()) as { item: { id: string } }).item.id;
    const photo = new FormData();
    photo.set("photo", new File([png], "main.png", { type: "image/png" }));
    const uploaded = await admin(
      `/api/admin/offers/${id}/photos`,
      { method: "POST", body: photo },
      testEnv,
    );
    expect(uploaded.status).toBe(201);
    const uploadedBody = (await uploaded.json()) as {
      item: {
        photos: Array<{
          id: string;
          objectKey: string;
          thumbObjectKey: string;
          contentHash: string;
          url: string;
          thumbUrl: string;
        }>;
      };
    };
    const stored = uploadedBody.item.photos[0]!;
    const objectKey = stored.objectKey;
    expect(stored.contentHash).toMatch(/^[0-9a-f]{20}$/);
    expect(stored.url).toContain(`/${stored.id}/${stored.contentHash}`);
    expect(stored.thumbUrl).toContain(`/thumb/${stored.contentHash}`);
    expect(stored.thumbObjectKey).toBe(objectKey);

    const listedDraft = await admin("/api/admin/offers", undefined, testEnv);
    const draftItem = (
      (await listedDraft.json()) as {
        items: Array<{ id: string; complete: boolean; status: string }>;
      }
    ).items[0];
    expect(draftItem).toMatchObject({ id, status: "draft", complete: true });

    const published = await admin(
      `/api/admin/offers/${id}/publish`,
      { method: "POST", body: "{}" },
      testEnv,
    );
    expect(published.status).toBe(200);

    const patched = await admin(
      `/api/admin/offers/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ title: "Sunset drive", description: "Car and driver." }),
      },
      testEnv,
    );
    expect(patched.status).toBe(200);
    expect(
      ((await patched.json()) as { item: { status: string; complete: boolean } }).item,
    ).toMatchObject({ status: "published", complete: true });

    const publicList = await handleApi(new Request("http://localhost:4321/api/v1/offers"), testEnv);
    expect(publicList.headers.get("cache-control")).toContain("no-store");
    const items = (
      (await publicList.json()) as {
        items: Array<{
          id: string;
          mainPhotoUrl: string;
          mainPhotoThumbUrl: string;
          photos: Array<{ url: string; id: string }>;
        }>;
      }
    ).items;
    expect(items[0]?.id).toBe(id);
    expect(items[0]?.mainPhotoUrl).toContain(stored.contentHash);
    expect(items[0]?.mainPhotoThumbUrl).toContain("/thumb/");

    const served = await handleApi(
      new Request(`http://localhost:4321${items[0]!.mainPhotoUrl}`),
      testEnv,
    );
    expect(served.status).toBe(200);
    expect(served.headers.get("cache-control")).toContain("immutable");
    expect(served.headers.get("cache-control")).toContain("max-age=31536000");
    expect(served.headers.get("etag")).toBe(`"${stored.contentHash}"`);

    const stale = await handleApi(
      new Request(
        `http://localhost:4321/api/v1/offers/${id}/photos/${stored.id}/deadbeefdeadbeefdead`,
      ),
      testEnv,
    );
    expect(stale.status).toBe(404);

    const deleted = await admin(`/api/admin/offers/${id}`, { method: "DELETE" }, testEnv);
    expect(deleted.status).toBe(200);
    expect(await objects.get(objectKey)).toBeNull();
  });

  it("stores a thumbnail variant and serves it from a versioned URL", async () => {
    const objects = createMemoryObjectStore();
    const testEnv = createTestEnv({
      offerStore: createMemoryOfferStore(),
      objectStore: objects,
    });
    const created = await admin(
      "/api/admin/offers",
      {
        method: "POST",
        body: JSON.stringify({ title: "Thumb check", description: "Car and driver." }),
      },
      testEnv,
    );
    const id = ((await created.json()) as { item: { id: string } }).item.id;
    const form = new FormData();
    form.set("photo", new File([png], "main.png", { type: "image/png" }));
    form.set("thumbnail", new File([jpeg], "main-thumb.jpg", { type: "image/jpeg" }));
    form.set("width", "1600");
    form.set("height", "1200");
    const uploaded = await admin(
      `/api/admin/offers/${id}/photos`,
      { method: "POST", body: form },
      testEnv,
    );
    expect(uploaded.status).toBe(201);
    const photo = (
      (await uploaded.json()) as {
        item: {
          photos: Array<{
            objectKey: string;
            thumbObjectKey: string;
            width: number;
            height: number;
            thumbUrl: string;
          }>;
        };
      }
    ).item.photos[0]!;
    expect(photo.thumbObjectKey).not.toBe(photo.objectKey);
    expect(photo.width).toBe(1600);
    expect(photo.height).toBe(1200);
    expect(await objects.get(photo.objectKey)).not.toBeNull();
    expect(await objects.get(photo.thumbObjectKey)).not.toBeNull();

    const published = await admin(
      `/api/admin/offers/${id}/publish`,
      { method: "POST", body: "{}" },
      testEnv,
    );
    expect(published.status).toBe(200);
    const thumb = await handleApi(
      new Request(`http://localhost:4321${photo.thumbUrl.replace("/api/admin/", "/api/v1/")}`),
      testEnv,
    );
    expect(thumb.status).toBe(200);
    expect(thumb.headers.get("content-type")).toBe("image/jpeg");
    expect(thumb.headers.get("cache-control")).toContain("immutable");
  });
});
