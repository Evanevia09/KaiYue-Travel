import { AppError } from "@kaiyue/contracts";
import type { AdminIdentity } from "../auth.ts";
import type { AppEnv } from "../env.ts";
import { json, readJson } from "../http.ts";
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

async function readUpload(request: Request): Promise<{ bytes: Uint8Array; type: string }> {
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
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    type: file.type || "application/octet-stream",
  };
}

function photoResponse(body: Uint8Array, contentType: string): Response {
  const copy = new Uint8Array(body);
  return new Response(copy, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
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
  const photo = match(pathname, "/api/v1/offers/:id/photos/:photoId");
  if (photo) {
    if (request.method !== "GET") methodNotAllowed();
    const object = await readOfferPhoto(env, photo.id!, photo.photoId!, { publicOnly: true });
    return photoResponse(object.body, object.contentType);
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
  const photo = match(pathname, `${base}/:id/photos/:photoId`);
  if (photo) {
    if (request.method === "GET") {
      const object = await readOfferPhoto(env, photo.id!, photo.photoId!);
      return photoResponse(object.body, object.contentType);
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
