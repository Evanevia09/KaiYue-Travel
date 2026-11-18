import { BOOKING_STATUSES } from "@kaiyue/contracts";

const ALLOWED_BOOKING_STATUS = new Set<string>(BOOKING_STATUSES);

export function statusFromSearch(search: string): string {
  const value = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get(
    "status",
  );
  if (!value || !ALLOWED_BOOKING_STATUS.has(value)) return "";
  return value;
}

export function bookingsStatusPath(status: string): string {
  const next = statusFromSearch(status ? `status=${status}` : "");
  return next ? `/admin/bookings?status=${encodeURIComponent(next)}` : "/admin/bookings";
}

export function locationPath(pathname: string, search: string): string {
  return `${pathname}${search}`;
}
