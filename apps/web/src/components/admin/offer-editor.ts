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
