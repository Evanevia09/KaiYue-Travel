import { useEffect, useRef, useState } from "react";
import { optimizeOfferPhoto } from "../../lib/offer-image.ts";
import { adminFetch, formatWhen } from "./api.ts";
import {
  editorAfterWrite,
  filesFromDataTransfer,
  offerSaveTarget,
  offerStatusBusyKey,
  offerStatusControl,
  takeInputFiles,
  withMainPhoto,
  withOfferStatus,
  withoutPhoto,
} from "./offer-editor.ts";

export type OfferPhoto = {
  id: string;
  isMain: boolean;
  contentType: string;
  url?: string;
  thumbUrl?: string;
  width?: number | null;
  height?: number | null;
};

export type AdminOffer = {
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

type UploadState = {
  index: number;
  total: number;
  phase: "optimising" | "uploading";
  percent: number;
};

const emptyForm: FormState = { title: "", description: "", priceFrom: "", terms: "" };

function photoSrc(offerId: string, photo: OfferPhoto): string {
  return photo.thumbUrl || photo.url || `/api/admin/offers/${offerId}/photos/${photo.id}`;
}

function uploadWithProgress(
  url: string,
  data: FormData,
  onProgress: (percent: number) => void,
): Promise<AdminOffer> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as {
          item?: AdminOffer;
          error?: { message?: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.item) {
          resolve(body.item);
          return;
        }
        reject(new Error(body.error?.message ?? "Photo upload failed."));
      } catch {
        reject(new Error("Photo upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Photo upload failed."));
    xhr.send(data);
  });
}

export function OffersPanel({ initialItems = null }: { initialItems?: AdminOffer[] | null }) {
  const [items, setItems] = useState<AdminOffer[]>(initialItems ?? []);
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [modal, setModal] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(initialItems == null);
  const [busy, setBusy] = useState<string | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
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
    if (initialItems != null) {
      setLoading(false);
      return;
    }
    void load().catch((err: Error) => {
      setError(err.message);
      setLoading(false);
    });
  }, [initialItems]);

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

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

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

  async function uploadPhotos(files: File[]) {
    if (!editing || files.length === 0 || busy) return;
    setBusy("photos");
    setError("");
    const offerId = editing.id;
    try {
      let latest = editing;
      for (const [index, file] of files.entries()) {
        setUpload({ index: index + 1, total: files.length, phase: "optimising", percent: 0 });
        const optimized = await optimizeOfferPhoto(file);
        const data = new FormData();
        data.append("photo", optimized.display.file, optimized.display.file.name);
        data.append("thumbnail", optimized.thumbnail.file, optimized.thumbnail.file.name);
        data.append("width", String(optimized.display.width));
        data.append("height", String(optimized.display.height));
        setUpload({ index: index + 1, total: files.length, phase: "uploading", percent: 0 });
        latest = await uploadWithProgress(`/api/admin/offers/${offerId}/photos`, data, (percent) =>
          setUpload({ index: index + 1, total: files.length, phase: "uploading", percent }),
        );
        applyOffer(latest);
      }
      setNotice(files.length === 1 ? "Photo uploaded." : "Photos uploaded.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
      setUpload(null);
    }
  }

  async function setMain(photoId: string) {
    if (!editing || busy) return;
    const snapshot = editing;
    applyOffer(withMainPhoto(editing, photoId));
    setBusy(`main:${photoId}`);
    setError("");
    try {
      const saved = await adminFetch<{ item: AdminOffer }>(
        `/api/admin/offers/${editing.id}/photos/${photoId}/main`,
        { method: "POST", body: JSON.stringify({}) },
      );
      applyOffer(saved.item);
    } catch (err) {
      applyOffer(snapshot);
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removePhoto(photoId: string) {
    if (!editing || busy) return;
    const snapshot = editing;
    applyOffer(withoutPhoto(editing, photoId));
    setBusy(`photo:${photoId}`);
    setError("");
    try {
      const saved = await adminFetch<{ item: AdminOffer }>(
        `/api/admin/offers/${editing.id}/photos/${photoId}`,
        { method: "DELETE" },
      );
      applyOffer(saved.item);
    } catch (err) {
      applyOffer(snapshot);
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(id: string, next: "published" | "draft") {
    if (busy) return;
    const current = items.find((item) => item.id === id);
    if (current) applyOffer(withOfferStatus(current, next));
    setBusy(offerStatusBusyKey(id, next));
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
      if (current) applyOffer(current);
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    const snapshot = items;
    setBusy(`delete:${id}`);
    setError("");
    setItems((current) => current.filter((item) => item.id !== id));
    setConfirmId(null);
    if (editing?.id === id) {
      setModal(false);
      setEditing(null);
    }
    try {
      await adminFetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      setNotice("Offer deleted.");
    } catch (err) {
      setItems(snapshot);
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
          {upload
            ? `${upload.phase === "optimising" ? "Optimising" : "Uploading"} photo ${upload.index} of ${upload.total}${
                upload.phase === "uploading" ? ` (${upload.percent}%)` : "…"
              }`
            : `Working… ${
                busy.startsWith("publish:")
                  ? "Publishing this offer."
                  : busy.startsWith("unpublish:")
                    ? "Unpublishing this offer."
                    : "Please wait."
              }`}
        </p>
      )}
      {upload && (
        <div
          className="admin-upload-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={upload.phase === "uploading" ? upload.percent : 0}
          aria-label="Photo upload progress"
        >
          <span
            style={{
              width: `${upload.phase === "uploading" ? Math.max(upload.percent, 8) : 12}%`,
            }}
          />
        </div>
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
              {items.map((item) => {
                const action = offerStatusControl(busy, item.id, item.status);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small>{item.complete ? "Ready to publish" : "Incomplete"}</small>
                    </td>
                    <td>
                      <span className={`badge badge--${item.status}`}>{item.status}</span>
                    </td>
                    <td>{item.priceFrom == null ? "Hidden" : item.priceFrom}</td>
                    <td>{formatWhen(item.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => openEdit(item)}
                        disabled={locked}
                      >
                        Edit
                      </button>{" "}
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, action.next)}
                        disabled={locked}
                      >
                        {action.label}
                      </button>{" "}
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
                );
              })}
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
            <div
              className="admin-offer-photos"
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (locked) return;
                void uploadPhotos(filesFromDataTransfer(event.dataTransfer));
              }}
            >
              <h3>Photos</h3>
              <p className="muted">
                JPEG, PNG, or WebP. Phone photos up to 25 MB are resized to 1600px before upload.
                The resized file must stay under 5 MB. Drop files here or choose them. Choose one
                main photo.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={locked}
                onChange={(event) => {
                  void uploadPhotos(takeInputFiles(event.currentTarget));
                }}
              />
              <ul className="admin-offer-photo-list">
                {editing.photos.map((photo) => (
                  <li key={photo.id}>
                    <img
                      src={photoSrc(editing.id, photo)}
                      alt=""
                      width={photo.width ?? 120}
                      height={photo.height ?? 80}
                      loading="lazy"
                    />
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
