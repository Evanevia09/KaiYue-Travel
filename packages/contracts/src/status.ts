export const BOOKING_STATUSES = ["enquiry", "assigned", "completed", "cancelled"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const CONTACT_STATUSES = ["new", "replied", "closed"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const NOTIFICATION_STATES = ["pending", "sent", "partial", "failed", "skipped"] as const;
export type NotificationState = (typeof NOTIFICATION_STATES)[number];

export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  enquiry: ["assigned", "cancelled"],
  assigned: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export const CONTACT_TRANSITIONS: Record<ContactStatus, readonly ContactStatus[]> = {
  new: ["replied", "closed"],
  replied: ["closed"],
  closed: [],
};

export function canTransitionBooking(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export function canTransitionContact(from: ContactStatus, to: ContactStatus): boolean {
  return CONTACT_TRANSITIONS[from].includes(to);
}

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransitionBooking(from, to)) {
    throw new Error(`Booking cannot move from ${from} to ${to}.`);
  }
}

export function assertContactTransition(from: ContactStatus, to: ContactStatus): void {
  if (!canTransitionContact(from, to)) {
    throw new Error(`Contact cannot move from ${from} to ${to}.`);
  }
}
