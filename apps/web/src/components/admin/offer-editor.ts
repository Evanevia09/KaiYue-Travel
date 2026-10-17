/** Copy the live FileList before the input is reset; clearing value empties it. */
export function takeInputFiles(input: { files: FileList | null; value: string }): File[] {
  const files = Array.from(input.files ?? []);
  input.value = "";
  return files;
}

export function filesFromDataTransfer(data: DataTransfer | null): File[] {
  return Array.from(data?.files ?? []);
}

export function offerSaveTarget(editingId: string | null) {
  if (editingId) {
    return { method: "PATCH" as const, path: `/api/admin/offers/${editingId}` };
  }
  return { method: "POST" as const, path: "/api/admin/offers" };
}

/** After any write, the dialog must target the saved offer. Create then stays on that id. */
export function editorAfterWrite<T extends { id: string }>(saved: T): T {
  return saved;
}

export function withMainPhoto<T extends { photos: Array<{ id: string; isMain: boolean }> }>(
  offer: T,
  photoId: string,
): T {
  return {
    ...offer,
    photos: offer.photos.map((photo) => ({ ...photo, isMain: photo.id === photoId })),
  };
}

export function withoutPhoto<T extends { photos: Array<{ id: string; isMain: boolean }> }>(
  offer: T,
  photoId: string,
): T {
  const photos = offer.photos.filter((photo) => photo.id !== photoId);
  if (photos[0] && !photos.some((photo) => photo.isMain)) {
    photos[0] = { ...photos[0], isMain: true };
  }
  return { ...offer, photos };
}

export function withOfferStatus<T extends { status: string }>(offer: T, status: T["status"]): T {
  return { ...offer, status };
}

/** Busy key follows the requested next state, not the optimistic current status. */
export function offerStatusBusyKey(id: string, next: "published" | "draft"): string {
  return next === "published" ? `publish:${id}` : `unpublish:${id}`;
}

/**
 * In-flight publish flips status to published immediately. The button label must still
 * follow the target action, or the UI reads "Unpublishing…" while the offer is going live.
 */
export function offerStatusControl(
  busy: string | null,
  id: string,
  status: "draft" | "published",
): {
  next: "published" | "draft";
  labelKey: "offers.publishing" | "offers.unpublishing" | "offers.publish" | "offers.unpublish";
} {
  if (busy === `publish:${id}`) {
    return { next: "published", labelKey: "offers.publishing" };
  }
  if (busy === `unpublish:${id}`) {
    return { next: "draft", labelKey: "offers.unpublishing" };
  }
  if (status === "published") {
    return { next: "draft", labelKey: "offers.unpublish" };
  }
  return { next: "published", labelKey: "offers.publish" };
}
