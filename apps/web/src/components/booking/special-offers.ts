export type SpecialOfferOption = {
  id: string;
  title: string;
};

type OfferWindow = Window & { __KY_SPECIAL_OFFERS?: SpecialOfferOption[] };

export function readSpecialOffers(): SpecialOfferOption[] {
  if (typeof window === "undefined") return [];
  const value = (window as OfferWindow).__KY_SPECIAL_OFFERS;
  return Array.isArray(value) ? value : [];
}
