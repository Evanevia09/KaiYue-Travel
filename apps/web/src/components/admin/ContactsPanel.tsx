import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, formatWhen, type AdminContact } from "./api.ts";

export function ContactsPanel({
  locale,
  initialStatus = "",
}: {
  locale: AdminLocale;
  initialStatus?: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<AdminContact[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    setItems(null);
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    void adminFetch<{ items: AdminContact[] }>(`/api/v1/admin/contacts${query}`, { locale })
      .then((data) => {
        if (live) {
          setItems(data.items);
          setError("");
        }
      })
      .catch((err: Error) => {
        if (live) setError(localizeCaughtError(err, locale));
      });
    return () => {
      live = false;
    };
  }, [status, locale]);

  return (
    <div>
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">{t(locale, "contacts.eyebrow")}</p>
          <h2>{t(locale, "contacts.heading")}</h2>
          <p className="muted">{t(locale, "contacts.lead")}</p>
        </div>
      </div>
      <div className="filters admin-filters">
        <label>
          {t(locale, "contacts.status")}{" "}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{t(locale, "contacts.all")}</option>
            <option value="new">{t(locale, "status.new")}</option>
            <option value="replied">{t(locale, "status.replied")}</option>
            <option value="closed">{t(locale, "status.closed")}</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      ) : null}
      {items === null ? <p>{t(locale, "contacts.loading")}</p> : null}
      {items?.length === 0 ? <p className="muted">{t(locale, "contacts.empty")}</p> : null}
      {items && items.length > 0 ? (
        <div className="admin-card admin-table-card">
          <div className="table-wrap">
            <table className="admin-bookings-table">
              <thead>
                <tr>
                  <th>{t(locale, "contacts.colReference")}</th>
                  <th>{t(locale, "contacts.colReceived")}</th>
                  <th>{t(locale, "contacts.colInquiry")}</th>
                  <th>{t(locale, "contacts.colName")}</th>
                  <th>{t(locale, "contacts.colStatus")}</th>
                  <th>
                    <span className="sr-only">{t(locale, "contacts.open")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td data-label={t(locale, "contacts.colReference")}>
                      <a className="admin-reference" href={`/admin/contacts/${item.id}`}>
                        {item.reference}
                      </a>
                    </td>
                    <td data-label={t(locale, "contacts.colReceived")}>
                      <strong>{formatWhen(item.createdAt, locale)}</strong>
                    </td>
                    <td data-label={t(locale, "contacts.colInquiry")}>
                      {prefixedLabel(locale, "inquiry", item.inquiryType)}
                    </td>
                    <td data-label={t(locale, "contacts.colName")}>
                      <strong>{item.name}</strong>
                      {item.company ? <small>{item.company}</small> : null}
                    </td>
                    <td data-label={t(locale, "contacts.colStatus")}>
                      <span className={`badge badge--${item.status}`}>
                        {prefixedLabel(locale, "status", item.status)}
                      </span>
                    </td>
                    <td data-label={t(locale, "contacts.open")}>
                      <a
                        className="admin-row-link"
                        href={`/admin/contacts/${item.id}`}
                        aria-label={t(locale, "contacts.openAria", { reference: item.reference })}
                      >
                        {t(locale, "contacts.view")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
