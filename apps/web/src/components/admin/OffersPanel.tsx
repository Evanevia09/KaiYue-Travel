import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./api.ts";
import { editorAfterWrite, offerSaveTarget } from "./offer-editor.ts";

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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const loadSeq = useRef(0);

  async function load() {
    const seq = ++loadSeq.current;
    const result = await adminFetch<{ items: AdminOffer[] }>("/api/admin/offers");
    if (seq !== loadSeq.current) return;
    setItems(result.items);
    setLoading(false);
  }

  function applyOffer(offer: AdminOffer) {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === offer.id);
      if (index === -1) return [offer, ...current];
      const next = [...current];
      next[index] = offer;
      return next;
    });
    setEditing((current) => (current?.id === offer.id ? offer : current));
  }

  useEffect(() => {
    void load().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
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

  async function save(event: { preventDefault(): void }) {
    event.preventDefault();
    if (busy) return;
    setBusy("save");
    setError("");
    try {
      const body = {
        title: form.title,
        description: form.description,
        priceFrom: form.priceFrom.trim() === "" ? undefined : Number(form.priceFrom),
        terms: form.terms,
      };
      const target = offerSaveTarget(editing?.id ?? null);
      const saved = await adminFetch<{ item: AdminOffer }>(target.path, {
        method: target.method,
        body: JSON.stringify(body),
      });
      const item = editorAfterWrite(saved.item);
      applyOffer(item);
      setEditing(item);
      setForm({
        title: item.title,
        description: item.description,
        priceFrom: item.priceFrom == null ? "" : String(item.priceFrom),
        terms: item.terms ?? "",
      });
      setNotice(editing ? "Offer updated." : "Draft offer created.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!editing || !files?.length || busy) return;
    setBusy("photos");
    setError("");
    try {
      let latest = editing;
      for (const file of files) {
        const data = new FormData();
        data.append("photo", file);
        const saved = await fetch(`/api/admin/offers/${editing.id}/photos`, {
          method: "POST",
          body: data,
        });
        const body = (await saved.json()) as { item?: AdminOffer; error?: { message?: string } };
        if (!saved.ok) throw new Error(body.error?.message ?? "Photo upload failed.");
        latest = body.item!;
        applyOffer(latest);
      }
      setNotice("Photos uploaded.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setMain(photoId: string) {
    if (!editing || busy) return;
    setBusy(`main:${photoId}`);
    setError("");
    try {
      const saved = await adminFetch<{ item: AdminOffer }>(
        `/api/admin/offers/${editing.id}/photos/${photoId}/main`,
        { method: "POST", body: JSON.stringify({}) },
      );
      applyOffer(saved.item);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removePhoto(photoId: string) {
    if (!editing || busy) return;
    setBusy(`photo:${photoId}`);
    setError("");
    try {
      const saved = await adminFetch<{ item: AdminOffer }>(
        `/api/admin/offers/${editing.id}/photos/${photoId}`,
        { method: "DELETE" },
      );
      applyOffer(saved.item);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, next: "published" | "draft") {
    if (busy) return;
    setBusy(`status:${id}`);
    setError("");
    try {
      const saved = await adminFetch<{ item: AdminOffer }>(
        `/api/admin/offers/${id}/${next === "published" ? "publish" : "unpublish"}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      applyOffer(saved.item);
      setNotice(next === "published" ? "Offer published." : "Offer unpublished.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(`delete:${id}`);
    setError("");
    try {
      await adminFetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      setConfirmId(null);
      setItems((current) => current.filter((item) => item.id !== id));
      if (editing?.id === id) {
        setModal(false);
        setEditing(null);
      }
      setNotice("Offer deleted.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const locked = Boolean(busy);

  return (
    <div className="admin-inventory" aria-busy={locked || loading}>
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">Catalogue</p>
          <h2>Special Offers</h2>
          <p className="muted">
            Drafts stay private. Publish only when the title, description, and a main photo are
            ready. Leave terms empty unless they are supplied.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate} disabled={locked}>
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
      {busy && (
        <p role="status" className="admin-feedback">
          Working… {busy.startsWith("status:") ? "Updating publication status." : "Please wait."}
        </p>
      )}
      <section className="admin-card admin-table-card">
        {loading ? (
          <p className="muted">Loading offers…</p>
        ) : items.length === 0 ? (
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
                      disabled={locked}
                    >
                      Edit
                    </button>{" "}
                    {item.status === "published" ? (
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, "draft")}
                        disabled={locked}
                      >
                        {busy === `status:${item.id}` ? "Unpublishing…" : "Unpublish"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, "published")}
                        disabled={locked}
                      >
                        {busy === `status:${item.id}` ? "Publishing…" : "Publish"}
                      </button>
                    )}{" "}
                    <button
                      type="button"
                      className="admin-inline-link"
                      onClick={() => setConfirmId(item.id)}
                      disabled={locked}
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
              disabled={locked}
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
                disabled={locked}
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
                disabled={locked}
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
                disabled={locked}
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
                disabled={locked}
                onChange={(event) =>
                  setForm((current) => ({ ...current, terms: event.target.value }))
                }
              />
            </label>
            <button className="btn btn--primary" disabled={locked}>
              {busy === "save" ? "Saving…" : editing ? "Save changes" : "Create draft"}
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
                disabled={locked}
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
                        disabled={locked}
                        onChange={() => void setMain(photo.id)}
                      />{" "}
                      Main photo
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void removePhoto(photo.id)}
                    >
                      {busy === `photo:${photo.id}` ? "Removing…" : "Remove"}
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
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setConfirmId(null)}
              disabled={locked}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={locked}
              onClick={() => confirmId && void remove(confirmId)}
            >
              {busy?.startsWith("delete:") ? "Deleting…" : "Delete offer"}
            </button>
          </div>
        </section>
      </dialog>
    </div>
  );
}
