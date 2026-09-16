import { useEffect } from "react";
import { BookingForm } from "./BookingForm.tsx";
import { openBooking } from "./store.ts";

type Props = {
  sourcePage: string;
};

export function BookingEmbedded({ sourcePage }: Props) {
  useEffect(() => {
    openBooking({
      mode: "embedded",
      sourcePage,
      sourceTrigger: "hero-embed",
    });
  }, [sourcePage]);

  return (
    <section className="booking-card" aria-labelledby="embedded-booking-title">
      <h2 id="embedded-booking-title">Request a chauffeur</h2>
      <p className="muted">
        Same form as mobile. Submission creates a request, not a confirmed trip.
      </p>
      <BookingForm />
    </section>
  );
}
