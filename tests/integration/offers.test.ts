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
      item: { photos: Array<{ objectKey: string }> };
    };
    const objectKey = uploadedBody.item.photos[0]!.objectKey;

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
    const items = ((await publicList.json()) as { items: Array<{ id: string }> }).items;
    expect(items[0]?.id).toBe(id);

    const deleted = await admin(`/api/admin/offers/${id}`, { method: "DELETE" }, testEnv);
    expect(deleted.status).toBe(200);
    expect(await objects.get(objectKey)).toBeNull();
  });
});
