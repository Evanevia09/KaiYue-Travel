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
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    void adminFetch<{ items: AdminContact[] }>(`/api/v1/admin/contacts${query}`, { locale })
      .then((data) => setItems(data.items))
      .catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [status, locale]);

  return (
    <div>
      <div className="filters">
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
      {error ? <p role="alert">{error}</p> : null}
      {items === null ? <p>{t(locale, "contacts.loading")}</p> : null}
      {items?.length === 0 ? <p>{t(locale, "contacts.empty")}</p> : null}
      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <a href={`/admin/contacts/${item.id}`}>{item.reference}</a> ·{" "}
            {prefixedLabel(locale, "inquiry", item.inquiryType)} · {item.name}
            {item.company ? ` / ${item.company}` : ""} · {formatWhen(item.createdAt, locale)} ·{" "}
            {prefixedLabel(locale, "status", item.status)}
          </li>
        ))}
      </ul>
    </div>
  );
}
