import { useEffect, useRef, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
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
  locale: AdminLocale,
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
          error?: { code?: string; message?: string };
        };
        if (xhr.status >= 200 && xhr.status < 300 && body.item) {
          resolve(body.item);
          return;
        }
        reject(
          new Error(
            localizeCaughtError(
              body.error ?? { message: t(locale, "offers.uploadFailed") },
              locale,
            ),
          ),
        );
      } catch {
        reject(new Error(t(locale, "offers.uploadFailed")));
      }
    };
    xhr.onerror = () => reject(new Error(t(locale, "offers.uploadFailed")));
    xhr.send(data);
  });
}

export function OffersPanel({
  locale,
  initialItems = null,
}: {
  locale: AdminLocale;
  initialItems?: AdminOffer[] | null;
}) {
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
    const result = await adminFetch<{ items: AdminOffer[] }>("/api/admin/offers", { locale });
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
      setError(localizeCaughtError(err, locale));
      setLoading(false);
    });
  }, [initialItems, locale]);

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
        locale,
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
      setNotice(t(locale, editing ? "offers.updated" : "offers.created"));
    } catch (err) {
      setError(localizeCaughtError(err, locale));
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
        latest = await uploadWithProgress(
          `/api/admin/offers/${offerId}/photos`,
          data,
          locale,
          (percent) =>
            setUpload({ index: index + 1, total: files.length, phase: "uploading", percent }),
        );
        applyOffer(latest);
      }
      setNotice(t(locale, files.length === 1 ? "offers.photoUploaded" : "offers.photosUploaded"));
    } catch (err) {
      setError(localizeCaughtError(err, locale));
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
        { method: "POST", body: JSON.stringify({}), locale },
      );
      applyOffer(saved.item);
    } catch (err) {
      applyOffer(snapshot);
      setError(localizeCaughtError(err, locale));
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
        { method: "DELETE", locale },
      );
      applyOffer(saved.item);
    } catch (err) {
      applyOffer(snapshot);
      setError(localizeCaughtError(err, locale));
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
          locale,
        },
      );
      applyOffer(saved.item);
      setNotice(t(locale, next === "published" ? "offers.published" : "offers.unpublished"));
    } catch (err) {
      if (current) applyOffer(current);
      setError(localizeCaughtError(err, locale));
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
      await adminFetch(`/api/admin/offers/${id}`, { method: "DELETE", locale });
      setNotice(t(locale, "offers.deleted"));
    } catch (err) {
      setItems(snapshot);
      setError(localizeCaughtError(err, locale));
    } finally {
      setBusy(null);
    }
  }

  const locked = Boolean(busy);

  return (
    <div className="admin-inventory" aria-busy={locked || loading}>
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">{t(locale, "offers.eyebrow")}</p>
          <h2>{t(locale, "offers.heading")}</h2>
          <p className="muted">{t(locale, "offers.lead")}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate} disabled={locked}>
          {t(locale, "offers.new")}
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
            ? upload.phase === "optimising"
              ? t(locale, "offers.optimising", { index: upload.index, total: upload.total })
              : t(locale, "offers.uploading", {
                  index: upload.index,
                  total: upload.total,
                  percent: upload.percent,
                })
            : `${t(locale, "offers.working")} ${
                busy.startsWith("publish:")
                  ? t(locale, "offers.publishingStatus")
                  : busy.startsWith("unpublish:")
                    ? t(locale, "offers.unpublishingStatus")
                    : t(locale, "offers.wait")
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
          aria-label={t(locale, "offers.uploadProgress")}
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
          <p className="muted">{t(locale, "offers.loading")}</p>
        ) : items.length === 0 ? (
          <p className="muted">{t(locale, "offers.empty")}</p>
        ) : (
          <table className="admin-bookings-table">
            <thead>
              <tr>
                <th>{t(locale, "offers.colTitle")}</th>
                <th>{t(locale, "offers.colStatus")}</th>
                <th>{t(locale, "offers.colPrice")}</th>
                <th>{t(locale, "offers.colUpdated")}</th>
                <th>{t(locale, "offers.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const action = offerStatusControl(busy, item.id, item.status);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.title}</strong>
                      <small>
                        {item.complete ? t(locale, "offers.ready") : t(locale, "offers.incomplete")}
                      </small>
                    </td>
                    <td>
                      <span className={`badge badge--${item.status}`}>
                        {prefixedLabel(locale, "status", item.status)}
                      </span>
                    </td>
                    <td>{item.priceFrom == null ? t(locale, "offers.hidden") : item.priceFrom}</td>
                    <td>{formatWhen(item.updatedAt, locale)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => openEdit(item)}
                        disabled={locked}
                      >
                        {t(locale, "offers.edit")}
                      </button>{" "}
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => void setStatus(item.id, action.next)}
                        disabled={locked}
                      >
                        {t(locale, action.labelKey)}
                      </button>{" "}
                      <button
                        type="button"
                        className="admin-inline-link"
                        onClick={() => setConfirmId(item.id)}
                        disabled={locked}
                      >
                        {t(locale, "offers.delete")}
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
              <p className="admin-eyebrow">
                {editing ? t(locale, "offers.editOffer") : t(locale, "offers.newDraft")}
              </p>
              <h2 id="offer-editor-title">
                {editing ? editing.title : t(locale, "offers.create")}
              </h2>
            </div>
            <button
              type="button"
              className="admin-editor-dialog__close"
              aria-label={t(locale, "offers.close")}
              onClick={() => dialogRef.current?.close()}
              disabled={locked}
            >
              ×
            </button>
          </div>
          <form className="admin-resource-form" onSubmit={(event) => void save(event)}>
            <label className="field field--full">
              {t(locale, "offers.title")}
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
              {t(locale, "offers.description")}
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
              {t(locale, "offers.priceFrom")}
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
              {t(locale, "offers.terms")}
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
              {busy === "save"
                ? t(locale, "offers.saving")
                : editing
                  ? t(locale, "offers.save")
                  : t(locale, "offers.createDraft")}
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
              <h3>{t(locale, "offers.photos")}</h3>
              <p className="muted">{t(locale, "offers.photosHelp")}</p>
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
                      {t(locale, "offers.mainPhoto")}
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => void removePhoto(photo.id)}
                    >
                      {busy === `photo:${photo.id}`
                        ? t(locale, "offers.removing")
                        : t(locale, "offers.remove")}
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
          <h2 id="offer-delete-title">{t(locale, "offers.deleteTitle")}</h2>
          <p>{t(locale, "offers.deleteHelp")}</p>
          <div className="admin-topbar__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setConfirmId(null)}
              disabled={locked}
            >
              {t(locale, "offers.cancel")}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={locked}
              onClick={() => confirmId && void remove(confirmId)}
            >
              {busy?.startsWith("delete:")
                ? t(locale, "offers.deleting")
                : t(locale, "offers.deleteOffer")}
            </button>
          </div>
        </section>
      </dialog>
    </div>
  );
}
