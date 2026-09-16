import { bookingCreateSchema, SERVICE_LABELS, VEHICLE_PREFERENCES } from "@kaiyue/contracts";
import { useSyncExternalStore } from "react";
import {
  discardBooking,
  fromLocalDateTimeValue,
  getBookingState,
  setBookingResult,
  setStep,
  subscribeBooking,
  updateDraft,
} from "./store.ts";

const steps = ["Journey", "Details", "Contact"] as const;

async function submitBooking(): Promise<void> {
  const current = getBookingState();
  setBookingResult({ status: "open.validating", fieldErrors: {}, formError: undefined });

  const payload = {
    serviceType: current.draft.serviceType,
    pickupLocation: current.draft.pickupLocation,
    destination: current.draft.destination,
    pickupAt: fromLocalDateTimeValue(current.draft.pickupAt),
    returnAt: fromLocalDateTimeValue(current.draft.returnAt),
    passengerCount: current.draft.passengerCount,
    luggageCount: current.draft.luggageCount ? Number(current.draft.luggageCount) : undefined,
    vehiclePreference: current.draft.vehiclePreference || undefined,
    contactName: current.draft.contactName,
    phone: current.draft.phone,
    email: current.draft.email,
    company: current.draft.company,
    notes: current.draft.notes,
    locale: current.draft.locale,
    sourcePage: current.context.sourcePage,
    sourceTrigger: current.context.sourceTrigger,
    sourceMode: current.context.mode,
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

export function BookingForm() {
  const state = useSyncExternalStore(subscribeBooking, getBookingState, getBookingState);
  const { draft, fieldErrors, step } = state;

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

  return (
    <form
      className="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (step < 3) {
          setStep((step + 1) as 1 | 2 | 3);
          return;
        }
        void submitBooking();
      }}
    >
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

      {state.formError ? (
        <p className="form-error" role="alert">
          {state.formError}
          {state.requestId ? ` Request ID ${state.requestId}` : null}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="booking-fields booking-fields--journey">
          <div className="field">
            <label htmlFor="pickupLocation">Pickup Location</label>
            <input
              id="pickupLocation"
              value={draft.pickupLocation}
              onChange={(event) => updateDraft({ pickupLocation: event.target.value })}
              placeholder="e.g. Macau International Airport"
              autoComplete="street-address"
            />
            {fieldErrors.pickupLocation ? (
              <p className="field-error">{fieldErrors.pickupLocation}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="destination">Destination</label>
            <input
              id="destination"
              value={draft.destination}
              onChange={(event) => updateDraft({ destination: event.target.value })}
              placeholder={
                draft.serviceType === "hourly_charter"
                  ? "Optional for hourly charter"
                  : "e.g. Macau hotel / city / other"
              }
            />
            {fieldErrors.destination ? (
              <p className="field-error">{fieldErrors.destination}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="serviceType">Service Type</label>
            <select
              id="serviceType"
              value={draft.serviceType}
              onChange={(event) =>
                updateDraft({ serviceType: event.target.value as typeof draft.serviceType })
              }
            >
              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pickupAt">Date &amp; Time</label>
            <input
              id="pickupAt"
              type="datetime-local"
              value={draft.pickupAt}
              onChange={(event) => updateDraft({ pickupAt: event.target.value })}
            />
            {fieldErrors.pickupAt ? <p className="field-error">{fieldErrors.pickupAt}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="passengerCount">Passengers</label>
            <input
              id="passengerCount"
              type="number"
              min={1}
              max={14}
              value={draft.passengerCount}
              onChange={(event) => updateDraft({ passengerCount: Number(event.target.value) })}
              placeholder="e.g. 2 passengers"
            />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <>
          <div className="field">
            <label htmlFor="returnAt">Optional return time</label>
            <input
              id="returnAt"
              type="datetime-local"
              value={draft.returnAt}
              onChange={(event) => updateDraft({ returnAt: event.target.value })}
            />
            {fieldErrors.returnAt ? <p className="field-error">{fieldErrors.returnAt}</p> : null}
          </div>
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
          <div className="field">
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
          <div className="field">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={draft.notes}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
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
          <label className="field">
            <span>
              <input
                type="checkbox"
                checked={draft.privacyAccepted}
                onChange={(event) => updateDraft({ privacyAccepted: event.target.checked })}
              />{" "}
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
        </>
      ) : null}

      <div className="booking-actions">
        {step > 1 ? (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setStep((step - 1) as 1 | 2 | 3)}
          >
            Back
          </button>
        ) : null}
        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={state.status === "open.submitting"}
        >
          {state.status === "open.submitting"
            ? "Sending request…"
            : step < 3
              ? "Continue →"
              : "Book Now →"}
        </button>
      </div>
      <p className="muted" aria-live="polite">
        {state.status === "open.submitting" ? "Submitting your request." : null}
        {state.status === "error.unknown_outcome"
          ? "If you retry, the same request will be reused so we do not create a duplicate."
          : null}
      </p>
    </form>
  );
}
