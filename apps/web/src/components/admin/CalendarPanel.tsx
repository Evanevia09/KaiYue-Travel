import { useEffect, useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

function dateKey(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Macau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function monthRange(anchor: Date) {
  const year = anchor.getFullYear(),
    month = anchor.getMonth();
  return {
    from: new Date(Date.UTC(year, month, 1) - 8 * 3600000).toISOString(),
    to: new Date(Date.UTC(year, month + 1, 1) - 8 * 3600000 - 1).toISOString(),
  };
}

export function CalendarPanel() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => monthRange(anchor), [anchor]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const found: AdminBooking[] = [];
        let cursor: string | null = null;
        for (let page = 0; page < 20; page++) {
          const query = new URLSearchParams({ from: range.from, to: range.to, limit: "50" });
          if (cursor) query.set("cursor", cursor);
          const result: { items: AdminBooking[]; nextCursor: string | null } = await adminFetch(
            `/api/v1/admin/bookings?${query}`,
          );
          found.push(...result.items);
          cursor = result.nextCursor;
          if (!cursor) break;
        }
        if (live) setItems(found);
      } catch (err) {
        if (live) setError((err as Error).message);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [range]);

  const byDay = new Map<string, AdminBooking[]>();
  for (const item of items) {
    const key = dateKey(item.pickupAt);
    byDay.set(key, [...(byDay.get(key) ?? []), item]);
  }
  const selectedItems = byDay.get(dateKey(selected)) ?? [];

  return (
    <div className="admin-calendar-page">
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">Schedule</p>
          <h2>Booking calendar</h2>
          <p className="muted">Pickup dates and times are shown in Macau time.</p>
        </div>
        <a className="btn btn--primary" href="/admin/bookings">
          View all bookings
        </a>
      </div>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      <div className="admin-calendar-layout">
        <section className="admin-card admin-calendar-card">
          <Calendar
            locale="en-GB"
            view="month"
            minDetail="month"
            maxDetail="month"
            showNeighboringMonth={false}
            value={selected}
            onClickDay={setSelected}
            onActiveStartDateChange={({ activeStartDate }) => {
              if (activeStartDate) setAnchor(activeStartDate);
            }}
            tileContent={({ date, view }) =>
              view === "month" ? (
                <span className="admin-calendar-count">
                  {byDay.get(dateKey(date))?.length || ""}
                </span>
              ) : null
            }
            tileClassName={({ date, view }) =>
              view === "month" && byDay.has(dateKey(date))
                ? "admin-calendar-has-bookings"
                : undefined
            }
          />
        </section>
        <aside className="admin-card admin-agenda">
          <p className="admin-eyebrow">Daily agenda</p>
          <h2>
            {selected.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          {loading ? (
            <p>Loading bookings…</p>
          ) : selectedItems.length === 0 ? (
            <p className="muted">No pickups scheduled for this day.</p>
          ) : (
            <div className="admin-agenda-list">
              {selectedItems.map((item) => (
                <a key={item.reference} href={`/admin/bookings/${item.reference}`}>
                  <span>{formatWhen(item.pickupAt)}</span>
                  <strong>{item.pickupLocation}</strong>
                  <small>
                    {item.reference} · {item.status} · {item.passengerCount} passengers
                  </small>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
