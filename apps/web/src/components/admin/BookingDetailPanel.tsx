import { BOOKING_TRANSITIONS, type BookingStatus } from "@kaiyue/contracts";
import { useEffect, useState } from "react";
import { localizeCaughtError, prefixedLabel, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import {
  adminFetch,
  formatWhen,
  type AdminBooking,
  type AdminDriver,
  type AdminVehicle,
} from "./api.ts";

type Detail = {
  booking: AdminBooking;
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
const macauInput = (value: string | null) =>
  value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : "";
const toIso = (value: FormDataEntryValue | null) =>
  value ? new Date(`${value}:00+08:00`).toISOString() : null;

export function BookingDetailPanel({
  reference,
  locale,
}: {
  reference: string;
  locale: AdminLocale;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  async function load() {
    const [a, b, c] = await Promise.all([
      adminFetch<Detail>(`/api/v1/admin/bookings/${reference}`, { locale }),
      adminFetch<{ items: AdminDriver[] }>("/api/v1/admin/drivers", { locale }),
      adminFetch<{ items: AdminVehicle[] }>("/api/v1/admin/vehicles", { locale }),
    ]);
    setDetail(a);
    setDrivers(b.items);
    setVehicles(c.items);
  }
  useEffect(() => {
    void load().catch((err: Error) => setError(localizeCaughtError(err, locale)));
  }, [reference, locale]);
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
  if (!detail) return <p>{error || t(locale, "detail.loading")}</p>;
  const booking = detail.booking;
  const next = BOOKING_TRANSITIONS[booking.status as BookingStatus] ?? [];
  const driver = drivers.find((item) => item.id === booking.driverId);
  const vehicle = vehicles.find((item) => item.id === booking.vehicleId);

  return (
    <div className="admin-detail-page">
      <a href="/admin/bookings" className="admin-back">
        {t(locale, "detail.back")}
      </a>
      <div className="admin-detail-heading">
        <div>
          <p className="admin-eyebrow">{t(locale, "detail.eyebrow")}</p>
          <h2>{reference}</h2>
          <p className="muted">
            {t(locale, "detail.received", {
              when: formatWhen(booking.createdAt, locale),
              channel: prefixedLabel(locale, "channel", booking.communicationChannel),
            })}
          </p>
        </div>
        <span className={`badge badge--${booking.status}`}>
          {prefixedLabel(locale, "status", booking.status)}
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
                <p className="admin-eyebrow">{t(locale, "detail.journey")}</p>
                <h2>{t(locale, "detail.heading")}</h2>
              </div>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setEditing(!editing)}
              >
                {editing ? t(locale, "detail.cancelEdit") : t(locale, "detail.edit")}
              </button>
            </div>
            {editing ? (
              <form
                key={booking.updatedAt}
                className="booking-fields admin-edit-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void action(
                    async () => {
                      await adminFetch(`/api/v1/admin/bookings/${reference}`, {
                        method: "PATCH",
                        locale,
                        body: JSON.stringify({
                          expectedUpdatedAt: booking.updatedAt,
                          pickupLocation: form.get("pickupLocation"),
                          destination: form.get("destination"),
                          pickupAt: toIso(form.get("pickupAt")),
                          returnAt: toIso(form.get("returnAt")),
                          passengerCount: Number(form.get("passengerCount")),
                          contactName: form.get("contactName"),
                          phone: form.get("phone"),
                          email: form.get("email"),
                          message: form.get("message"),
                        }),
                      });
                      setEditing(false);
                    },
                    t(locale, "detail.saved"),
                  );
                }}
              >
                <label className="field">
                  {t(locale, "detail.pickupLocation")}
                  <input name="pickupLocation" defaultValue={booking.pickupLocation} required />
                </label>
                <label className="field">
                  {t(locale, "detail.destination")}
                  <input
                    name="destination"
                    defaultValue={booking.destination ?? ""}
                    required={
                      booking.serviceType !== "hourly_charter" &&
                      booking.serviceType !== "city_tour"
                    }
                  />
                </label>
                <label className="field">
                  {t(locale, "detail.pickupMacau")}
                  <input
                    name="pickupAt"
                    type="datetime-local"
                    defaultValue={macauInput(booking.pickupAt)}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "detail.returnMacau")}
                  <input
                    name="returnAt"
                    type="datetime-local"
                    defaultValue={macauInput(booking.returnAt)}
                  />
                </label>
                <label className="field">
                  {t(locale, "detail.passengers")}
                  <input
                    name="passengerCount"
                    type="number"
                    min="1"
                    max="14"
                    defaultValue={booking.passengerCount}
                    required
                  />
                </label>
                <label className="field">
                  {t(locale, "detail.customerName")}
                  <input name="contactName" defaultValue={booking.contactName ?? ""} />
                </label>
                <label className="field">
                  {t(locale, "detail.phone")}
                  <input name="phone" type="tel" defaultValue={booking.phone ?? ""} />
                </label>
                <label className="field">
                  {t(locale, "detail.email")}
                  <input name="email" type="email" defaultValue={booking.email ?? ""} />
                </label>
                <label className="field field--full">
                  {t(locale, "detail.message")}
                  <textarea name="message" defaultValue={booking.message} rows={3} />
                </label>
                <button className="btn btn--primary" disabled={saving}>
                  {saving ? t(locale, "detail.saving") : t(locale, "detail.saveDetails")}
                </button>
              </form>
            ) : (
              <div className="admin-detail-facts">
                <div>
                  <span>{t(locale, "detail.pickup")}</span>
                  <strong>{booking.pickupLocation}</strong>
                  <small>{formatWhen(booking.pickupAt, locale)}</small>
                </div>
                <div>
                  <span>{t(locale, "detail.destination")}</span>
                  <strong>
                    {booking.destination || booking.offerTitle || t(locale, "detail.hourlyCharter")}
                  </strong>
                  {booking.returnAt && (
                    <small>
                      {t(locale, "detail.return", { when: formatWhen(booking.returnAt, locale) })}
                    </small>
                  )}
                </div>
                <div>
                  <span>{t(locale, "detail.customer")}</span>
                  <strong>{booking.contactName || t(locale, "detail.notSupplied")}</strong>
                  <small>{booking.phone || booking.email || t(locale, "detail.noContact")}</small>
                </div>
                <div>
                  <span>{t(locale, "detail.passengers")}</span>
                  <strong>{booking.passengerCount}</strong>
                  <small>
                    {booking.offerTitle
                      ? t(locale, "detail.specialOffer")
                      : prefixedLabel(locale, "service", booking.serviceType)}
                  </small>
                  {booking.offerTitle ? (
                    <small>
                      {booking.offerId
                        ? t(locale, "detail.specialOfferLineId", {
                            title: booking.offerTitle,
                            id: booking.offerId,
                          })
                        : t(locale, "detail.specialOfferLine", { title: booking.offerTitle })}
                    </small>
                  ) : null}
                  {booking.luggageCount != null || booking.handCarryCount != null ? (
                    <small>
                      {t(locale, "detail.luggage", {
                        luggage: booking.luggageCount ?? 0,
                        hand: booking.handCarryCount ?? 0,
                      })}
                    </small>
                  ) : null}
                </div>
              </div>
            )}
            {!editing && (
              <div className="admin-message">
                <span>{t(locale, "detail.customerMessage")}</span>
                <p>{booking.message || t(locale, "detail.noMessage")}</p>
              </div>
            )}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "detail.dispatch")}</p>
            <h2>{t(locale, "detail.driverVehicle")}</h2>
            <p className="muted">{t(locale, "detail.dispatchHelp")}</p>
            <p className="admin-current-assignment">
              {t(locale, "detail.current")}{" "}
              <strong>{driver?.name || t(locale, "detail.noDriver")}</strong> ·{" "}
              <strong>
                {vehicle
                  ? `${vehicle.plateNumber} · ${vehicle.makeModel}`
                  : t(locale, "detail.noVehicle")}
              </strong>
            </p>
            <form
              className="admin-assignment-form"
              key={`${booking.driverId}-${booking.vehicleId}`}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void action(
                  () =>
                    adminFetch(`/api/v1/admin/bookings/${reference}/assignment`, {
                      method: "PATCH",
                      locale,
                      body: JSON.stringify({
                        expectedUpdatedAt: booking.updatedAt,
                        driverId: form.get("driverId") || null,
                        vehicleId: form.get("vehicleId") || null,
                      }),
                    }),
                  t(locale, "detail.assignmentSaved"),
                );
              }}
            >
              <label className="field">
                {t(locale, "detail.driver")}
                <select name="driverId" defaultValue={booking.driverId ?? ""}>
                  <option value="">{t(locale, "detail.selectDriver")}</option>
                  {drivers
                    .filter((item) => item.active || item.id === booking.driverId)
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.name} · {item.phone}
                        {item.active ? "" : ` ${t(locale, "detail.inactive")}`}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                {t(locale, "detail.vehicle")}
                <select name="vehicleId" defaultValue={booking.vehicleId ?? ""}>
                  <option value="">{t(locale, "detail.selectVehicle")}</option>
                  {vehicles
                    .filter((item) => item.active || item.id === booking.vehicleId)
                    .map((item) => (
                      <option value={item.id} key={item.id}>
                        {item.plateNumber} · {item.makeModel} ·{" "}
                        {t(locale, "detail.seats", { count: item.passengerCapacity })}
                        {item.active ? "" : ` ${t(locale, "detail.inactive")}`}
                      </option>
                    ))}
                </select>
              </label>
              <button className="btn btn--primary" disabled={saving}>
                {saving ? t(locale, "detail.saving") : t(locale, "detail.saveAssignment")}
              </button>
            </form>
            <a href="/admin/inventory" className="admin-inline-link">
              {t(locale, "detail.manageInventory")}
            </a>
          </section>
        </div>
        <aside className="admin-detail-side">
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "detail.workflow")}</p>
            <h2>{t(locale, "detail.status")}</h2>
            <p className="muted">{t(locale, "detail.statusHelp")}</p>
            <div className="admin-status-actions">
              {next.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  className={status === "cancelled" ? "btn btn--danger" : "btn btn--secondary"}
                  onClick={() => {
                    if (
                      status === "cancelled" &&
                      !window.confirm(t(locale, "detail.cancelConfirm"))
                    )
                      return;
                    void action(
                      () =>
                        adminFetch(`/api/v1/admin/bookings/${reference}/status`, {
                          method: "PATCH",
                          locale,
                          body: JSON.stringify({ status }),
                        }),
                      t(locale, "detail.statusChanged", {
                        status: prefixedLabel(locale, "status", status),
                      }),
                    );
                  }}
                >
                  {t(locale, "detail.markStatus", {
                    status: prefixedLabel(locale, "status", status),
                  })}
                </button>
              ))}
            </div>
            {next.length === 0 && <p className="muted">{t(locale, "detail.finalStatus")}</p>}
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "detail.teamNotes")}</p>
            <h2>{t(locale, "detail.remarks")}</h2>
            <form
              className="admin-note-form"
              onSubmit={(event) => {
                event.preventDefault();
                void action(
                  async () => {
                    await adminFetch(`/api/v1/admin/bookings/${reference}/notes`, {
                      method: "POST",
                      locale,
                      body: JSON.stringify({ body: note }),
                    });
                    setNote("");
                  },
                  t(locale, "detail.noteAdded"),
                );
              }}
            >
              <label className="sr-only" htmlFor="booking-note">
                {t(locale, "detail.addNoteAria")}
              </label>
              <textarea
                id="booking-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t(locale, "detail.notePlaceholder")}
                rows={3}
              />
              <button
                type="submit"
                className="btn btn--secondary"
                disabled={saving || note.trim().length < 2}
              >
                {t(locale, "detail.addNote")}
              </button>
            </form>
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
          </section>
          <section className="admin-card">
            <p className="admin-eyebrow">{t(locale, "detail.history")}</p>
            <h2>{t(locale, "detail.audit")}</h2>
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
          </section>
        </aside>
      </div>
    </div>
  );
}
