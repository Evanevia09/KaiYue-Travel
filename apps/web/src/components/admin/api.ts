export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
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
  vehiclePreference: string | null;
  contactName: string;
  phone: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  notificationState: string;
  createdAt: string;
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
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Macau",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
