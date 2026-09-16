import { CONTACT_TRANSITIONS, type ContactStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminContact } from "./api.ts";

type Detail = {
  contact: AdminContact;
  notes: Array<{ id: string; body: string; created_by: string; created_at: string }>;
  events: Array<{ id: string; from_value: string | null; to_value: string | null }>;
};

export function ContactDetailPanel({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function load() {
    setDetail(await adminFetch<Detail>(`/api/v1/admin/contacts/${id}`));
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, [id]);

  if (error) {
    return <p role="alert">{error}</p>;
  }
  if (!detail) {
    return <p>Loading inquiry…</p>;
  }

  const next = CONTACT_TRANSITIONS[detail.contact.status as ContactStatus] ?? [];

  return (
    <article className="card">
      <p>
        <span className={`badge badge--${detail.contact.status}`}>{detail.contact.status}</span> ·{" "}
        {detail.contact.inquiryType}
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
              body: JSON.stringify({ status }),
            })
              .then(() => load())
              .catch((err: Error) => setError(err.message));
          }}
        >
          Mark {status}
        </button>
      ))}
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          void adminFetch(`/api/v1/admin/contacts/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ body: note }),
          })
            .then(() => {
              setNote("");
              return load();
            })
            .catch((err: Error) => setError(err.message));
        }}
      >
        <label htmlFor="contact-note">Internal note</label>
        <textarea
          id="contact-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <button type="submit" className="btn btn--secondary">
          Save note
        </button>
      </form>
      <ul>
        {detail.notes.map((item) => (
          <li key={item.id}>
            {item.body} <span className="muted">{formatWhen(item.created_at)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
