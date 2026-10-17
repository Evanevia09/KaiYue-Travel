import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

export type DashboardSummary = {
  timezone: string;
  newBookingsToday: number;
  assignedUpcoming: number;
  completedThisMonth: number;
  cancelledThisMonth: number;
  newInquiries: number;
  notificationFailures: number;
  recent: AdminBooking[];
};

export function DashboardPanel({
  initial,
  locale,
}: {
  initial?: DashboardSummary | null;
  locale: AdminLocale;
}) {
  const [data, setData] = useState<DashboardSummary | null>(initial ?? null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (initial) return;
    void adminFetch<DashboardSummary>("/api/v1/admin/summary", { locale })
      .then(setData)
      .catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [initial, locale]);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!data) {
    return <p>{t(locale, "dash.loading")}</p>;
  }

  return (
    <div>
      <p className="muted">{t(locale, "dash.timezone", { timezone: data.timezone })}</p>
      <div className="admin-kpis">
        <a className="admin-kpi admin-kpi--accent" href="/admin/bookings?status=enquiry">
          <span className="admin-kpi__label">{t(locale, "dash.newToday")}</span>
          <h2>{data.newBookingsToday}</h2>
          <p>{t(locale, "dash.bookingEnquiries")}</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=assigned">
          <span className="admin-kpi__label">{t(locale, "dash.upcoming")}</span>
          <h2>{data.assignedUpcoming}</h2>
          <p>{t(locale, "dash.assignedBookings")}</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=completed">
          <span className="admin-kpi__label">{t(locale, "dash.thisMonth")}</span>
          <h2>{data.completedThisMonth}</h2>
          <p>{t(locale, "dash.completed")}</p>
        </a>
        <a className="admin-kpi" href="/admin/bookings?status=cancelled">
          <span className="admin-kpi__label">{t(locale, "dash.thisMonth")}</span>
          <h2>{data.cancelledThisMonth}</h2>
          <p>{t(locale, "dash.cancelled")}</p>
        </a>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-card">
          <div className="admin-card__heading">
            <div>
              <span className="admin-kpi__label">{t(locale, "dash.operations")}</span>
              <h2>{t(locale, "dash.recent")}</h2>
            </div>
            <a href="/admin/bookings">{t(locale, "dash.viewAll")}</a>
          </div>
          {data.recent.length === 0 ? (
            <p>{t(locale, "dash.empty")}</p>
          ) : (
            <div className="admin-recent-list">
              {data.recent.map((item) => (
                <a key={item.reference} href={`/admin/bookings/${item.reference}`}>
                  <span>
                    <strong>{item.pickupLocation}</strong>
                    <small>
                      {item.destination
                        ? ` → ${item.destination}`
                        : ` · ${t(locale, "dash.hourly")}`}
                    </small>
                  </span>
                  <span>
                    <span className={`badge badge--${item.status}`}>
                      {prefixedLabel(locale, "status", item.status)}
                    </span>
                    <small>{formatWhen(item.pickupAt, locale)}</small>
                  </span>
                </a>
              ))}
            </div>
          )}
        </section>
        <aside className="admin-card admin-card--compact">
          <span className="admin-kpi__label">{t(locale, "dash.attention")}</span>
          <h2>{data.notificationFailures}</h2>
          <p>{t(locale, "dash.emailReview")}</p>
          <hr />
          <h2>{data.newInquiries}</h2>
          <p>
            <a href="/admin/contacts?status=new">{t(locale, "dash.generalEnquiries")}</a>
          </p>
        </aside>
      </div>
    </div>
  );
}
