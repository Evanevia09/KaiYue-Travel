import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, formatWhen, type AdminBooking } from "./api.ts";

type Props = {
  locale: AdminLocale;
  initialStatus?: string;
};

export function BookingsPanel({ locale, initialStatus = "" }: Props) {
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
      { locale },
    )
      .then((data) => {
        if (live) {
          setItems(data.items);
          setNextCursor(data.nextCursor);
          setTotal(data.total);
          setError("");
        }
      })
      .catch((err: Error) => setError(localizeCaughtError(err, locale)));
    return () => {
      live = false;
    };
  }, [status, page, cursors, locale]);

  return (
    <div>
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">{t(locale, "bookings.eyebrow")}</p>
          <h2>{t(locale, "bookings.heading")}</h2>
          <p className="muted">{t(locale, "bookings.lead")}</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShowCreate((value) => !value)}
        >
          {showCreate ? t(locale, "bookings.closeForm") : t(locale, "bookings.add")}
        </button>
      </div>
      <div className="filters admin-filters">
        <label>
          {t(locale, "bookings.status")}{" "}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
              setCursors([null]);
            }}
          >
            <option value="">{t(locale, "bookings.statusAll")}</option>
            <option value="enquiry">{t(locale, "status.enquiry")}</option>
            <option value="assigned">{t(locale, "status.assigned")}</option>
            <option value="completed">{t(locale, "status.completed")}</option>
            <option value="cancelled">{t(locale, "status.cancelled")}</option>
          </select>
        </label>
        <span className="admin-results-count">
          {t(locale, total === 1 ? "bookings.countOne" : "bookings.countMany", { count: total })}
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
              locale,
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
              .catch((err: Error) => setError(localizeCaughtError(err, locale)))
              .finally(() => setSaving(false));
          }}
        >
          <div className="admin-card__heading">
            <div>
              <span className="admin-kpi__label">{t(locale, "bookings.manual")}</span>
              <h2>{t(locale, "bookings.addHeading")}</h2>
            </div>
          </div>
          <div className="booking-fields">
            <label className="field">
              {t(locale, "bookings.service")}
              <select name="serviceType" defaultValue="point_to_point">
                <option value="point_to_point">{t(locale, "service.point_to_point")}</option>
                <option value="airport_transfer">{t(locale, "service.airport_transfer")}</option>
              </select>
            </label>
            <label className="field">
              {t(locale, "bookings.pickupAt")}
              <input name="pickupAt" type="datetime-local" required />
            </label>
            <label className="field">
              {t(locale, "bookings.pickupLocation")}
              <input name="pickupLocation" required />
            </label>
            <label className="field">
              {t(locale, "bookings.destination")}
              <input name="destination" required />
            </label>
            <label className="field">
              {t(locale, "bookings.customerName")}
              <input name="contactName" />
            </label>
            <label className="field">
              {t(locale, "bookings.phone")}
              <input name="phone" />
            </label>
            <label className="field">
              {t(locale, "bookings.passengers")}
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
              {t(locale, "bookings.remarks")}
              <textarea name="message" required />
            </label>
          </div>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? t(locale, "bookings.saving") : t(locale, "bookings.save")}
          </button>
        </form>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      {items === null ? <p>{t(locale, "bookings.loading")}</p> : null}
      {items?.length === 0 ? <p>{t(locale, "bookings.empty")}</p> : null}
      {items && items.length > 0 ? (
        <div className="admin-card admin-table-card">
          <div className="table-wrap">
            <table className="admin-bookings-table">
              <thead>
                <tr>
                  <th>{t(locale, "bookings.colBooking")}</th>
                  <th>{t(locale, "bookings.colPickup")}</th>
                  <th>{t(locale, "bookings.colJourney")}</th>
                  <th>{t(locale, "bookings.colCustomer")}</th>
                  <th>{t(locale, "bookings.colDispatch")}</th>
                  <th>{t(locale, "bookings.colStatus")}</th>
                  <th>
                    <span className="sr-only">{t(locale, "bookings.open")}</span>
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
                      <strong>{formatWhen(item.pickupAt, locale)}</strong>
                      <small>
                        {t(
                          locale,
                          item.passengerCount === 1
                            ? "bookings.passengerOne"
                            : "bookings.passengerMany",
                          { count: item.passengerCount },
                        )}
                      </small>
                    </td>
                    <td>
                      <strong>{item.pickupLocation}</strong>
                      <small>
                        →{" "}
                        {item.destination || item.offerTitle || t(locale, "bookings.hourlyService")}
                      </small>
                      <small>
                        {item.offerTitle
                          ? t(locale, "bookings.specialOffer", { title: item.offerTitle })
                          : prefixedLabel(locale, "service", item.serviceType)}
                      </small>
                    </td>
                    <td>
                      <strong>{item.contactName || t(locale, "bookings.unnamed")}</strong>
                      <small>
                        {item.phone ||
                          item.email ||
                          prefixedLabel(locale, "channel", item.communicationChannel)}
                      </small>
                    </td>
                    <td>
                      {item.driverId && item.vehicleId ? (
                        <span className="admin-dispatch-ready">
                          {t(locale, "bookings.driverAssigned")}
                        </span>
                      ) : (
                        <span className="admin-dispatch-pending">
                          {t(locale, "bookings.notAssigned")}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${item.status}`}>
                        {prefixedLabel(locale, "status", item.status)}
                      </span>
                    </td>
                    <td>
                      <a
                        className="admin-row-link"
                        href={`/admin/bookings/${item.reference}`}
                        aria-label={t(locale, "bookings.openAria", { reference: item.reference })}
                      >
                        {t(locale, "bookings.view")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-pagination">
            <span>
              {t(locale, "bookings.showing", {
                from: page * 15 + 1,
                to: page * 15 + items.length,
                total,
              })}
            </span>
            <div>
              <button
                className="btn btn--secondary"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                {t(locale, "bookings.previous")}
              </button>
              <span>{t(locale, "bookings.page", { page: page + 1 })}</span>
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
                {t(locale, "bookings.next")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
