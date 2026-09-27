import { SERVICE_LABELS } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Props = {
  initialStatus?: string;
};

export function BookingsPanel({ initialStatus = "" }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<AdminBooking[] | null>(null);
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams({ limit: "15" });
    if (status) query.set("status", status);
    if (cursors[page]) query.set("cursor", cursors[page]!);
    setItems(null);
    void adminFetch<{ items: AdminBooking[]; nextCursor: string | null; total: number }>(
      `/api/v1/admin/bookings?${query}`,
    )
      .then((data) => {
        if (live) {
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setTotal(data.total);
          setError("");
        }
      })
      .catch((err: Error) => setError(err.message));
    return () => {
      live = false;
    };
  }, [status, page, cursors]);

  return (
    <div>
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">Booking enquiries</p>
          <h2>All requests</h2>
          <p className="muted">Review journeys, assign resources and track progress.</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShowCreate((value) => !value)}
        >
          {showCreate ? "Close form" : "+ Add booking"}
        </button>
      </div>
      <div className="filters admin-filters">
        <label>
          Status{" "}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
              setCursors([null]);
            }}
          >
            <option value="">All</option>
            <option value="enquiry">Enquiry</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <span className="admin-results-count">
          {total} {total === 1 ? "booking" : "bookings"}
        </span>
      </div>
      {showCreate ? (
        <form
          className="admin-card admin-create-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setSaving(true);
            setError("");
            void adminFetch<{ reference: string }>("/api/v1/admin/bookings", {
              method: "POST",
              headers: { "idempotency-key": crypto.randomUUID() },
              body: JSON.stringify({
                serviceType: form.get("serviceType"),
                pickupLocation: form.get("pickupLocation"),
                destination: form.get("destination"),
                pickupAt: new Date(String(form.get("pickupAt"))).toISOString(),
                passengerCount: Number(form.get("passengerCount")),
                communicationChannel: "whatsapp",
                contactName: form.get("contactName"),
                phone: form.get("phone"),
                message: form.get("message"),
                sourcePage: "/admin/bookings",
                sourceTrigger: "admin-manual",
                sourceMode: "page",
                locale: "en",
              }),
            })
              .then((created) => {
                window.location.href = `/admin/bookings/${created.reference}`;
              })
              .catch((err: Error) => setError(err.message))
              .finally(() => setSaving(false));
          }}
        >
          <div className="admin-card__heading">
            <div>
              <span className="admin-kpi__label">Manual entry</span>
              <h2>Add booking enquiry</h2>
            </div>
          </div>
          <div className="booking-fields">
            <label className="field">
              Service
              <select name="serviceType" defaultValue="point_to_point">
                <option value="point_to_point">Point to point</option>
                <option value="airport_transfer">Airport transfer</option>
              </select>
            </label>
            <label className="field">
              Pickup date and time
              <input name="pickupAt" type="datetime-local" required />
            </label>
            <label className="field">
              Pickup location
              <input name="pickupLocation" required />
            </label>
            <label className="field">
              Destination
              <input name="destination" required />
            </label>
            <label className="field">
              Customer name
              <input name="contactName" />
            </label>
            <label className="field">
              Phone
              <input name="phone" />
            </label>
            <label className="field">
              Passengers
              <input
                name="passengerCount"
                type="number"
                min="1"
                max="14"
                defaultValue="1"
                required
              />
            </label>
            <label className="field field--full">
              Remarks
              <textarea name="message" required />
            </label>
          </div>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? "Saving…" : "Save booking"}
          </button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {items === null ? <p>Loading bookings…</p> : null}
      {items?.length === 0 ? <p>No bookings match these filters.</p> : null}
      {items && items.length > 0 ? (
        <div className="admin-card admin-table-card">
          <div className="table-wrap">
            <table className="admin-bookings-table">
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Pickup</th>
                  <th>Journey / service</th>
                  <th>Customer</th>
                  <th>Dispatch</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.reference}>
                    <td>
                      <a className="admin-reference" href={`/admin/bookings/${item.reference}`}>
                        {item.reference}
                      </a>
                    </td>
                    <td>
                      <strong>{formatWhen(item.pickupAt)}</strong>
                      <small>
                        {item.passengerCount}{" "}
                        {item.passengerCount === 1 ? "passenger" : "passengers"}
                      </small>
                    </td>
                    <td>
                      <strong>{item.pickupLocation}</strong>
                      <small>→ {item.destination || "Hourly service"}</small>
                      <small>
                        {SERVICE_LABELS[item.serviceType as keyof typeof SERVICE_LABELS] ??
                          item.serviceType}
                      </small>
                    </td>
                    <td>
                      <strong>{item.contactName || "Unnamed customer"}</strong>
                      <small>{item.phone || item.email || item.communicationChannel}</small>
                    </td>
                    <td>
                      {item.driverId && item.vehicleId ? (
                        <span className="admin-dispatch-ready">Driver + car assigned</span>
                      ) : (
                        <span className="admin-dispatch-pending">Not assigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${item.status}`}>{item.status}</span>
                    </td>
                    <td>
                      <a
                        className="admin-row-link"
                        href={`/admin/bookings/${item.reference}`}
                        aria-label={`Open ${item.reference}`}
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>
              Showing {page * 15 + 1}–{page * 15 + items.length} of {total}
            </span>
            <div>
              <button
                className="btn btn--secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>Page {page + 1}</span>
              <button
                className="btn btn--secondary"
                disabled={!nextCursor}
                onClick={() => {
                  if (nextCursor) {
                    setCursors([...cursors.slice(0, page + 1), nextCursor]);
                    setPage(page + 1);
                  }
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
