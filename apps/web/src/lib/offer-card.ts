export type PublicOfferCardPhoto = {
  url: string;
  thumbUrl?: string;
  isMain: boolean;
  width?: number | null;
  height?: number | null;
};

export type PublicOfferCardSource = {
  mainPhotoUrl: string | null;
  mainPhotoThumbUrl?: string | null;
  mainPhotoWidth?: number | null;
  mainPhotoHeight?: number | null;
  photos?: PublicOfferCardPhoto[];
};

export type PublicOfferCardImage = {
  src: string;
  srcset?: string;
  width: number;
  height: number;
};

export function publicOfferCardImage(item: PublicOfferCardSource): PublicOfferCardImage | null {
  const main = item.photos?.find((photo) => photo.isMain) ?? item.photos?.[0];
  const src = item.mainPhotoUrl ?? main?.url ?? null;
  if (!src) return null;
  const thumb = item.mainPhotoThumbUrl ?? main?.thumbUrl ?? null;
  return {
    src,
    srcset: thumb && thumb !== src ? `${thumb} 480w, ${src} 1600w` : undefined,
    width: item.mainPhotoWidth ?? main?.width ?? 1600,
    height: item.mainPhotoHeight ?? main?.height ?? 1104,
  };
}
