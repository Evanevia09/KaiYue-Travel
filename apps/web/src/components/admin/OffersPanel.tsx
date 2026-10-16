import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./api.ts";

type OfferPhoto = {
  id: string;
  isMain: boolean;
  contentType: string;
};

type AdminOffer = {
  id: string;
  status: "draft" | "published";
  title: string;
  description: string;
  priceFrom: number | null;
  terms: string | null;
  complete: boolean;
  updatedAt: string;
  photos: OfferPhoto[];
};

type FormState = {
  title: string;
  description: string;
  priceFrom: string;
  terms: string;
};

const emptyForm: FormState = { title: "", description: "", priceFrom: "", terms: "" };

function photoUrl(offerId: string, photoId: string): string {
  return `/api/admin/offers/${offerId}/photos/${photoId}`;
}

export function OffersPanel() {
  const [items, setItems] = useState<AdminOffer[]>([]);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [modal, setModal] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);

  async function load() {
    const result = await adminFetch<{ items: AdminOffer[] }>("/api/admin/offers");
    setItems(result.items);
  }

  useEffect(() => {
    void load().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    if (!modal && dialog.open) dialog.close();
  }, [modal]);

  useEffect(() => {
    const dialog = confirmRef.current;
    if (!dialog) return;
    if (confirmId && !dialog.open) dialog.showModal();
    if (!confirmId && dialog.open) dialog.close();
  }, [confirmId]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModal(true);
  }

  function openEdit(offer: AdminOffer) {
    setEditing(offer);
    setForm({
      title: offer.title,
      description: offer.description,
      priceFrom: offer.priceFrom == null ? "" : String(offer.priceFrom),
      terms: offer.terms ?? "",
    });
    setError("");
    setModal(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title,
        description: form.description,
        priceFrom: form.priceFrom.trim() === "" ? undefined : Number(form.priceFrom),
        terms: form.terms,
      };
      const saved = editing
        ? await adminFetch<{ item: AdminOffer }>(`/api/admin/offers/${editing.id}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await adminFetch<{ item: AdminOffer }>("/api/admin/offers", {
            method: "POST",
            body: JSON.stringify(body),
          });
      setEditing(saved.item);
      setNotice(editing ? "Offer updated." : "Draft offer created.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!editing || !files?.length) return;
    setSaving(true);
    setError("");
    try {
      for (const file of files) {
        const data = new FormData();
        data.append("photo", file);
        const saved = await fetch(`/api/admin/offers/${editing.id}/photos`, {
          method: "POST",
          body: data,
        });
        const body = (await saved.json()) as { item?: AdminOffer; error?: { message?: string } };
        if (!saved.ok) throw new Error(body.error?.message ?? "Photo upload failed.");
        setEditing(body.item!);
      }
      await load();
      setNotice("Photos uploaded.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function setMain(photoId: string) {
    if (!editing) return;
    const saved = await adminFetch<{ item: AdminOffer }>(
      `/api/admin/offers/${editing.id}/photos/${photoId}/main`,
      { method: "POST", body: JSON.stringify({}) },
    );
    setEditing(saved.item);
    await load();
  }

  async function removePhoto(photoId: string) {
    if (!editing) return;
    const saved = await adminFetch<{ item: AdminOffer }>(
      `/api/admin/offers/${editing.id}/photos/${photoId}`,
      { method: "DELETE" },
    );
    setEditing(saved.item);
    await load();
  }

  async function setStatus(id: string, next: "published" | "draft") {
    setError("");
    try {
      await adminFetch(
        `/api/admin/offers/${id}/${next === "published" ? "publish" : "unpublish"}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      await load();
      setNotice(next === "published" ? "Offer published." : "Offer unpublished.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(id: string) {
    setError("");
    try {
      await adminFetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      setConfirmId(null);
      if (editing?.id === id) {
        setModal(false);
        setEditing(null);
      }
      await load();
      setNotice("Offer deleted.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="admin-inventory">
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <h2>Special Offers</h2>
          <p className="muted">
            Drafts stay private. Publish only when the title, description, and a main photo are
            ready. Leave terms empty unless they are supplied.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>
          + New offer
        </button>
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
      <section className="admin-card admin-table-card">
        {items.length === 0 ? (
          <p className="muted">No offers yet. Create a draft to get started.</p>
        ) : (
          <table className="admin-bookings-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Price from</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.complete ? "Ready to publish" : "Incomplete"}</small>
                  </td>
                  <td>
                    <span className={`badge badge--${item.status}`}>{item.status}</span>
                  </td>
                  <td>{item.priceFrom == null ? "Hidden" : item.priceFrom}</td>
                  <td>{new Date(item.updatedAt).toLocaleString("en-GB")}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-inline-link"
                      onClick={() => openEdit(item)}
                    >
                      Edit
                    </button>{" "}
                    {item.status === "published" ? (
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, "draft")}
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, "published")}
                      >
                        Publish
                      </button>
                    )}{" "}
                    <button
                      type="button"
                      className="admin-inline-link"
                      onClick={() => setConfirmId(item.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className="admin-editor-dialog admin-editor-dialog--wide"
        aria-labelledby="offer-editor-title"
        onClose={() => setModal(false)}
      >
        <section className="admin-editor-dialog__content">
          <div className="admin-card__heading">
            <div>
              <p className="admin-eyebrow">{editing ? "Edit offer" : "New draft"}</p>
              <h2 id="offer-editor-title">{editing ? editing.title : "Create special offer"}</h2>
            </div>
            <button
              type="button"
              className="admin-editor-dialog__close"
              aria-label="Close"
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          <form className="admin-resource-form" onSubmit={(event) => void save(event)}>
            <label className="field field--full">
              Title
              <input
                value={form.title}
                maxLength={120}
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label className="field field--full">
              Description
              <textarea
                value={form.description}
                maxLength={2000}
                rows={5}
                required
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label className="field">
              Price from (optional)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.priceFrom}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priceFrom: event.target.value }))
                }
              />
            </label>
            <label className="field field--full">
              Terms (optional — leave empty unless supplied)
              <textarea
                value={form.terms}
                maxLength={4000}
                rows={4}
                onChange={(event) =>
                  setForm((current) => ({ ...current, terms: event.target.value }))
                }
              />
            </label>
            <button className="btn btn--primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create draft"}
            </button>
          </form>
          {editing && (
            <div className="admin-offer-photos">
              <h3>Photos</h3>
              <p className="muted">JPEG, PNG, or WebP. 5 MB each. Choose one main photo.</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => void uploadPhotos(event.target.files)}
              />
              <ul className="admin-offer-photo-list">
                {editing.photos.map((photo) => (
                  <li key={photo.id}>
                    <img src={photoUrl(editing.id, photo.id)} alt="" width="120" height="80" />
                    <label>
                      <input
                        type="radio"
                        name="main-photo"
                        checked={photo.isMain}
                        onChange={() => void setMain(photo.id)}
                      />{" "}
                      Main photo
                    </label>
                    <button type="button" onClick={() => void removePhoto(photo.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </dialog>

      <dialog
        ref={confirmRef}
        className="admin-editor-dialog"
        aria-labelledby="offer-delete-title"
        onClose={() => setConfirmId(null)}
      >
        <section className="admin-editor-dialog__content">
          <h2 id="offer-delete-title">Delete this offer?</h2>
          <p>This removes the offer and its stored photos. This cannot be undone.</p>
          <div className="admin-topbar__actions">
            <button type="button" className="btn btn--secondary" onClick={() => setConfirmId(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => confirmId && void remove(confirmId)}
            >
              Delete offer
            </button>
          </div>
        </section>
      </dialog>
    </div>
  );
}
