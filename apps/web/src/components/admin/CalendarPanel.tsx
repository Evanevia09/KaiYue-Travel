import { useEffect, useMemo, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

function monthRange(anchor: Date) {
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0, 23, 59, 59));
  return { start, end };
}

export function CalendarPanel() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [error, setError] = useState("");
  const range = useMemo(() => monthRange(anchor), [anchor]);

  useEffect(() => {
    const query = `?from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(range.end.toISOString())}`;
    void adminFetch<{ items: AdminBooking[] }>(`/api/v1/admin/bookings${query}`)
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, [range]);

  const days = new Date(range.end).getUTCDate();
  const byDay = new Map<number, AdminBooking[]>();
  for (const item of items) {
    const day = new Date(item.pickupAt).getUTCDate();
    byDay.set(day, [...(byDay.get(day) ?? []), item]);
  }

  return (
    <div>
      <div className="filters">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() =>
            setAnchor(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1)))
          }
        >
          Previous
        </button>
        <strong>
          {anchor.toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
        </strong>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() =>
            setAnchor(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1)))
          }
        >
          Next
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      <div className="calendar-grid" aria-hidden="true">
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const events = byDay.get(day) ?? [];
          return (
            <div key={day} className="calendar-cell">
              <strong>{day}</strong>
              {events.map((item) => (
                <div
                  key={item.reference}
                  className={item.status === "cancelled" ? "muted" : undefined}
                >
                  <a href={`/admin/bookings/${item.reference}`}>
                    {item.status} {item.serviceType.replaceAll("_", " ")}
                  </a>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <h2>Agenda</h2>
      {items.length === 0 ? <p>No bookings in this month.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.reference}>
            <a href={`/admin/bookings/${item.reference}`}>{item.reference}</a> ·{" "}
            {formatWhen(item.pickupAt)} · {item.status} · {item.pickupLocation}
          </li>
        ))}
      </ul>
    </div>
  );
}
