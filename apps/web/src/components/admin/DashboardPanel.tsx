import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Summary = {
  timezone: string;
  newBookingsToday: number;
  assignedUpcoming: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
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
      <div className="admin-kpis">
        <a className="admin-kpi admin-kpi--accent" href="/admin/bookings?status=enquiry">
          <span className="admin-kpi__label">New today</span>
          <h2>{data.newBookingsToday}</h2>
          <p>Booking enquiries</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=assigned">
          <span className="admin-kpi__label">Upcoming</span>
          <h2>{data.assignedUpcoming}</h2>
          <p>Assigned bookings</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=completed">
          <span className="admin-kpi__label">This month</span>
          <h2>{data.completedThisMonth}</h2>
          <p>Completed</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=cancelled">
          <span className="admin-kpi__label">This month</span>
          <h2>{data.cancelledThisMonth}</h2>
          <p>Cancelled</p>
        </a>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-card__heading">
            <div>
              <span className="admin-kpi__label">Operations</span>
              <h2>Recent booking enquiries</h2>
            </div>
            <a href="/admin/bookings">View all</a>
          </div>
          {data.recent.length === 0 ? (
            <p>No bookings yet.</p>
          ) : (
            <div className="admin-recent-list">
              {data.recent.map((item) => (
                <a key={item.reference} href={`/admin/bookings/${item.reference}`}>
                  <span>
                    <strong>{item.pickupLocation}</strong>
                    <small>{item.destination ? ` → ${item.destination}` : " · Hourly"}</small>
                  </span>
                  <span>
                    <span className={`badge badge--${item.status}`}>{item.status}</span>
                    <small>{formatWhen(item.pickupAt)}</small>
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
        <aside className="admin-card admin-card--compact">
          <span className="admin-kpi__label">Attention</span>
          <h2>{data.notificationFailures}</h2>
          <p>Email notifications requiring review</p>
          <hr />
          <h2>{data.newInquiries}</h2>
          <p>
            <a href="/admin/contacts?status=new">General enquiries</a>
          </p>
        </aside>
      </div>
    </div>
  );
}
