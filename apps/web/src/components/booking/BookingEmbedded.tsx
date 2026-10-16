import type { ServiceType } from "@kaiyue/contracts";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import { localeFromPath } from "../../lib/i18n.ts";
import { specialOfferUi } from "../../lib/special-offer-copy.ts";
import { BookingForm } from "./BookingForm.tsx";
import {
  getBookingState,
  openBooking,
  subscribeBooking,
  type BookingEnquiryKind,
} from "./store.ts";

type Props = {
  sourcePage: string;
  /** Preset for the form's ride state (point to point, by the hour, or city tours). */
  serviceType?: ServiceType;
  tourPackageId?: string;
  tourPackageTitle?: string;
  enquiryKind?: BookingEnquiryKind;
};

class BookingErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) {
      return (
        <p className="form-error" role="alert">
          The booking form could not load. Please <a href="/contact">contact us</a> instead.
        </p>
      );
    }
    return this.props.children;
  }
}

export function BookingEmbedded({
  sourcePage,
  serviceType,
  tourPackageId,
  tourPackageTitle,
  enquiryKind = "standard",
}: Props) {
  const state = useSyncExternalStore(subscribeBooking, getBookingState, getBookingState);
  const specialOffer = enquiryKind === "special_offer";
  const copy = specialOfferUi(localeFromPath(sourcePage));

  // The sheet and embedded form share one draft/step. Never mount a second form
  // behind an open sheet, and keep step 2 exclusively in that sheet.
  if (state.open && state.context.mode !== "embedded") {
    return null;
  }

  return (
    <section className="booking-card booking-card--hero" aria-labelledby="embedded-booking-title">
      <h2 id="embedded-booking-title" className="sr-only">
        {specialOffer ? copy.enquiryTitle : "Request a private chauffeur"}
      </h2>
      <div className="booking-card__body">
        {state.step === 2 ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() =>
              openBooking({
                mode: "bottom-sheet",
                sourcePage,
                sourceTrigger: "hero-embed",
                enquiryKind,
                initialServiceType: tourPackageId || specialOffer ? "city_tour" : serviceType,
                initialTourPackageId: tourPackageId,
                initialTourPackageTitle: tourPackageTitle,
              })
            }
          >
            {specialOffer ? copy.continue : "Continue request →"}
          </button>
        ) : (
          <BookingErrorBoundary>
            <BookingForm
              compact
              sourcePage={sourcePage}
              sourceTrigger="hero-embed"
              enquiryKind={enquiryKind}
              initialServiceType={tourPackageId || specialOffer ? "city_tour" : serviceType}
              initialTourPackageId={tourPackageId}
              initialTourPackageTitle={tourPackageTitle}
            />
          </BookingErrorBoundary>
        )}
      </div>
    </section>
  );
}
