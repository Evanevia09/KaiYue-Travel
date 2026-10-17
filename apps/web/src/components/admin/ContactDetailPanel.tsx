import { CONTACT_TRANSITIONS, type ContactStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, formatWhen, type AdminContact } from "./api.ts";

type Detail = {
  contact: AdminContact;
  notes: Array<{ id: string; body: string; created_by: string; created_at: string }>;
  events: Array<{ id: string; from_value: string | null; to_value: string | null }>;
};

export function ContactDetailPanel({ id, locale }: { id: string; locale: AdminLocale }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setDetail(await adminFetch<Detail>(`/api/v1/admin/contacts/${id}`, { locale }));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [id, locale]);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!detail) {
    return <p>{t(locale, "contact.loading")}</p>;
  }

  const next = CONTACT_TRANSITIONS[detail.contact.status as ContactStatus] ?? [];

  return (
    <article className="card">
      <p>
        <span className={`badge badge--${detail.contact.status}`}>
          {prefixedLabel(locale, "status", detail.contact.status)}
        </span>{" "}
        · {prefixedLabel(locale, "inquiry", detail.contact.inquiryType)}
      </p>
      <p>
        {detail.contact.name}
        {detail.contact.company ? ` · ${detail.contact.company}` : ""} · {detail.contact.phone}
      </p>
      <p>{detail.contact.message}</p>
      {next.map((status) => (
        <button
          key={status}
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            void adminFetch(`/api/v1/admin/contacts/${id}/status`, {
              method: "PATCH",
              locale,
              body: JSON.stringify({ status }),
            })
              .then(() => load())
              .catch((err: Error) => setError(localizeCaughtError(err, locale)));
          }}
        >
          {t(locale, "contact.mark", { status: prefixedLabel(locale, "status", status) })}
        </button>
      ))}
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          void adminFetch(`/api/v1/admin/contacts/${id}/notes`, {
            method: "POST",
            locale,
            body: JSON.stringify({ body: note }),
          })
            .then(() => {
              setNote("");
              return load();
            })
            .catch((err: Error) => setError(localizeCaughtError(err, locale)));
        }}
      >
        <label htmlFor="contact-note">{t(locale, "contact.note")}</label>
        <textarea
          id="contact-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button type="submit" className="btn btn--secondary">
          {t(locale, "contact.saveNote")}
        </button>
      </form>
      <ul>
        {detail.notes.map((item) => (
          <li key={item.id}>
            {item.body} <span className="muted">{formatWhen(item.created_at, locale)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
