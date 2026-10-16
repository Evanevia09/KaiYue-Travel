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

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, adminFetchInit(init));
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "Admin request failed.");
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

export function formatWhen(value: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Macau",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}, ${get("hour")}:${get("minute")}`;
}
