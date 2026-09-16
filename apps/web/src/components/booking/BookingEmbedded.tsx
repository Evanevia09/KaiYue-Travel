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
      <div className="booking-card__header">
        <span className="booking-card__icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="3"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <h2 id="embedded-booking-title">Book Your Journey</h2>
          <p>Fast. Easy. Reliable.</p>
        </div>
      </div>
      <div className="booking-card__body">
        <BookingForm />
        <ul className="booking-trust">
          <li>
            <span aria-hidden="true">✓</span> Safe &amp; Professional
          </li>
          <li>
            <span aria-hidden="true">◷</span> Reliable &amp; On Time
          </li>
          <li>
            <span aria-hidden="true">⌖</span> Local Experts
          </li>
          <li>
            <span aria-hidden="true">♡</span> Your Journey Our Priority
          </li>
        </ul>
      </div>
    </section>
  );
}
