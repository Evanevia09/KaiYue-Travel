import {
  AppError,
  OFFER_IMAGE_MAX_BYTES,
  OFFER_IMAGE_MAX_EDGE,
  OFFER_IMAGE_TYPES,
  OFFER_ORIGINAL_MAX_BYTES,
  OFFER_THUMB_MAX_EDGE,
  scaledOfferImageSize,
  type OfferImageType,
} from "@kaiyue/contracts";

export type OptimizedOfferVariant = {
  file: File;
  width: number;
  height: number;
};

export type OptimizedOfferPhoto = {
  display: OptimizedOfferVariant;
  thumbnail: OptimizedOfferVariant;
};

function mimeOf(file: File): OfferImageType | null {
  const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
  return OFFER_IMAGE_TYPES.includes(mime as OfferImageType) ? (mime as OfferImageType) : null;
}

function canvasContext(
  width: number,
  height: number,
): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
} {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    return { canvas, ctx };
  }
  if (typeof document === "undefined") {
    throw new Error("Canvas is unavailable.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  return { canvas, ctx };
}

async function blobFromCanvas(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  quality: number,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed."))),
      type,
      quality,
    );
  });
}

async function encodeVariant(
  source: ImageBitmap,
  maxEdge: number,
  quality: number,
  name: string,
): Promise<OptimizedOfferVariant> {
  const size = scaledOfferImageSize(source.width, source.height, maxEdge);
  const { canvas, ctx } = canvasContext(size.width, size.height);
  ctx.drawImage(source, 0, 0, size.width, size.height);
  let blob: Blob;
  try {
    blob = await blobFromCanvas(canvas, "image/webp", quality);
    if (!blob.type.includes("webp") || blob.size === 0) {
      throw new Error("WebP unavailable.");
    }
  } catch {
    blob = await blobFromCanvas(canvas, "image/jpeg", Math.min(0.88, quality + 0.04));
  }
  const extension = blob.type.includes("webp") ? "webp" : "jpg";
  return {
    file: new File([blob], `${name}.${extension}`, { type: blob.type || "image/jpeg" }),
    width: size.width,
    height: size.height,
  };
}

export async function optimizeOfferPhoto(file: File): Promise<OptimizedOfferPhoto> {
  const mime = mimeOf(file);
  if (!mime) {
    throw new AppError("VALIDATION_FAILED", "Only JPEG, PNG, or WebP files are accepted.", {
      fields: { photo: "Only JPEG, PNG, or WebP files are accepted." },
    });
  }
  if (file.size > OFFER_ORIGINAL_MAX_BYTES) {
    throw new AppError("VALIDATION_FAILED", "Each original photo must be 25 MB or smaller.", {
      fields: { photo: "Each original photo must be 25 MB or smaller." },
    });
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    } as ImageBitmapOptions);
  } catch {
    throw new AppError(
      "VALIDATION_FAILED",
      "Could not resize this photo. Try another JPEG, PNG, or WebP.",
      { fields: { photo: "Could not resize this photo. Try another JPEG, PNG, or WebP." } },
    );
  }
  try {
    const stem = file.name.replace(/\.[^.]+$/, "") || "offer";
    const display = await encodeVariant(bitmap, OFFER_IMAGE_MAX_EDGE, 0.82, stem);
    const thumbnail = await encodeVariant(bitmap, OFFER_THUMB_MAX_EDGE, 0.72, `${stem}-thumb`);
    if (display.file.size > OFFER_IMAGE_MAX_BYTES || thumbnail.file.size > OFFER_IMAGE_MAX_BYTES) {
      throw new AppError(
        "VALIDATION_FAILED",
        "The resized photo is still over 5 MB. Try a simpler image.",
        { fields: { photo: "The resized photo is still over 5 MB. Try a simpler image." } },
      );
    }
    return { display, thumbnail };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "VALIDATION_FAILED",
      "Could not resize this photo. Try another JPEG, PNG, or WebP.",
      { fields: { photo: "Could not resize this photo. Try another JPEG, PNG, or WebP." } },
    );
  } finally {
    bitmap.close();
  }
}
