import { BOOKING_TRANSITIONS, type BookingStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import {
  adminFetch,
  formatWhen,
  type AdminBooking,
  type AdminDriver,
  type AdminVehicle,
} from "./api.ts";

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
const macauInput = (value: string | null) =>
  value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : "";
const toIso = (value: FormDataEntryValue | null) =>
  value ? new Date(`${value}:00+08:00`).toISOString() : null;

export function BookingDetailPanel({ reference }: { reference: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    const [a, b, c] = await Promise.all([
      adminFetch<Detail>(`/api/v1/admin/bookings/${reference}`),
      adminFetch<{ items: AdminDriver[] }>("/api/v1/admin/drivers"),
      adminFetch<{ items: AdminVehicle[] }>("/api/v1/admin/vehicles"),
    ]);
    setDetail(a);
    setDrivers(b.items);
    setVehicles(c.items);
  }
  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [reference]);
  async function action(task: () => Promise<unknown>, success: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await task();
      await load();
      setNotice(success);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (!detail) return <p>{error || "Loading booking…"}</p>;
  const booking = detail.booking;
  const next = BOOKING_TRANSITIONS[booking.status as BookingStatus] ?? [];
  const driver = drivers.find((item) => item.id === booking.driverId);
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);

  return (
    <div className="admin-detail-page">
      <a href="/admin/bookings" className="admin-back">
        ← All bookings
      </a>
      <div className="admin-detail-heading">
        <div>
          <p className="admin-eyebrow">Booking enquiry</p>
          <h2>{reference}</h2>
          <p className="muted">
            Received {formatWhen(booking.createdAt)} · {booking.communicationChannel}
          </p>
        </div>
        <span className={`badge badge--${booking.status}`}>{booking.status}</span>
      </div>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-feedback">
          {notice}
        </p>
      )}
      <div className="admin-detail-grid">
        <div className="admin-detail-main">
          <section className="admin-card">
            <div className="admin-card__heading">
              <div>
                <p className="admin-eyebrow">Journey & customer</p>
                <h2>Booking details</h2>
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditing(!editing)}
              >
                {editing ? "Cancel edit" : "Edit details"}
              </button>
            </div>
            {editing ? (
              <form
                key={booking.updatedAt}
                className="booking-fields admin-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void action(async () => {
                    await adminFetch(`/api/v1/admin/bookings/${reference}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        expectedUpdatedAt: booking.updatedAt,
                        pickupLocation: form.get("pickupLocation"),
                        destination: form.get("destination"),
                        pickupAt: toIso(form.get("pickupAt")),
                        returnAt: toIso(form.get("returnAt")),
                        passengerCount: Number(form.get("passengerCount")),
                        contactName: form.get("contactName"),
                        phone: form.get("phone"),
                        email: form.get("email"),
                        message: form.get("message"),
                      }),
                    });
                    setEditing(false);
                  }, "Booking details saved.");
                }}
              >
                <label className="field">
                  Pickup location
                  <input name="pickupLocation" defaultValue={booking.pickupLocation} required />
                </label>
                <label className="field">
                  Destination
                  <input
                    name="destination"
                    defaultValue={booking.destination ?? ""}
                    required={booking.serviceType !== "hourly_charter"}
                  />
                </label>
                <label className="field">
                  Pickup · Macau time
                  <input
                    name="pickupAt"
                    type="datetime-local"
                    defaultValue={macauInput(booking.pickupAt)}
                    required
                  />
                </label>
                <label className="field">
                  Return · Macau time
                  <input
                    name="returnAt"
                    type="datetime-local"
                    defaultValue={macauInput(booking.returnAt)}
                  />
                </label>
                <label className="field">
                  Passengers
                  <input
                    name="passengerCount"
                    type="number"
                    min="1"
                    max="14"
                    defaultValue={booking.passengerCount}
                    required
                  />
                </label>
                <label className="field">
                  Customer name
                  <input name="contactName" defaultValue={booking.contactName ?? ""} />
                </label>
                <label className="field">
                  Phone
                  <input name="phone" type="tel" defaultValue={booking.phone ?? ""} />
                </label>
                <label className="field">
                  Email
                  <input name="email" type="email" defaultValue={booking.email ?? ""} />
                </label>
                <label className="field field--full">
                  Message
                  <textarea name="message" defaultValue={booking.message} rows={3} />
                </label>
                <button className="btn btn--primary" disabled={saving}>
                  {saving ? "Saving…" : "Save details"}
                </button>
              </form>
            ) : (
              <div className="admin-detail-facts">
                <div>
                  <span>Pickup</span>
                  <strong>{booking.pickupLocation}</strong>
                  <small>{formatWhen(booking.pickupAt)}</small>
                </div>
                <div>
                  <span>Destination</span>
                  <strong>{booking.destination || "Hourly charter"}</strong>
                  {booking.returnAt && <small>Return {formatWhen(booking.returnAt)}</small>}
                </div>
                <div>
                  <span>Customer</span>
                  <strong>{booking.contactName || "Not supplied"}</strong>
                  <small>{booking.phone || booking.email || "No contact detail"}</small>
                </div>
                <div>
                  <span>Passengers</span>
                  <strong>{booking.passengerCount}</strong>
                  <small>{booking.serviceType.replaceAll("_", " ")}</small>
                </div>
              </div>
            )}
            {!editing && (
              <div className="admin-message">
                <span>Customer message</span>
                <p>{booking.message || "No message supplied."}</p>
              </div>
            )}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">Dispatch</p>
            <h2>Driver & vehicle</h2>
            <p className="muted">
              Choose both resources. Check availability manually before confirming with the
              customer.
            </p>
            <p className="admin-current-assignment">
              Current: <strong>{driver?.name || "No driver"}</strong> ·{" "}
              <strong>
                {vehicle ? `${vehicle.plateNumber} · ${vehicle.makeModel}` : "No vehicle"}
              </strong>
            </p>
            <form
              className="admin-assignment-form"
              key={`${booking.driverId}-${booking.vehicleId}`}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void action(
                  () =>
                    adminFetch(`/api/v1/admin/bookings/${reference}/assignment`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        expectedUpdatedAt: booking.updatedAt,
                        driverId: form.get("driverId") || null,
                        vehicleId: form.get("vehicleId") || null,
                      }),
                    }),
                  "Assignment saved.",
                );
              }}
            >
              <label className="field">
                Driver
                <select name="driverId" defaultValue={booking.driverId ?? ""}>
                  <option value="">Select driver</option>
                  {drivers
                    .filter((item) => item.active || item.id === booking.driverId)
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name} · {item.phone}
                        {item.active ? "" : " (inactive)"}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                Vehicle
                <select name="vehicleId" defaultValue={booking.vehicleId ?? ""}>
                  <option value="">Select vehicle</option>
                  {vehicles
                    .filter((item) => item.active || item.id === booking.vehicleId)
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.plateNumber} · {item.makeModel} · {item.passengerCapacity} seats
                        {item.active ? "" : " (inactive)"}
                      </option>
                    ))}
                </select>
              </label>
              <button className="btn btn--primary" disabled={saving}>
                {saving ? "Saving…" : "Save assignment"}
              </button>
            </form>
            <a href="/admin/inventory" className="admin-inline-link">
              Manage drivers & vehicles →
            </a>
          </section>
        </div>
        <aside className="admin-detail-side">
          <section className="admin-card">
            <p className="admin-eyebrow">Workflow</p>
            <h2>Status</h2>
            <p className="muted">Status changes do not notify the customer automatically.</p>
            <div className="admin-status-actions">
              {next.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  className={status === "cancelled" ? "btn btn--danger" : "btn btn--secondary"}
                  onClick={() => {
                    if (status === "cancelled" && !window.confirm("Cancel this booking request?"))
                      return;
                    void action(
                      () =>
                        adminFetch(`/api/v1/admin/bookings/${reference}/status`, {
                          method: "PATCH",
                          body: JSON.stringify({ status }),
                        }),
                      `Status changed to ${status}.`,
                    );
                  }}
                >
                  Mark {status}
                </button>
              ))}
            </div>
            {next.length === 0 && <p className="muted">This booking has reached a final status.</p>}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">Team notes</p>
            <h2>Remarks</h2>
            <form
              className="admin-note-form"
              onSubmit={(event) => {
                event.preventDefault();
                void action(async () => {
                  await adminFetch(`/api/v1/admin/bookings/${reference}/notes`, {
                    method: "POST",
                    body: JSON.stringify({ body: note }),
                  });
                  setNote("");
                }, "Note added.");
              }}
            >
              <label className="sr-only" htmlFor="booking-note">
                Add internal note
              </label>
              <textarea
                id="booking-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a handover note…"
                rows={3}
              />
              <button
                type="submit"
                className="btn btn--secondary"
                disabled={saving || note.trim().length < 2}
              >
                Add note
              </button>
            </form>
            <ul className="admin-timeline">
              {detail.notes.map((item) => (
                <li key={item.id}>
                  <p>{item.body}</p>
                  <small>
                    {formatWhen(item.created_at)} · {item.created_by}
                  </small>
                </li>
              ))}
            </ul>
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">History</p>
            <h2>Audit trail</h2>
            <ul className="admin-timeline">
              {detail.events.map((item) => (
                <li key={item.id}>
                  <strong>{item.event_type.replaceAll("_", " ")}</strong>
                  <small>
                    {formatWhen(item.created_at)} · {item.actor_id}
                  </small>
                  {item.event_type === "status_change" && (
                    <small>
                      {item.from_value} → {item.to_value}
                    </small>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
