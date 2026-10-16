import {
  bookingCreateSchema,
  destinationRequired,
  HOURLY_DURATION_MAX_HOURS,
  HOURLY_DURATION_MIN_HOURS,
  type ServiceType,
} from "@kaiyue/contracts";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { localeFromPath, publicSourcePage } from "../../lib/i18n.ts";
import { specialOfferUi } from "../../lib/special-offer-copy.ts";
import { BookingIcon } from "./BookingIcons.tsx";
import { DateTimePicker } from "./DateTimePicker.tsx";
import { readSpecialOffers } from "./special-offers.ts";
import {
  discardBooking,
  fromLocalDateTimeValue,
  getBookingState,
  isDirty,
  openBooking,
  patchBookingContext,
  setBookingResult,
  setStep,
  subscribeBooking,
  updateDraft,
  type BookingEnquiryKind,
  type BookingMode,
} from "./store.ts";
import { readTourPackages } from "./tour-packages.ts";

const steps = ["Journey", "Communication"] as const;
const luggageOptions = Array.from({ length: 11 }, (_, count) => count);

function luggageValue(value: string): number {
  const count = Number(value || "0");
  return Number.isInteger(count) && count >= 0 && count <= 10 ? count : 0;
}

export function BookingProgress({ step }: { step: number }) {
  return (
    <ol className="booking-steps" aria-label="Booking progress">
      {steps.map((label, index) => (
        <li
          key={label}
          className={step > index + 1 ? "is-done" : undefined}
          aria-current={step === index + 1 ? "step" : undefined}
        >
          <span className="booking-steps__num">{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
const TRANSFER_TYPE: ServiceType = "airport_transfer";
const HOURLY_TYPE: ServiceType = "hourly_charter";
const CITY_TYPE: ServiceType = "city_tour";

async function submitBooking(entry?: {
  sourcePage?: string;
  sourceTrigger?: string;
  mode?: BookingMode;
}): Promise<void> {
  const current = getBookingState();
  setBookingResult({ status: "open.validating", fieldErrors: {}, formError: undefined });

  const payload = {
    serviceType: current.draft.serviceType,
    pickupLocation: current.draft.pickupLocation,
    destination: destinationRequired(current.draft.serviceType) ? current.draft.destination : "",
    pickupAt: fromLocalDateTimeValue(current.draft.pickupAt),
    returnAt:
      current.draft.serviceType === CITY_TYPE
        ? undefined
        : fromLocalDateTimeValue(current.draft.returnAt),
    passengerCount: current.draft.passengerCount,
    luggageCount: luggageValue(current.draft.luggageCount),
    handCarryCount: luggageValue(current.draft.handCarryCount),
    durationHours:
      current.draft.serviceType === HOURLY_TYPE ? current.draft.durationHours : undefined,
    tourPackageId:
      current.draft.serviceType === CITY_TYPE ? current.draft.tourPackageId : undefined,
    tourPackageTitle:
      current.draft.serviceType === CITY_TYPE
        ? current.context.enquiryKind === "special_offer"
          ? (readSpecialOffers().find((item) => item.id === current.draft.tourPackageId)?.title ??
            current.draft.tourPackageTitle)
          : (readTourPackages().find((item) => item.id === current.draft.tourPackageId)?.title ??
            current.draft.tourPackageTitle)
        : undefined,
    tourDurationHours:
      current.draft.serviceType === CITY_TYPE && current.context.enquiryKind !== "special_offer"
        ? (readTourPackages().find((item) => item.id === current.draft.tourPackageId)
            ?.durationHours ?? undefined)
        : undefined,
    offerId:
      current.context.enquiryKind === "special_offer" ? current.draft.tourPackageId : undefined,
    offerTitle:
      current.context.enquiryKind === "special_offer"
        ? (readSpecialOffers().find((item) => item.id === current.draft.tourPackageId)?.title ??
          current.draft.tourPackageTitle)
        : undefined,
    communicationChannel: current.draft.communicationChannel,
    contactName: current.draft.contactName || undefined,
    phone: current.draft.phone || undefined,
    email: current.draft.email || undefined,
    message: current.draft.message,
    locale: localeFromPath(window.location.pathname),
    sourcePage: publicSourcePage(
      window.location.pathname,
      entry?.sourcePage ?? current.context.sourcePage,
    ),
    sourceTrigger: entry?.sourceTrigger ?? current.context.sourceTrigger,
    sourceMode: entry?.mode ?? current.context.mode,
    privacyAccepted: current.draft.privacyAccepted || undefined,
  };

  const parsed = bookingCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".") || "form"] ??= issue.message;
    }
    setBookingResult({
      status: "error.recoverable",
      fieldErrors,
      formError: "Check the highlighted fields.",
    });
    return;
  }

  setBookingResult({ status: "open.submitting" });
  try {
    const response = await fetch("/api/v1/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": current.idempotencyKey,
      },
      body: JSON.stringify(parsed.data),
    });
    const body = (await response.json()) as {
      reference?: string;
      receivedAt?: string;
      nextStep?: string;
      whatsappUrl?: string;
      error?: { message?: string; fields?: Record<string, string>; requestId?: string };
    };
    if (response.ok && body.reference && body.receivedAt && body.nextStep) {
      if (current.draft.communicationChannel === "whatsapp" && body.whatsappUrl) {
        window.location.assign(body.whatsappUrl);
      }
      const enquiryKind = current.context.enquiryKind;
      discardBooking();
      setBookingResult({
        status: "success",
        open: current.context.mode !== "page",
        context: { ...getBookingState().context, enquiryKind },
        result: {
          reference: body.reference,
          receivedAt: body.receivedAt,
          nextStep: body.nextStep,
          whatsappUrl: body.whatsappUrl,
        },
      });
      return;
    }
    const validation = Boolean(body.error?.fields && Object.keys(body.error.fields).length > 0);
    setBookingResult({
      status: "error.recoverable",
      fieldErrors: body.error?.fields ?? {},
      formError: validation
        ? (body.error?.message ?? "Check the highlighted fields.")
        : "We could not send this request. Contact us on WhatsApp or call +853 2833 8882.",
      requestId: body.error?.requestId,
    });
  } catch {
    setBookingResult({
      status: "error.unknown_outcome",
      formError:
        "The request may have reached us already. Do not submit a second booking. Contact us on WhatsApp or call +853 2833 8882 to confirm.",
    });
  }
}

type Props = {
  compact?: boolean;
  progressInHeader?: boolean;
  sourcePage?: string;
  sourceTrigger?: string;
  initialServiceType?: ServiceType;
  initialTourPackageId?: string;
  initialTourPackageTitle?: string;
  enquiryKind?: BookingEnquiryKind;
};

export function BookingForm({
  compact = false,
  progressInHeader = false,
  sourcePage,
  sourceTrigger,
  initialServiceType,
  initialTourPackageId,
  initialTourPackageTitle,
  enquiryKind = "standard",
}: Props) {
  const state = useSyncExternalStore(subscribeBooking, getBookingState, getBookingState);
  const { draft, fieldErrors, step } = state;
  const specialOffer =
    enquiryKind === "special_offer" || state.context.enquiryKind === "special_offer";
  const hourly = !specialOffer && draft.serviceType === HOURLY_TYPE;
  const cityTour = specialOffer || draft.serviceType === CITY_TYPE;
  const locale = localeFromPath(
    typeof window === "undefined" ? (sourcePage ?? "/") : window.location.pathname,
  );
  const offerCopy = specialOfferUi(locale);
  const packages = specialOffer ? readSpecialOffers() : readTourPackages();
  const entry = compact
    ? {
        sourcePage,
        sourceTrigger,
        mode: "embedded" as const,
        enquiryKind: specialOffer ? ("special_offer" as const) : enquiryKind,
      }
    : undefined;

  function advanceFromJourney() {
    const errors: Record<string, string> = {};
    if (draft.pickupLocation.trim().length < 2) errors.pickupLocation = "Enter a pickup location.";
    if (cityTour && !draft.tourPackageId) {
      errors.tourPackageId = specialOffer ? offerCopy.choosePackageError : "Choose a tour package.";
    }
    if (destinationRequired(draft.serviceType) && draft.destination.trim().length < 2) {
      errors.destination = "Enter a destination.";
    }
    if (!fromLocalDateTimeValue(draft.pickupAt)) errors.pickupAt = "Choose a pickup date and time.";
    if (Object.keys(errors).length > 0) {
      setBookingResult({
        status: "error.recoverable",
        fieldErrors: errors,
        formError: "Complete the journey details first.",
      });
      return;
    }
    setStep(2);
    if (compact) {
      openBooking({
        mode: "bottom-sheet",
        sourcePage: publicSourcePage(window.location.pathname, sourcePage),
        sourceTrigger: sourceTrigger ?? "hero-embed",
        enquiryKind: specialOffer ? "special_offer" : "standard",
        initialServiceType: specialOffer ? CITY_TYPE : draft.serviceType,
        initialTourPackageId: draft.tourPackageId || undefined,
        initialTourPackageTitle: draft.tourPackageTitle || undefined,
      });
    }
  }

  // A page that embeds the widget (for example /services/local-chauffeur) can
  // preset the ride state, so "By the hour" pages open on the hourly layout and
  // "Point to point" pages open on the transfer layout. Applied once, and never
  // over a journey the visitor has already started typing.
  const appliedInitialServiceType = useRef(false);
  useEffect(() => {
    if (specialOffer) {
      patchBookingContext({ enquiryKind: "special_offer" });
    }
    if (appliedInitialServiceType.current) {
      return;
    }
    appliedInitialServiceType.current = true;
    const current = getBookingState();
    if (specialOffer || initialTourPackageId) {
      if (current.draft.pickupLocation.trim() && current.context.enquiryKind === "special_offer") {
        return;
      }
      updateDraft({
        serviceType: CITY_TYPE,
        destination: "",
        returnAt: "",
        tourPackageId: initialTourPackageId ?? current.draft.tourPackageId,
        tourPackageTitle: initialTourPackageTitle ?? current.draft.tourPackageTitle,
      });
      return;
    }
    if (!initialServiceType) {
      return;
    }
    if (current.draft.serviceType === initialServiceType || isDirty(current.draft)) {
      return;
    }
    updateDraft({ serviceType: initialServiceType });
  }, [
    enquiryKind,
    initialServiceType,
    initialTourPackageId,
    initialTourPackageTitle,
    specialOffer,
  ]);

  if (state.status === "success" && state.result) {
    return (
      <div className="form" role="status">
        <h3>Request received</h3>
        <p>
          Reference <strong>{state.result.reference}</strong>
        </p>
        <p>{state.result.nextStep}</p>
      </div>
    );
  }

  function setRideMode(mode: "transfer" | "hourly" | "city") {
    if (mode === "hourly") {
      updateDraft({
        serviceType: HOURLY_TYPE,
        destination: "",
        returnAt: "",
        tourPackageId: "",
        tourPackageTitle: "",
      });
      return;
    }
    if (mode === "city") {
      updateDraft({ serviceType: CITY_TYPE, destination: "", returnAt: "" });
      return;
    }
    updateDraft({ serviceType: TRANSFER_TYPE, tourPackageId: "", tourPackageTitle: "" });
  }

  function bumpPassengers(delta: number) {
    updateDraft({
      passengerCount: Math.min(14, Math.max(1, draft.passengerCount + delta)),
    });
  }

  function bumpDuration(delta: number) {
    updateDraft({
      durationHours: Math.min(
        HOURLY_DURATION_MAX_HOURS,
        Math.max(HOURLY_DURATION_MIN_HOURS, draft.durationHours + delta),
      ),
    });
  }

  return (
    <form
      className={compact ? "form form--hero" : "form"}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step === 1) {
          advanceFromJourney();
          return;
        }
        void submitBooking(entry);
      }}
    >
      {step === 1 && !specialOffer ? (
        <div className="ride-toggle" role="group" aria-label="Ride type">
          <button
            type="button"
            aria-pressed={!hourly && !cityTour}
            onClick={() => setRideMode("transfer")}
          >
            <BookingIcon name="car" size={16} /> Point to point
          </button>
          <button type="button" aria-pressed={hourly} onClick={() => setRideMode("hourly")}>
            <BookingIcon name="clock" size={16} /> By the Hour
          </button>
          <button type="button" aria-pressed={cityTour} onClick={() => setRideMode("city")}>
            <BookingIcon name="pin" size={16} /> City tours
          </button>
        </div>
      ) : progressInHeader ? null : specialOffer ? null : (
        <BookingProgress step={step} />
      )}

      {state.formError ? (
        <p className="form-error" role="alert">
          {state.formError}
          {state.requestId ? ` Request ID ${state.requestId}` : null}
        </p>
      ) : null}

      {step === 1 ? (
        <div
          /* Keyed on ride mode so switching Point to point ↔ By the Hour
             remounts the bar and replays the entrance animation. Draft values
             live in the booking store, so nothing entered is lost. */
          key={cityTour ? "city-tour" : hourly ? "hourly" : "point-to-point"}
          className={
            cityTour
              ? "booking-bar booking-bar--city"
              : hourly
                ? "booking-bar booking-bar--hourly"
                : "booking-bar"
          }
        >
          {cityTour ? (
            <div className="booking-bar__cell">
              <span className="booking-bar__icon">
                <BookingIcon name="pin" />
              </span>
              <div className="booking-bar__fields">
                <label htmlFor="tourPackageId">
                  {specialOffer ? offerCopy.packageLabel : "Tour package"}
                </label>
                <select
                  id="tourPackageId"
                  value={draft.tourPackageId}
                  onChange={(event) => {
                    const selected = packages.find((item) => item.id === event.target.value);
                    updateDraft({
                      tourPackageId: selected?.id ?? "",
                      tourPackageTitle: selected?.title ?? "",
                    });
                  }}
                >
                  <option value="">
                    {specialOffer ? offerCopy.choosePackage : "Choose a package"}
                  </option>
                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                {fieldErrors.tourPackageId ? (
                  <p className="field-error">{fieldErrors.tourPackageId}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="booking-bar__cell">
            <span className="booking-bar__icon">
              <BookingIcon name="pin" />
            </span>
            <div className="booking-bar__fields">
              <label htmlFor="pickupLocation">
                {cityTour ? "Pickup" : hourly ? "Location" : "From"}
              </label>
              <input
                id="pickupLocation"
                value={draft.pickupLocation}
                onChange={(event) => updateDraft({ pickupLocation: event.target.value })}
                placeholder="Address, airport, hotel, …"
                autoComplete="street-address"
              />
              {fieldErrors.pickupLocation ? (
                <p className="field-error">{fieldErrors.pickupLocation}</p>
              ) : null}
            </div>
          </div>
          {hourly || cityTour ? null : (
            <div className="booking-bar__cell">
              <span className="booking-bar__icon">
                <BookingIcon name="pin" />
              </span>
              <div className="booking-bar__fields">
                <label htmlFor="destination">To</label>
                <input
                  id="destination"
                  value={draft.destination}
                  onChange={(event) => updateDraft({ destination: event.target.value })}
                  placeholder="Address, airport, hotel, …"
                />
                {fieldErrors.destination ? (
                  <p className="field-error">{fieldErrors.destination}</p>
                ) : null}
              </div>
            </div>
          )}
          <div className="booking-bar__cell booking-bar__cell--datetime">
            <DateTimePicker
              pickupAt={draft.pickupAt}
              returnAt={draft.returnAt}
              pickupError={fieldErrors.pickupAt}
              returnError={fieldErrors.returnAt}
              allowReturn={!hourly && !cityTour}
              onPickupChange={(value) => updateDraft({ pickupAt: value })}
              onReturnChange={(value) => updateDraft({ returnAt: value })}
            />
          </div>
          {hourly ? (
            <div className="booking-bar__cell booking-bar__cell--duration">
              <div className="booking-bar__fields">
                <p className="booking-bar__label" id="durationHours-label">
                  Duration
                </p>
                <div
                  className="passenger-stepper passenger-stepper--duration"
                  role="group"
                  aria-labelledby="durationHours-label"
                >
                  <button
                    type="button"
                    aria-label="Shorter duration"
                    onClick={() => bumpDuration(-1)}
                    disabled={draft.durationHours <= HOURLY_DURATION_MIN_HOURS}
                  >
                    −
                  </button>
                  <span aria-live="polite">
                    {draft.durationHours} {draft.durationHours === 1 ? "Hour" : "Hours"}
                  </span>
                  <button
                    type="button"
                    aria-label="Longer duration"
                    onClick={() => bumpDuration(1)}
                    disabled={draft.durationHours >= HOURLY_DURATION_MAX_HOURS}
                  >
                    +
                  </button>
                </div>
                {fieldErrors.durationHours ? (
                  <p className="field-error">{fieldErrors.durationHours}</p>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="booking-bar__cell booking-bar__cell--passengers">
            <div className="booking-bar__fields">
              <p className="booking-bar__label" id="passengerCount-label">
                Passengers
              </p>
              <div
                className="passenger-stepper"
                role="group"
                aria-labelledby="passengerCount-label"
              >
                <button
                  type="button"
                  aria-label="Fewer passengers"
                  onClick={() => bumpPassengers(-1)}
                  disabled={draft.passengerCount <= 1}
                >
                  −
                </button>
                <span aria-live="polite">{draft.passengerCount}</span>
                <button
                  type="button"
                  aria-label="More passengers"
                  onClick={() => bumpPassengers(1)}
                  disabled={draft.passengerCount >= 14}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="booking-bar__cell booking-bar__cell--action">
            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={state.status === "open.submitting"}
            >
              Get a quote →
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="communication-step">
          <div>
            <h3>Where would you like to send your request?</h3>
          </div>
          <div className="communication-tabs" role="tablist" aria-label="Communication channel">
            <button
              type="button"
              role="tab"
              aria-selected={draft.communicationChannel === "whatsapp"}
              onClick={() => updateDraft({ communicationChannel: "whatsapp" })}
            >
              WhatsApp
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={draft.communicationChannel === "email"}
              onClick={() => updateDraft({ communicationChannel: "email" })}
            >
              Email
            </button>
          </div>
          <div className="communication-panel" role="tabpanel">
            <p className="muted">
              {draft.communicationChannel === "whatsapp"
                ? "Quick reply recommended if you have WhatsApp."
                : "Replies are usually sent within 24 hours."}
            </p>
            {draft.communicationChannel === "whatsapp" ? (
              <div className="field field--full">
                <label htmlFor="phone">Your WhatsApp Number (optional)</label>
                <input
                  id="phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => updateDraft({ phone: event.target.value })}
                  autoComplete="tel"
                  placeholder="Include country code, e.g. +853 6234 5678"
                />
                {fieldErrors.phone ? <p className="field-error">{fieldErrors.phone}</p> : null}
              </div>
            ) : (
              <div className="booking-fields">
                <div className="field">
                  <label htmlFor="contactName">Your Name *</label>
                  <input
                    id="contactName"
                    value={draft.contactName}
                    onChange={(event) => updateDraft({ contactName: event.target.value })}
                    autoComplete="name"
                  />
                  {fieldErrors.contactName ? (
                    <p className="field-error">{fieldErrors.contactName}</p>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="email">Your Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateDraft({ email: event.target.value })}
                    autoComplete="email"
                  />
                  {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
                </div>
                <div className="field field--full">
                  <label htmlFor="phone">Phone (optional)</label>
                  <input
                    id="phone"
                    type="tel"
                    value={draft.phone}
                    onChange={(event) => updateDraft({ phone: event.target.value })}
                    autoComplete="tel"
                  />
                  {fieldErrors.phone ? <p className="field-error">{fieldErrors.phone}</p> : null}
                </div>
              </div>
            )}
            <div className="luggage-fields">
              <div className="field">
                <label htmlFor="bigLuggage">Big luggage</label>
                <select
                  id="bigLuggage"
                  value={draft.luggageCount || "0"}
                  onChange={(event) => updateDraft({ luggageCount: event.target.value })}
                >
                  {luggageOptions.map((count) => (
                    <option key={count} value={String(count)}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="handCarry">Hand carry</label>
                <select
                  id="handCarry"
                  value={draft.handCarryCount || "0"}
                  onChange={(event) => updateDraft({ handCarryCount: event.target.value })}
                >
                  {luggageOptions.map((count) => (
                    <option key={count} value={String(count)}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field field--full">
              <label htmlFor="message">Your Message (optional)</label>
              <textarea
                id="message"
                rows={4}
                value={draft.message}
                onChange={(event) => updateDraft({ message: event.target.value })}
                placeholder="Add flight details, stops, luggage, or anything else we should know."
              />
              {fieldErrors.message ? <p className="field-error">{fieldErrors.message}</p> : null}
            </div>
            <p className="form-consent">
              By sending, you agree that Kai Yue Travel may use these details to respond to this
              request. This is not a confirmed booking.
            </p>
          </div>
          <div className="hp" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
        </div>
      ) : null}

      {step > 1 ? (
        <div className="booking-actions">
          <button type="button" className="btn btn--secondary" onClick={() => setStep(1)}>
            Back
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={state.status === "open.submitting"}
          >
            {state.status === "open.submitting"
              ? "Sending request…"
              : draft.communicationChannel === "whatsapp"
                ? "Continue in WhatsApp →"
                : "Send email request →"}
          </button>
        </div>
      ) : null}
      {state.status === "open.submitting" || state.status === "error.unknown_outcome" ? (
        <p className="muted" aria-live="polite">
          {state.status === "open.submitting" ? "Submitting your request." : null}
          {state.status === "error.unknown_outcome"
            ? "If you retry, the same request will be reused so we do not create a duplicate."
            : null}
        </p>
      ) : null}
    </form>
  );
}
