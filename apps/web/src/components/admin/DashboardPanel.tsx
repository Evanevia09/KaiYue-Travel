import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Summary = {
  timezone: string;
  newBookingsToday: number;
  upcomingConfirmed: number;
  newInquiries: number;
  notificationFailures: number;
  recent: AdminBooking[];
};

export function DashboardPanel() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void adminFetch<Summary>("/api/v1/admin/summary")
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!data) {
    return <p>Loading dashboard…</p>;
  }

  return (
    <div>
      <p className="muted">Business day uses {data.timezone}.</p>
      <div className="grid-3">
        <a className="card" href="/admin/bookings?status=new">
          <h2>{data.newBookingsToday}</h2>
          <p>New bookings today</p>
        </a>
        <a className="card" href="/admin/bookings?status=confirmed">
          <h2>{data.upcomingConfirmed}</h2>
          <p>Upcoming confirmed / in progress</p>
        </a>
        <a className="card" href="/admin/contacts?status=new">
          <h2>{data.newInquiries}</h2>
          <p>New inquiries</p>
        </a>
      </div>
      <p>
        Notification attention: <strong>{data.notificationFailures}</strong>
      </p>
      <h2>Recent bookings</h2>
      {data.recent.length === 0 ? <p>No bookings yet.</p> : null}
      <ul>
        {data.recent.map((item) => (
          <li key={item.reference}>
            <a href={`/admin/bookings/${item.reference}`}>{item.reference}</a> · {item.status} ·{" "}
            {formatWhen(item.pickupAt)}
          </li>
        ))}
      </ul>
    </div>
  );
}
