export type TourPackageOption = {
  id: string;
  title: string;
  durationHours: number | null;
};

type TourWindow = Window & { __KY_TOUR_PACKAGES?: TourPackageOption[] };

export function readTourPackages(): TourPackageOption[] {
  if (typeof window === "undefined") return [];
  const value = (window as TourWindow).__KY_TOUR_PACKAGES;
  return Array.isArray(value) ? value : [];
}
