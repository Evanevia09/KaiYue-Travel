import { formatAdminWhen, localizeAdminError, type AdminLocale } from "../../lib/admin-i18n.ts";

export type AdminFetchInit = RequestInit & { locale?: AdminLocale };

export function adminFetchInit(init?: RequestInit): RequestInit {
  const method = (init?.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";
  return {
    ...init,
    keepalive: init?.keepalive ?? mutating,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  };
}

export async function adminFetch<T>(path: string, init?: AdminFetchInit): Promise<T> {
  const locale = init?.locale ?? "en";
  const { locale: _locale, ...requestInit } = init ?? {};
  const response = await fetch(path, adminFetchInit(requestInit));
  const body = (await response.json()) as T & { error?: { code?: string; message?: string } };
  if (!response.ok) {
    throw new Error(localizeAdminError(body.error, locale));
  }
  return body;
}

export type AdminBooking = {
  reference: string;
  status: string;
  serviceType: string;
  pickupLocation: string;
  destination: string | null;
  pickupAt: string;
  returnAt: string | null;
  passengerCount: number;
  luggageCount: number | null;
  handCarryCount: number | null;
  vehiclePreference: string | null;
  communicationChannel: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  message: string;
  notes: string | null;
  notificationState: string;
  createdAt: string;
  updatedAt: string;
  driverId: string | null;
  vehicleId: string | null;
  offerId: string | null;
  offerTitle: string | null;
};

export type AdminDriver = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  active: boolean;
  updatedAt: string;
};
export type AdminVehicle = {
  id: string;
  plateNumber: string;
  makeModel: string;
  passengerCapacity: number;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  active: boolean;
  updatedAt: string;
};

export type AdminContact = {
  id: string;
  reference: string;
  status: string;
  inquiryType: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  message: string;
  notificationState: string;
  createdAt: string;
};

export function formatWhen(value: string, locale: AdminLocale = "en"): string {
  return formatAdminWhen(value, locale);
}
