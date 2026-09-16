import { useEffect, useState } from "react";
import { adminFetch, formatWhen, type AdminContact } from "./api.ts";

export function ContactsPanel({ initialStatus = "" }: { initialStatus?: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [items, setItems] = useState<AdminContact[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    void adminFetch<{ items: AdminContact[] }>(`/api/v1/admin/contacts${query}`)
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
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {items === null ? <p>Loading inquiries…</p> : null}
      {items?.length === 0 ? <p>No inquiries match these filters.</p> : null}
      <ul>
        {items?.map((item) => (
          <li key={item.id}>
            <a href={`/admin/contacts/${item.id}`}>{item.reference}</a> · {item.inquiryType} ·{" "}
            {item.name}
            {item.company ? ` / ${item.company}` : ""} · {formatWhen(item.createdAt)} ·{" "}
            {item.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
