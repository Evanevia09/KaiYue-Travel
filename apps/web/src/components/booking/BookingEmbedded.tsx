import { Component, type ReactNode } from "react";
import { BookingForm } from "./BookingForm.tsx";

type Props = {
  sourcePage: string;
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
          The booking form could not load. Use the{" "}
          <a href="/booking">booking page</a> instead.
        </p>
      );
    }
    return this.props.children;
  }
}

export function BookingEmbedded({ sourcePage }: Props) {
  return (
    <section className="booking-card booking-card--hero" aria-labelledby="embedded-booking-title">
      <h2 id="embedded-booking-title" className="sr-only">
        Request a private chauffeur
      </h2>
      <div className="booking-card__body">
        <BookingErrorBoundary>
          <BookingForm compact sourcePage={sourcePage} sourceTrigger="hero-embed" />
        </BookingErrorBoundary>
      </div>
    </section>
  );
}
