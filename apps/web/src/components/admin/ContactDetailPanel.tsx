import { CONTACT_TRANSITIONS, type ContactStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, formatWhen, type AdminContact } from "./api.ts";

type Detail = {
  contact: AdminContact;
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

export function ContactDetailPanel({ id, locale }: { id: string; locale: AdminLocale }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setDetail(await adminFetch<Detail>(`/api/v1/admin/contacts/${id}`, { locale }));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [id, locale]);

  async function action(task: () => Promise<unknown>, success: string) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await task();
      await load();
      setNotice(success);
    } catch (err) {
      setError(localizeCaughtError(err, locale));
    } finally {
      setSaving(false);
    }
  }

  if (!detail) {
    return (
      <p
        role={error ? "alert" : undefined}
        className={error ? "admin-feedback admin-feedback--error" : undefined}
      >
        {error || t(locale, "contact.loading")}
      </p>
    );
  }

  const next = CONTACT_TRANSITIONS[detail.contact.status as ContactStatus] ?? [];
  const contact = detail.contact;

  return (
    <div className="admin-detail-page">
      <a href="/admin/contacts" className="admin-back">
        {t(locale, "contacts.back")}
      </a>
      <div className="admin-detail-heading">
        <div>
          <p className="admin-eyebrow">{t(locale, "contact.eyebrow")}</p>
          <h2>{contact.reference}</h2>
          <p className="muted">
            {t(locale, "contact.received", { when: formatWhen(contact.createdAt, locale) })}
          </p>
        </div>
        <span className={`badge badge--${contact.status}`}>
          {prefixedLabel(locale, "status", contact.status)}
        </span>
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
                <p className="admin-eyebrow">
                  {prefixedLabel(locale, "inquiry", contact.inquiryType)}
                </p>
                <h2>{contact.name}</h2>
              </div>
            </div>
            <div className="admin-detail-facts">
              <div>
                <span>{t(locale, "contact.company")}</span>
                <strong>{contact.company || t(locale, "detail.notSupplied")}</strong>
              </div>
              <div>
                <span>{t(locale, "contact.phone")}</span>
                <strong>{contact.phone || t(locale, "detail.noContact")}</strong>
              </div>
              <div>
                <span>{t(locale, "contact.email")}</span>
                <strong>{contact.email || t(locale, "detail.notSupplied")}</strong>
              </div>
            </div>
            <div className="admin-message">
              <span>{t(locale, "contact.message")}</span>
              <p>{contact.message}</p>
            </div>
          </section>
        </div>
        <aside className="admin-detail-side">
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "contact.workflow")}</p>
            <h2>{t(locale, "contact.status")}</h2>
            <p className="muted">{t(locale, "contact.statusHelp")}</p>
            <div className="admin-status-actions">
              {next.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  className="btn btn--secondary"
                  onClick={() => {
                    void action(
                      () =>
                        adminFetch(`/api/v1/admin/contacts/${id}/status`, {
                          method: "PATCH",
                          locale,
                          body: JSON.stringify({ status }),
                        }),
                      t(locale, "contact.statusChanged", {
                        status: prefixedLabel(locale, "status", status),
                      }),
                    );
                  }}
                >
                  {t(locale, "contact.mark", { status: prefixedLabel(locale, "status", status) })}
                </button>
              ))}
            </div>
            {next.length === 0 && <p className="muted">{t(locale, "contact.finalStatus")}</p>}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "contact.teamNotes")}</p>
            <h2>{t(locale, "contact.note")}</h2>
            <form
              className="admin-note-form"
              onSubmit={(event) => {
                event.preventDefault();
                void action(
                  async () => {
                    await adminFetch(`/api/v1/admin/contacts/${id}/notes`, {
                      method: "POST",
                      locale,
                      body: JSON.stringify({ body: note }),
                    });
                    setNote("");
                  },
                  t(locale, "contact.noteAdded"),
                );
              }}
            >
              <label className="sr-only" htmlFor="contact-note">
                {t(locale, "contact.note")}
              </label>
              <textarea
                id="contact-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t(locale, "contact.notePlaceholder")}
                rows={3}
              />
              <button
                type="submit"
                className="btn btn--secondary"
                disabled={saving || note.trim().length < 2}
              >
                {saving ? t(locale, "contact.saving") : t(locale, "contact.saveNote")}
              </button>
            </form>
            {detail.notes.length === 0 ? (
              <p className="muted">{t(locale, "contact.noNotes")}</p>
            ) : (
              <ul className="admin-timeline">
                {detail.notes.map((item) => (
                  <li key={item.id}>
                    <p>{item.body}</p>
                    <small>
                      {formatWhen(item.created_at, locale)} · {item.created_by}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "contact.history")}</p>
            <h2>{t(locale, "contact.audit")}</h2>
            {detail.events.length === 0 ? (
              <p className="muted">{t(locale, "contact.noEvents")}</p>
            ) : (
              <ul className="admin-timeline">
                {detail.events.map((item) => (
                  <li key={item.id}>
                    <strong>{prefixedLabel(locale, "event", item.event_type)}</strong>
                    <small>
                      {formatWhen(item.created_at, locale)} · {item.actor_id}
                    </small>
                    {item.event_type === "status_change" && (
                      <small>
                        {prefixedLabel(locale, "status", item.from_value ?? "")} →{" "}
                        {prefixedLabel(locale, "status", item.to_value ?? "")}
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
