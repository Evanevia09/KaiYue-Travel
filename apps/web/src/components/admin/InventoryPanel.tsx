import { useEffect, useRef, useState } from "react";
import { adminFetch, type AdminDriver, type AdminVehicle } from "./api.ts";

export function InventoryPanel() {
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
      adminFetch<{ items: AdminDriver[] }>("/api/v1/admin/drivers"),
      adminFetch<{ items: AdminVehicle[] }>("/api/v1/admin/vehicles"),
    ]);
    setDrivers(driverResult.items);
    setVehicles(vehicleResult.items);
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
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      await load();
      setModal(false);
      setEditing(null);
      setNotice(`${isDriver ? "Driver" : "Vehicle"} saved.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-inventory">
      <div className="admin-list-toolbar">
        <div>
          <p className="admin-eyebrow">Dispatch resources</p>
          <h2>Drivers & vehicles</h2>
          <p className="muted">
            Manage contacts and availability. Nothing is assigned automatically.
          </p>
        </div>
      </div>
      <div className="admin-tabs" role="tablist" aria-label="Inventory type">
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
          Drivers <span>{drivers.length}</span>
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
          Vehicles <span>{vehicles.length}</span>
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
            <h2>{tab === "drivers" ? "Driver roster" : "Vehicle inventory"}</h2>
            <button type="button" className="btn btn--primary" onClick={() => openEditor(null)}>
              + Add {tab === "drivers" ? "driver" : "vehicle"}
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
                    aria-label={`Edit driver ${item.name}`}
                  >
                    <span>
                      <strong>{item.name}</strong>
                      <small>
                        {item.phone}
                        {item.email ? ` · ${item.email}` : ""}
                      </small>
                    </span>
                    <span className={item.active ? "admin-active" : "admin-inactive"}>
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </button>
                ))
              : vehicles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="admin-resource"
                    onClick={() => openEditor(item.id)}
                    aria-label={`Edit vehicle ${item.plateNumber}`}
                  >
                    <span>
                      <strong>
                        {item.plateNumber} · {item.makeModel}
                      </strong>
                      <small>
                        {item.passengerCapacity} passengers
                        {item.contactName ? ` · ${item.contactName}` : ""}
                        {item.contactPhone ? ` · ${item.contactPhone}` : ""}
                      </small>
                    </span>
                    <span className={item.active ? "admin-active" : "admin-inactive"}>
                      {item.active ? "Active" : "Inactive"}
                    </span>
                  </button>
                ))}
            {(tab === "drivers" ? drivers : vehicles).length === 0 && (
              <p className="muted">
                No records yet. Add the first {tab === "drivers" ? "driver" : "vehicle"}.
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
              <p className="admin-eyebrow">{editing ? "Edit record" : "New record"}</p>
              <h2 id="admin-editor-title">
                {editing ? "Edit" : "Add"} {tab === "drivers" ? "driver" : "vehicle"}
              </h2>
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
                  Name
                  <input name="name" defaultValue={selectedDriver?.name ?? ""} required />
                </label>
                <label className="field">
                  Phone
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={selectedDriver?.phone ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  Email
                  <input name="email" type="email" defaultValue={selectedDriver?.email ?? ""} />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  Plate number
                  <input
                    name="plateNumber"
                    defaultValue={selectedVehicle?.plateNumber ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  Make & model
                  <input
                    name="makeModel"
                    defaultValue={selectedVehicle?.makeModel ?? ""}
                    required
                  />
                </label>
                <label className="field">
                  Passenger capacity
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
                  Owner / partner contact
                  <input name="contactName" defaultValue={selectedVehicle?.contactName ?? ""} />
                </label>
                <label className="field">
                  Contact phone
                  <input
                    name="contactPhone"
                    type="tel"
                    defaultValue={selectedVehicle?.contactPhone ?? ""}
                  />
                </label>
              </>
            )}
            <label className="field field--full">
              Internal remarks
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
              Available for assignment
            </label>
            <button className="btn btn--primary" disabled={saving}>
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes"
                  : `Add ${tab === "drivers" ? "driver" : "vehicle"}`}
            </button>
          </form>
        </section>
      </dialog>
    </div>
  );
}
