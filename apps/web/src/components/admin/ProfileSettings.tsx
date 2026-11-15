import { useState } from "react";
import { t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch } from "./api.ts";

export function ProfileSettings({
  locale,
  email,
  role,
  passwordChangeAvailable,
  passwordMinLength = 12,
}: {
  locale: AdminLocale;
  email: string;
  role: "primary" | "staff";
  passwordChangeAvailable: boolean;
  passwordMinLength?: number;
}) {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <section className="admin-panel">
      <p className="admin-eyebrow">{t(locale, "settings.eyebrow")}</p>
      <h2>{t(locale, "settings.heading")}</h2>
      <p className="muted">{t(locale, "settings.signedIn", { email })}</p>
      <p className="muted">
        {role === "primary" ? t(locale, "settings.rolePrimary") : t(locale, "settings.roleStaff")}
      </p>
      {passwordChangeAvailable ? (
        <>
          <p className="muted">{t(locale, "settings.passwordHelp")}</p>
          <form
            className="admin-login-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              setBusy(true);
              setError("");
              setDone(false);
              void adminFetch<{ ok: true }>("/api/v1/admin/profile/password", {
                locale,
                method: "POST",
                body: JSON.stringify({
                  currentPassword: String(data.get("currentPassword") ?? ""),
                  newPassword: String(data.get("newPassword") ?? ""),
                  confirmPassword: String(data.get("confirmPassword") ?? ""),
                }),
              })
                .then(() => {
                  setDone(true);
                  form.reset();
                })
                .catch((caught: unknown) => {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : t(locale, "settings.errorUnavailable"),
                  );
                })
                .finally(() => setBusy(false));
            }}
          >
            <label className="field">
              {t(locale, "settings.currentPassword")}
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="field">
              {t(locale, "settings.newPassword", { min: passwordMinLength })}
              <input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={passwordMinLength}
                required
              />
            </label>
            <label className="field">
              {t(locale, "settings.confirmPassword")}
              <input
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={passwordMinLength}
                required
              />
            </label>
            {error && (
              <p role="alert" className="admin-feedback admin-feedback--error">
                {error}
              </p>
            )}
            {done && (
              <p role="status" className="admin-feedback">
                {t(locale, "settings.done")}
              </p>
            )}
            <button className="btn btn--primary" disabled={busy}>
              {busy ? t(locale, "settings.submitting") : t(locale, "settings.submit")}
            </button>
          </form>
        </>
      ) : (
        <p className="muted">{t(locale, "settings.accessOnly")}</p>
      )}
    </section>
  );
}
