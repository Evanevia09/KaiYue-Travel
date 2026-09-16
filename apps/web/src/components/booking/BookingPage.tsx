import { useEffect } from "react";
import { BookingForm } from "./BookingForm.tsx";
import { openBooking } from "./store.ts";

export function BookingPage({ sourcePage }: { sourcePage: string }) {
  useEffect(() => {
    openBooking({
      mode: "page",
      sourcePage,
      sourceTrigger: "fallback-page",
    });
  }, [sourcePage]);

  return <BookingForm />;
}
