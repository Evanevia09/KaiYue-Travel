import { AppError, OFFER_IMAGE_CACHE_SECONDS } from "@kaiyue/contracts";
import type { AdminIdentity } from "../auth.ts";
import type { AppEnv } from "../env.ts";
import { json, readJson } from "../http.ts";
import { parseOfferImageDimension } from "./images.ts";
import {
  addOfferPhoto,
  createOffer,
  deleteOffer,
  deleteOfferPhoto,
  getAdminOffer,
  getPublicOffer,
  listAdminOffers,
  listPublicOffers,
  publishOffer,
  readOfferPhoto,
  setMainOfferPhoto,
  unpublishOffer,
  updateOffer,
} from "./service.ts";
import { offerPhotoVersion } from "./store.ts";

function match(pathname: string, pattern: string): Record<string, string> | null {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);
  if (pathParts.length !== patternParts.length) return null;
  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    const value = pathParts[index];
    if (!value) return null;
    if (part.startsWith(":")) {
      params[part.slice(1)] = decodeURIComponent(value);
      continue;
    }
    if (part !== value) return null;
  }
  return params;
}

function methodNotAllowed(): never {
  throw new AppError("VALIDATION_FAILED", "Method not allowed.", { status: 405 });
}

async function readUpload(request: Request): Promise<{
  bytes: Uint8Array;
  type: string;
  thumbnail?: { bytes: Uint8Array; type: string };
  width: number | null;
  height: number | null;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    throw new AppError("VALIDATION_FAILED", "Send the photo as multipart form data.", {
      fields: { photo: "Send the photo as multipart form data." },
    });
  }
  const form = await request.formData();
  const file = form.get("photo") ?? form.get("file");
  if (!(file instanceof File)) {
    throw new AppError("VALIDATION_FAILED", "Choose a JPEG, PNG, or WebP image.", {
      fields: { photo: "Choose a JPEG, PNG, or WebP image." },
    });
  }
  const thumb = form.get("thumbnail");
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    type: file.type || "application/octet-stream",
    thumbnail:
      thumb instanceof File
        ? { bytes: new Uint8Array(await thumb.arrayBuffer()), type: thumb.type || file.type }
        : undefined,
    width: parseOfferImageDimension(form.get("width")),
    height: parseOfferImageDimension(form.get("height")),
  };
}

function photoResponse(
  body: Uint8Array,
  contentType: string,
  options: { immutable: boolean; publicPhoto?: boolean; version?: string } = { immutable: false },
): Response {
  const copy = new Uint8Array(body);
  const cacheControl = options.immutable
    ? options.publicPhoto
      ? `public, max-age=${OFFER_IMAGE_CACHE_SECONDS}, immutable`
      : `private, max-age=${OFFER_IMAGE_CACHE_SECONDS}, immutable`
    : "private, no-store";
  const headers = new Headers({
    "content-type": contentType,
    "cache-control": cacheControl,
    "x-content-type-options": "nosniff",
  });
  if (options.immutable && options.publicPhoto) {
    headers.set("cdn-cache-control", `public, max-age=${OFFER_IMAGE_CACHE_SECONDS}, immutable`);
    headers.set(
      "cloudflare-cdn-cache-control",
      `public, max-age=${OFFER_IMAGE_CACHE_SECONDS}, immutable`,
    );
  } else {
    headers.set("cdn-cache-control", "no-store");
    headers.set("cloudflare-cdn-cache-control", "no-store");
  }
  if (options.version) {
    headers.set("etag", `"${options.version}"`);
  }
  return new Response(copy, { status: 200, headers });
}

async function serveOfferPhoto(
  env: AppEnv,
  offerId: string,
  photoId: string,
  options: { publicOnly?: boolean; variant?: "full" | "thumb"; version?: string } = {},
): Promise<Response> {
  const object = await readOfferPhoto(env, offerId, photoId, options);
  const version = offerPhotoVersion(object.photo);
  return photoResponse(object.body, object.contentType, {
    immutable: Boolean(options.version),
    publicPhoto: options.publicOnly,
    version,
  });
}

export async function handlePublicOfferRoutes(
  request: Request,
  env: AppEnv,
  requestId: string,
  pathname: string,
): Promise<Response | null> {
  if (request.method === "GET" && pathname === "/api/v1/offers") {
    return json(await listPublicOffers(env), 200, requestId);
  }
  const detail = match(pathname, "/api/v1/offers/:id");
  if (detail) {
    if (request.method !== "GET") methodNotAllowed();
    return json(await getPublicOffer(env, detail.id!), 200, requestId);
  }
  const thumbVersioned = match(pathname, "/api/v1/offers/:id/photos/:photoId/thumb/:hash");
  if (thumbVersioned) {
    if (request.method !== "GET") methodNotAllowed();
    return serveOfferPhoto(env, thumbVersioned.id!, thumbVersioned.photoId!, {
      publicOnly: true,
      variant: "thumb",
      version: thumbVersioned.hash,
    });
  }
  const versioned = match(pathname, "/api/v1/offers/:id/photos/:photoId/:hash");
  if (versioned) {
    if (request.method !== "GET") methodNotAllowed();
    return serveOfferPhoto(env, versioned.id!, versioned.photoId!, {
      publicOnly: true,
      version: versioned.hash,
    });
  }
  const photo = match(pathname, "/api/v1/offers/:id/photos/:photoId");
  if (photo) {
    if (request.method !== "GET") methodNotAllowed();
    return serveOfferPhoto(env, photo.id!, photo.photoId!, { publicOnly: true });
  }
  return null;
}

export async function handleAdminOfferRoutes(
  request: Request,
  env: AppEnv,
  requestId: string,
  pathname: string,
  actor: AdminIdentity,
): Promise<Response | null> {
  const base = pathname.startsWith("/api/v1/admin/offers")
    ? "/api/v1/admin/offers"
    : pathname.startsWith("/api/admin/offers")
      ? "/api/admin/offers"
      : null;
  if (!base) return null;

  if (pathname === base) {
    if (request.method === "GET") return json(await listAdminOffers(env), 200, requestId);
    if (request.method === "POST") {
      return json(
        await createOffer(env, await readJson(request), actor.id, requestId),
        201,
        requestId,
      );
    }
    methodNotAllowed();
  }

  const publish = match(pathname, `${base}/:id/publish`);
  if (publish) {
    if (request.method !== "POST") methodNotAllowed();
    return json(await publishOffer(env, publish.id!, actor.id, requestId), 200, requestId);
  }
  const unpublish = match(pathname, `${base}/:id/unpublish`);
  if (unpublish) {
    if (request.method !== "POST") methodNotAllowed();
    return json(await unpublishOffer(env, unpublish.id!, actor.id, requestId), 200, requestId);
  }
  const mainPhoto = match(pathname, `${base}/:id/photos/:photoId/main`);
  if (mainPhoto) {
    if (request.method !== "POST" && request.method !== "PATCH") methodNotAllowed();
    return json(
      await setMainOfferPhoto(env, mainPhoto.id!, mainPhoto.photoId!, actor.id, requestId),
      200,
      requestId,
    );
  }
  const thumbVersioned = match(pathname, `${base}/:id/photos/:photoId/thumb/:hash`);
  if (thumbVersioned) {
    if (request.method !== "GET") methodNotAllowed();
    return serveOfferPhoto(env, thumbVersioned.id!, thumbVersioned.photoId!, {
      variant: "thumb",
      version: thumbVersioned.hash,
    });
  }
  const versioned = match(pathname, `${base}/:id/photos/:photoId/:hash`);
  if (versioned) {
    if (request.method !== "GET") methodNotAllowed();
    return serveOfferPhoto(env, versioned.id!, versioned.photoId!, { version: versioned.hash });
  }
  const photo = match(pathname, `${base}/:id/photos/:photoId`);
  if (photo) {
    if (request.method === "GET") {
      return serveOfferPhoto(env, photo.id!, photo.photoId!);
    }
    if (request.method === "DELETE") {
      return json(
        await deleteOfferPhoto(env, photo.id!, photo.photoId!, actor.id, requestId),
        200,
        requestId,
      );
    }
    methodNotAllowed();
  }
  const photos = match(pathname, `${base}/:id/photos`);
  if (photos) {
    if (request.method !== "POST") methodNotAllowed();
    return json(
      await addOfferPhoto(env, photos.id!, await readUpload(request), actor.id, requestId),
      201,
      requestId,
    );
  }
  const detail = match(pathname, `${base}/:id`);
  if (detail) {
    if (request.method === "GET") return json(await getAdminOffer(env, detail.id!), 200, requestId);
    if (request.method === "PATCH") {
      return json(
        await updateOffer(env, detail.id!, await readJson(request), actor.id, requestId),
        200,
        requestId,
      );
    }
    if (request.method === "DELETE") {
      return json(await deleteOffer(env, detail.id!, actor.id, requestId), 200, requestId);
    }
    methodNotAllowed();
  }
  return null;
}
