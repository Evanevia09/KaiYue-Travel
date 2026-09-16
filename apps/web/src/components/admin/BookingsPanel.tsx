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
            <option value="new">New</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
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
                  <td>{item.contactName}</td>
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
