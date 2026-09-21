import { SERVICE_LABELS } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Props = {
  initialStatus?: string;
};

export function BookingsPanel({ initialStatus = "" }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<AdminBooking[] | null>(null);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    void adminFetch<{ items: AdminBooking[] }>(`/api/v1/admin/bookings${query}`)
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(err.message));
  }, [status]);

  return (
    <div>
      <div className="filters">
        <label>
          Status{" "}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="enquiry">Enquiry</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShowCreate((value) => !value)}
        >
          {showCreate ? "Close" : "+ Add booking"}
        </button>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Pickup</th>
                <th>Journey</th>
                <th>Guest</th>
                <th>Service</th>
                <th>Pax</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.reference}>
                  <td>
                    <a href={`/admin/bookings/${item.reference}`}>{item.reference}</a>
                  </td>
                  <td>{formatWhen(item.pickupAt)}</td>
                  <td>
                    {item.pickupLocation}
                    {item.destination ? ` → ${item.destination}` : ""}
                  </td>
                  <td>{item.contactName || item.communicationChannel}</td>
                  <td>
                    {SERVICE_LABELS[item.serviceType as keyof typeof SERVICE_LABELS] ??
                      item.serviceType}
                  </td>
                  <td>{item.passengerCount}</td>
                  <td>
                    <span className={`badge badge--${item.status}`}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
