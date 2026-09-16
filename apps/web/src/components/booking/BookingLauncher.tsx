import type { ServiceType } from "@kaiyue/contracts";
import { openBooking, type BookingMode } from "./store.ts";

type Props = {
  label?: string;
  mode?: BookingMode;
  sourcePage: string;
  sourceTrigger: string;
  serviceType?: ServiceType;
  className?: string;
};

export function BookingLauncher({
  label = "Book now",
  mode = "bottom-sheet",
  sourcePage,
  sourceTrigger,
  serviceType,
  className = "btn btn--primary",
}: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        openBooking({
          mode,
          sourcePage,
          sourceTrigger,
          initialServiceType: serviceType,
        })
      }
    >
      {label}
    </button>
  );
}
