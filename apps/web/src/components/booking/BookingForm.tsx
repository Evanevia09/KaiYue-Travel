import {
  bookingCreateSchema,
  HOURLY_DURATION_MAX_HOURS,
  HOURLY_DURATION_MIN_HOURS,
  VEHICLE_PREFERENCES,
  type ServiceType,
} from "@kaiyue/contracts";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { BookingIcon } from "./BookingIcons.tsx";
import { DateTimePicker } from "./DateTimePicker.tsx";
import {
  discardBooking,
  fromLocalDateTimeValue,
  getBookingState,
  isDirty,
  setBookingResult,
  setStep,
  subscribeBooking,
  updateDraft,
  type BookingMode,
} from "./store.ts";

const steps = ["Journey", "Details", "Contact"] as const;
const TRANSFER_TYPE: ServiceType = "airport_transfer";
const HOURLY_TYPE: ServiceType = "hourly_charter";

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
    destination: current.draft.destination,
    pickupAt: fromLocalDateTimeValue(current.draft.pickupAt),
    returnAt: fromLocalDateTimeValue(current.draft.returnAt),
    passengerCount: current.draft.passengerCount,
    durationHours:
      current.draft.serviceType === HOURLY_TYPE ? current.draft.durationHours : undefined,
    luggageCount: current.draft.luggageCount ? Number(current.draft.luggageCount) : undefined,
    vehiclePreference: current.draft.vehiclePreference || undefined,
    contactName: current.draft.contactName,
    phone: current.draft.phone,
    email: current.draft.email,
    company: current.draft.company,
    notes: current.draft.notes,
    locale: current.draft.locale,
    sourcePage: entry?.sourcePage ?? current.context.sourcePage,
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
      error?: { message?: string; fields?: Record<string, string>; requestId?: string };
    };
    if (response.ok && body.reference && body.receivedAt && body.nextStep) {
      discardBooking();
      setBookingResult({
        status: "success",
        open: current.context.mode !== "page",
        result: {
          reference: body.reference,
          receivedAt: body.receivedAt,
          nextStep: body.nextStep,
        },
      });
      return;
    }
    setBookingResult({
      status: "error.recoverable",
      fieldErrors: body.error?.fields ?? {},
      formError: body.error?.message ?? "We could not send this request.",
      requestId: body.error?.requestId,
    });
  } catch {
    setBookingResult({
      status: "error.unknown_outcome",
      formError:
        "The request may have reached us already. Please wait and retry with the same form rather than creating a second booking.",
    });
  }
}

type Props = {
  compact?: boolean;
  sourcePage?: string;
  sourceTrigger?: string;
  initialServiceType?: ServiceType;
};

export function BookingForm({
  compact = false,
  sourcePage,
  sourceTrigger,
  initialServiceType,
}: Props) {
  const state = useSyncExternalStore(subscribeBooking, getBookingState, getBookingState);
  const { draft, fieldErrors, step } = state;
  const hourly = draft.serviceType === HOURLY_TYPE;
  const entry = compact ? { sourcePage, sourceTrigger, mode: "embedded" as const } : undefined;

  // A page that embeds the widget (for example /services/local-chauffeur) can
  // preset the ride state, so "By the hour" pages open on the hourly layout and
  // "Point to point" pages open on the transfer layout. Applied once, and never
  // over a journey the visitor has already started typing.
  const appliedInitialServiceType = useRef(false);
  useEffect(() => {
    if (appliedInitialServiceType.current) {
      return;
    }
    appliedInitialServiceType.current = true;
    if (!initialServiceType) {
      return;
    }
    const current = getBookingState();
    if (current.draft.serviceType === initialServiceType || isDirty(current.draft)) {
      return;
    }
    updateDraft({ serviceType: initialServiceType });
  }, [initialServiceType]);

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

  function setRideMode(nextHourly: boolean) {
    if (nextHourly) {
      updateDraft({ serviceType: HOURLY_TYPE, destination: "", returnAt: "" });
      return;
    }
    if (hourly) {
      updateDraft({ serviceType: TRANSFER_TYPE });
    }
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
        if (step < 3) {
          setStep((step + 1) as 1 | 2 | 3);
          return;
        }
        void submitBooking(entry);
      }}
    >
      {step === 1 ? (
        <div className="ride-toggle" role="group" aria-label="Ride type">
          <button type="button" aria-pressed={!hourly} onClick={() => setRideMode(false)}>
            <BookingIcon name="car" size={16} /> Point to point
          </button>
          <button type="button" aria-pressed={hourly} onClick={() => setRideMode(true)}>
            <BookingIcon name="clock" size={16} /> By the Hour
          </button>
        </div>
      ) : (
        <ol className="booking-steps">
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
          key={hourly ? "hourly" : "point-to-point"}
          className={hourly ? "booking-bar booking-bar--hourly" : "booking-bar"}
        >
          <div className="booking-bar__cell">
            <span className="booking-bar__icon">
              <BookingIcon name="pin" />
            </span>
            <div className="booking-bar__fields">
              <label htmlFor="pickupLocation">{hourly ? "Location" : "From"}</label>
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
          {hourly ? null : (
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
              allowReturn={!hourly}
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
        <div className="booking-fields">
          <div className="field">
            <label htmlFor="luggageCount">Luggage (optional)</label>
            <input
              id="luggageCount"
              type="number"
              min={0}
              max={20}
              value={draft.luggageCount}
              onChange={(event) => updateDraft({ luggageCount: event.target.value })}
            />
          </div>
          <div className="field field--full">
            <label htmlFor="vehiclePreference">Vehicle preference</label>
            <select
              id="vehiclePreference"
              value={draft.vehiclePreference}
              onChange={(event) =>
                updateDraft({
                  vehiclePreference: event.target.value as
                    (typeof VEHICLE_PREFERENCES)[number] | "",
                })
              }
            >
              <option value="">No preference</option>
              {VEHICLE_PREFERENCES.filter((value) => value !== "no_preference").map((value) => (
                <option key={value} value={value}>
                  {value.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--full">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="booking-fields">
          <div className="field">
            <label htmlFor="contactName">Name</label>
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
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={draft.phone}
              onChange={(event) => updateDraft({ phone: event.target.value })}
              autoComplete="tel"
            />
            {fieldErrors.phone ? <p className="field-error">{fieldErrors.phone}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="email">Email (optional)</label>
            <input
              id="email"
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="company">Company (optional)</label>
            <input
              id="company"
              value={draft.company}
              onChange={(event) => updateDraft({ company: event.target.value })}
            />
          </div>
          <label className="field field--full field--check">
            <input
              type="checkbox"
              checked={draft.privacyAccepted}
              onChange={(event) => updateDraft({ privacyAccepted: event.target.checked })}
            />
            <span>
              I understand this is a request, not a confirmed booking, and agree to be contacted
              about it.
            </span>
            {fieldErrors.privacyAccepted ? (
              <p className="field-error">{fieldErrors.privacyAccepted}</p>
            ) : null}
          </label>
          <div className="hp" aria-hidden="true">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
        </div>
      ) : null}

      {step > 1 ? (
        <div className="booking-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setStep((step - 1) as 1 | 2 | 3)}
          >
            Back
          </button>
          <button
            type="submit"
            className="btn btn--primary btn--block"
            disabled={state.status === "open.submitting"}
          >
            {state.status === "open.submitting"
              ? "Sending request…"
              : step < 3
                ? "Continue →"
                : "Send request →"}
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
