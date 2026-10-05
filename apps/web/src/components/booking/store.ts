import {
  createIdempotencyKey,
  type BookingCreateInput,
  type CommunicationChannel,
  type ServiceType,
} from "@kaiyue/contracts";

export type BookingMode = "embedded" | "bottom-sheet" | "page";

export type BookingUiStatus =
  | "closed"
  | "open.pristine"
  | "open.editing"
  | "open.validating"
  | "open.submitting"
  | "success"
  | "error.recoverable"
  | "error.unknown_outcome";

export type BookingDraft = {
  serviceType: ServiceType;
  pickupLocation: string;
  destination: string;
  pickupAt: string;
  returnAt: string;
  passengerCount: number;
  durationHours: number;
  luggageCount: string;
  handCarryCount: string;
  vehiclePreference: BookingCreateInput["vehiclePreference"] | "";
  communicationChannel: CommunicationChannel;
  contactName: string;
  phone: string;
  email: string;
  company: string;
  notes: string;
  tourPackageId: string;
  tourPackageTitle: string;
  message: string;
  privacyAccepted: boolean;
  locale: string;
};

export type BookingEntryContext = {
  mode: BookingMode;
  sourcePage: string;
  sourceTrigger: string;
  initialServiceType?: ServiceType;
  initialTourPackageId?: string;
  initialTourPackageTitle?: string;
};

export type BookingState = {
  status: BookingUiStatus;
  open: boolean;
  step: 1 | 2;
  draft: BookingDraft;
  context: BookingEntryContext;
  idempotencyKey: string;
  fieldErrors: Record<string, string>;
  formError?: string;
  requestId?: string;
  result?: { reference: string; receivedAt: string; nextStep: string; whatsappUrl?: string };
};

const STORAGE_KEY = "kaiyue.booking.journey";

export const emptyDraft = (serviceType: ServiceType = "airport_transfer"): BookingDraft => ({
  serviceType,
  pickupLocation: "",
  destination: "",
  pickupAt: "",
  returnAt: "",
  passengerCount: 2,
  durationHours: 2,
  luggageCount: "0",
  handCarryCount: "0",
  vehiclePreference: "",
  communicationChannel: "whatsapp",
  contactName: "",
  phone: "",
  email: "",
  company: "",
  notes: "",
  tourPackageId: "",
  tourPackageTitle: "",
  message: "",
  privacyAccepted: false,
  locale: "en",
});

function defaultContext(): BookingEntryContext {
  return { mode: "bottom-sheet", sourcePage: "/", sourceTrigger: "header" };
}

function createState(): BookingState {
  return {
    status: "closed",
    open: false,
    step: 1,
    draft: emptyDraft(),
    context: defaultContext(),
    idempotencyKey: createIdempotencyKey(),
    fieldErrors: {},
  };
}

let state = createState();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getBookingState(): BookingState {
  return state;
}

export function subscribeBooking(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persistJourney(draft: BookingDraft): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      serviceType: draft.serviceType,
      pickupLocation: draft.pickupLocation,
      destination: draft.destination,
      pickupAt: draft.pickupAt,
      returnAt: draft.returnAt,
      passengerCount: draft.passengerCount,
      durationHours: draft.durationHours,
      luggageCount: draft.luggageCount,
      handCarryCount: draft.handCarryCount,
      vehiclePreference: draft.vehiclePreference,
      tourPackageId: draft.tourPackageId,
      tourPackageTitle: draft.tourPackageTitle,
      savedAt: Date.now(),
    }),
  );
}

export function restoreJourney(): Partial<BookingDraft> | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<BookingDraft> & { savedAt?: number };
    if (parsed.savedAt && Date.now() - parsed.savedAt > 1000 * 60 * 60 * 6) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function isDirty(draft: BookingDraft): boolean {
  const empty = emptyDraft(draft.serviceType);
  return (
    draft.pickupLocation !== empty.pickupLocation ||
    draft.destination !== empty.destination ||
    draft.pickupAt !== empty.pickupAt ||
    draft.contactName !== empty.contactName ||
    draft.phone !== empty.phone ||
    draft.message !== empty.message ||
    draft.tourPackageId !== empty.tourPackageId
  );
}

export function updateDraft(patch: Partial<BookingDraft>): void {
  state = {
    ...state,
    draft: { ...state.draft, ...patch },
    status: state.open ? "open.editing" : state.status,
    fieldErrors: {},
    formError: undefined,
  };
  persistJourney(state.draft);
  emit();
}

export function setStep(step: BookingState["step"]): void {
  state = { ...state, step };
  emit();
}

function withoutEmpty<T extends Record<string, unknown>>(value: T | null): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}

export function openBooking(context: BookingEntryContext): void {
  const restored = withoutEmpty(restoreJourney());
  const serviceType = context.initialTourPackageId
    ? "city_tour"
    : (context.initialServiceType ?? restored.serviceType ?? state.draft.serviceType);
  const cityTour = serviceType === "city_tour";
  const hourly = serviceType === "hourly_charter";
  const draft = {
    ...state.draft,
    ...restored,
    serviceType,
    destination: cityTour || hourly ? "" : (restored.destination ?? state.draft.destination),
    returnAt: cityTour || hourly ? "" : (restored.returnAt ?? state.draft.returnAt),
    tourPackageId: cityTour ? (context.initialTourPackageId ?? restored.tourPackageId ?? "") : "",
    tourPackageTitle: cityTour
      ? (context.initialTourPackageTitle ?? restored.tourPackageTitle ?? "")
      : "",
  };
  state = {
    ...state,
    open: true,
    status: isDirty(draft) ? "open.editing" : "open.pristine",
    context,
    draft,
    fieldErrors: {},
    formError: undefined,
  };
  emit();
}

export function closeBooking(force = false): boolean {
  if (!force && isDirty(state.draft) && state.status !== "success") {
    return false;
  }
  state = {
    ...state,
    open: false,
    status: state.status === "success" ? "success" : "closed",
  };
  emit();
  return true;
}

export function discardBooking(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  state = {
    ...createState(),
    idempotencyKey: createIdempotencyKey(),
  };
  emit();
}

export function setBookingResult(patch: Partial<BookingState>): void {
  state = { ...state, ...patch };
  emit();
}

export function toLocalDateTimeValue(iso?: string): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalDateTimeValue(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}
