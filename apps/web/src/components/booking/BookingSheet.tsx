import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { localeFromPath } from "../../lib/i18n.ts";
import { specialOfferUi } from "../../lib/special-offer-copy.ts";
import { BookingForm, BookingProgress } from "./BookingForm.tsx";
import { BookingIcon } from "./BookingIcons.tsx";
import {
  closeBooking,
  discardBooking,
  getBookingState,
  isDirty,
  subscribeBooking,
} from "./store.ts";

export function BookingSheet() {
  const state = useSyncExternalStore(subscribeBooking, getBookingState, getBookingState);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!state.open || state.context.mode === "embedded") {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("h2, button, input, select")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        attemptClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("booking-open");
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("booking-open");
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [state.open, state.context.mode]);

  if (!state.open || state.context.mode === "embedded") {
    return null;
  }

  const specialOffer = state.context.enquiryKind === "special_offer";
  const offerCopy = specialOfferUi(localeFromPath(state.context.sourcePage));
  const dialogTitle = specialOffer
    ? offerCopy.enquiryTitle
    : state.step === 2
      ? "Booking request"
      : "Request a chauffeur";

  function attemptClose() {
    if (isDirty(state.draft) && state.status !== "success") {
      setConfirmClose(true);
      return;
    }
    closeBooking(true);
  }

  return (
    <div className="booking-sheet">
      <div className="booking-sheet__backdrop" />
      <div
        ref={panelRef}
        className="booking-sheet__panel booking-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={
            state.step === 2
              ? "booking-card__header booking-card__header--minimal"
              : "booking-card__header"
          }
        >
          <h2 id={titleId} className={state.step === 2 && !specialOffer ? "sr-only" : undefined}>
            {dialogTitle}
          </h2>
          {state.step === 2 && !confirmClose && !specialOffer ? (
            <BookingProgress step={state.step} />
          ) : null}
          <button
            type="button"
            className="booking-card__close"
            onClick={attemptClose}
            aria-label={specialOffer ? offerCopy.close : "Close booking form"}
          >
            <BookingIcon name="close" size={20} />
          </button>
        </div>
        <div className="booking-card__body">
          {confirmClose ? (
            <div role="alertdialog" aria-label="Discard booking draft">
              <p>Keep editing this request, or discard it?</p>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setConfirmClose(false)}
              >
                Keep editing
              </button>{" "}
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  discardBooking();
                  setConfirmClose(false);
                }}
              >
                Discard
              </button>
            </div>
          ) : (
            <BookingForm
              progressInHeader
              enquiryKind={specialOffer ? "special_offer" : "standard"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
