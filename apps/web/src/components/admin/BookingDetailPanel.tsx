import { BOOKING_TRANSITIONS, type BookingStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Props = { reference: string };

type Detail = {
  booking: AdminBooking;
  notes: Array<{ id: string; body: string; created_by: string; created_at: string }>;
  events: Array<{
    id: string;
    event_type: string;
    actor_id: string;
    from_value: string | null;
    to_value: string | null;
    created_at: string;
  }>;
};

export function BookingDetailPanel({ reference }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    const data = await adminFetch<Detail>(`/api/v1/admin/bookings/${reference}`);
    setDetail(data);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [reference]);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!detail) {
    return <p>Loading booking…</p>;
  }

  const next = BOOKING_TRANSITIONS[detail.booking.status as BookingStatus] ?? [];

  return (
    <div className="grid-2">
      <article className="card">
        <p>
          <span className={`badge badge--${detail.booking.status}`}>{detail.booking.status}</span> ·
          notification {detail.booking.notificationState}
        </p>
        <p>
          {detail.booking.pickupLocation}
          {detail.booking.destination ? ` → ${detail.booking.destination}` : ""}
        </p>
        <p>Pickup: {formatWhen(detail.booking.pickupAt)}</p>
        <p>
          {detail.booking.contactName || "No name provided"} ·{" "}
          {detail.booking.phone || detail.booking.communicationChannel}
          {detail.booking.email ? ` · ${detail.booking.email}` : ""}
        </p>
        <p>{detail.booking.passengerCount} passengers</p>
        <p>
          <strong>Customer message</strong>
          <br />
          {detail.booking.message}
        </p>
        {detail.booking.notes ? (
          <p>
            <strong>Booking notes</strong>
            <br />
            {detail.booking.notes}
          </p>
        ) : null}
        {next.length > 0 ? (
          <div>
            <h2>Update status</h2>
            <p className="muted">Status changes do not email the customer in Release 1.</p>
            {next.map((status) => (
              <button
                key={status}
                type="button"
                className={status === "cancelled" ? "btn btn--danger" : "btn btn--secondary"}
                onClick={() => {
                  const confirmed =
                    status === "cancelled" ? window.confirm("Cancel this booking request?") : true;
                  if (!confirmed) {
                    return;
                  }
                  void adminFetch(`/api/v1/admin/bookings/${reference}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status }),
                  })
                    .then(() => load())
                    .catch((err: Error) => setError(err.message));
                }}
              >
                Mark {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        ) : (
          <p>No further status changes are allowed.</p>
        )}
      </article>
      <aside className="card">
        <h2>Internal notes</h2>
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            void adminFetch(`/api/v1/admin/bookings/${reference}/notes`, {
              method: "POST",
              body: JSON.stringify({ body: note }),
            })
              .then(() => {
                setNote("");
                return load();
              })
              .catch((err: Error) => setError(err.message));
          }}
        >
          <label htmlFor="note">Add note</label>
          <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} />
          <button type="submit" className="btn btn--secondary">
            Save note
          </button>
        </form>
        <ul>
          {detail.notes.map((item) => (
            <li key={item.id}>
              {item.body} <span className="muted">{formatWhen(item.created_at)}</span>
            </li>
          ))}
        </ul>
        <h2>Audit</h2>
        <ul>
          {detail.events.map((item) => (
            <li key={item.id}>
              {item.event_type}: {item.from_value} → {item.to_value}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
