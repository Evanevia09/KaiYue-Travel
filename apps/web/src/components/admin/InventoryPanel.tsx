import { useEffect, useRef, useState } from "react";
import { localizeCaughtError, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, type AdminDriver, type AdminVehicle } from "./api.ts";

export function InventoryPanel({ locale }: { locale: AdminLocale }) {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [tab, setTab] = useState<"drivers" | "vehicles">("drivers");
  const [editing, setEditing] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [driverResult, vehicleResult] = await Promise.all([
      adminFetch<{ items: AdminDriver[] }>("/api/v1/admin/drivers", { locale }),
      adminFetch<{ items: AdminVehicle[] }>("/api/v1/admin/vehicles", { locale }),
    ]);
    setDrivers(driverResult.items);
    setVehicles(vehicleResult.items);
  }
  useEffect(() => {
    void load().catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [locale]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal && !dialog.open) dialog.showModal();
    if (!modal && dialog.open) dialog.close();
  }, [modal]);

  function openEditor(id: string | null) {
    setEditing(id);
    setError("");
    setNotice("");
    setModal(true);
  }

  const selectedDriver = drivers.find((item) => item.id === editing);
  const selectedVehicle = vehicles.find((item) => item.id === editing);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isDriver = tab === "drivers";
    const body = isDriver
      ? {
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          notes: form.get("notes"),
          active: form.get("active") === "on",
        }
      : {
          plateNumber: form.get("plateNumber"),
          makeModel: form.get("makeModel"),
          passengerCapacity: Number(form.get("passengerCapacity")),
          contactName: form.get("contactName"),
          contactPhone: form.get("contactPhone"),
          notes: form.get("notes"),
          active: form.get("active") === "on",
        };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminFetch(
        `/api/v1/admin/${isDriver ? "drivers" : "vehicles"}${editing ? `/${editing}` : ""}`,
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body), locale },
      );
      await load();
      setModal(false);
      setEditing(null);
      setNotice(t(locale, isDriver ? "inv.driverSaved" : "inv.vehicleSaved"));
    } catch (err) {
      setError(localizeCaughtError(err, locale));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-inventory">
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">{t(locale, "inv.eyebrow")}</p>
          <h2>{t(locale, "inv.heading")}</h2>
          <p className="muted">{t(locale, "inv.lead")}</p>
        </div>
      </div>
      <div className="admin-tabs" role="tablist" aria-label={t(locale, "inv.tabAria")}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "drivers"}
          onClick={() => {
            setTab("drivers");
            setEditing(null);
            setModal(false);
          }}
        >
          {t(locale, "inv.drivers")} <span>{drivers.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "vehicles"}
          onClick={() => {
            setTab("vehicles");
            setEditing(null);
            setModal(false);
          }}
        >
          {t(locale, "inv.vehicles")} <span>{vehicles.length}</span>
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
      <div className="admin-inventory-grid admin-inventory-grid--single">
        <section className="admin-card">
          <div className="admin-card__heading">
            <h2>{tab === "drivers" ? t(locale, "inv.roster") : t(locale, "inv.fleet")}</h2>
            <button type="button" className="btn btn--primary" onClick={() => openEditor(null)}>
              {tab === "drivers" ? t(locale, "inv.addDriver") : t(locale, "inv.addVehicle")}
            </button>
          </div>
          <div className="admin-resource-list">
            {tab === "drivers"
              ? drivers.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="admin-resource"
                    onClick={() => openEditor(item.id)}
                    aria-label={t(locale, "inv.editDriverAria", { name: item.name })}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.phone}
                        {item.email ? ` · ${item.email}` : ""}
                      </small>
                    </span>
                    <span className={item.active ? "admin-active" : "admin-inactive"}>
                      {item.active ? t(locale, "inv.active") : t(locale, "inv.inactive")}
                    </span>
                  </button>
                ))
              : vehicles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="admin-resource"
                    onClick={() => openEditor(item.id)}
                    aria-label={t(locale, "inv.editVehicleAria", { plate: item.plateNumber })}
                  >
                    <span>
                      <strong>
                        {item.plateNumber} · {item.makeModel}
                      </strong>
                      <small>
                        {t(locale, "inv.passengers", { count: item.passengerCapacity })}
                        {item.contactName ? ` · ${item.contactName}` : ""}
                        {item.contactPhone ? ` · ${item.contactPhone}` : ""}
                      </small>
                    </span>
                    <span className={item.active ? "admin-active" : "admin-inactive"}>
                      {item.active ? t(locale, "inv.active") : t(locale, "inv.inactive")}
                    </span>
                  </button>
                ))}
            {(tab === "drivers" ? drivers : vehicles).length === 0 && (
              <p className="muted">
                {tab === "drivers" ? t(locale, "inv.emptyDriver") : t(locale, "inv.emptyVehicle")}
              </p>
            )}
          </div>
        </section>
      </div>
      <dialog
        ref={dialogRef}
        className="admin-editor-dialog"
        aria-labelledby="admin-editor-title"
        onClose={() => setModal(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <section className="admin-editor-dialog__content">
          <div className="admin-card__heading">
            <div>
              <p className="admin-eyebrow">
                {editing ? t(locale, "inv.editRecord") : t(locale, "inv.newRecord")}
              </p>
              <h2 id="admin-editor-title">
                {tab === "drivers"
                  ? editing
                    ? t(locale, "inv.editDriver")
                    : t(locale, "inv.addDriverTitle")
                  : editing
                    ? t(locale, "inv.editVehicle")
                    : t(locale, "inv.addVehicleTitle")}
              </h2>
            </div>
            <button
              type="button"
              className="admin-editor-dialog__close"
              aria-label={t(locale, "inv.close")}
              onClick={() => dialogRef.current?.close()}
            >
              ×
            </button>
          </div>
          {error && (
            <p role="alert" className="admin-feedback admin-feedback--error">
              {error}
            </p>
          )}
          <form
            key={`${tab}-${editing ?? "new"}`}
            className="admin-resource-form"
            onSubmit={(event) => void submit(event)}
          >
            {tab === "drivers" ? (
              <>
                <label className="field">
                  {t(locale, "inv.name")}
                  <input name="name" defaultValue={selectedDriver?.name ?? ""} required />
                </label>
                <label className="field">
                  {t(locale, "inv.phone")}
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={selectedDriver?.phone ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "inv.email")}
                  <input name="email" type="email" defaultValue={selectedDriver?.email ?? ""} />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  {t(locale, "inv.plate")}
                  <input
                    name="plateNumber"
                    defaultValue={selectedVehicle?.plateNumber ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "inv.makeModel")}
                  <input
                    name="makeModel"
                    defaultValue={selectedVehicle?.makeModel ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "inv.capacity")}
                  <input
                    name="passengerCapacity"
                    type="number"
                    min="1"
                    max="14"
                    defaultValue={selectedVehicle?.passengerCapacity ?? 4}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "inv.partner")}
                  <input name="contactName" defaultValue={selectedVehicle?.contactName ?? ""} />
                </label>
                <label className="field">
                  {t(locale, "inv.contactPhone")}
                  <input
                    name="contactPhone"
                    type="tel"
                    defaultValue={selectedVehicle?.contactPhone ?? ""}
                  />
                </label>
              </>
            )}
            <label className="field field--full">
              {t(locale, "inv.notes")}
              <textarea
                name="notes"
                defaultValue={
                  (tab === "drivers" ? selectedDriver?.notes : selectedVehicle?.notes) ?? ""
                }
                rows={3}
              />
            </label>
            <label className="admin-checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={
                  (tab === "drivers" ? selectedDriver?.active : selectedVehicle?.active) ?? true
                }
              />{" "}
              {t(locale, "inv.available")}
            </label>
            <button className="btn btn--primary" disabled={saving}>
              {saving
                ? t(locale, "inv.saving")
                : editing
                  ? t(locale, "inv.save")
                  : tab === "drivers"
                    ? t(locale, "inv.addDriverBtn")
                    : t(locale, "inv.addVehicleBtn")}
            </button>
          </form>
        </section>
      </dialog>
    </div>
  );
}
