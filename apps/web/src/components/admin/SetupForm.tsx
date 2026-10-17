import { useState } from "react";
import { t, type AdminLocale } from "../../lib/admin-i18n.ts";

export function SetupForm({ locale }: { locale: AdminLocale }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <p role="status">
        {t(locale, "setup.done")} <a href="/login">{t(locale, "setup.signIn")}</a>.
      </p>
    );
  return (
    <form
      className="admin-login-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        void fetch("/api/auth/sign-up/email", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-admin-setup-token": String(form.get("setupToken")),
          },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            password: form.get("password"),
          }),
        })
          .then(async (response) => {
            if (!response.ok)
              throw new Error(
                response.status === 409 ? t(locale, "setup.exists") : t(locale, "setup.failed"),
              );
            setDone(true);
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      <label className="field">
        {t(locale, "setup.name")}
        <input name="name" autoComplete="name" required />
      </label>
      <label className="field">
        {t(locale, "setup.email")}
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        {t(locale, "setup.password")}
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <label className="field">
        {t(locale, "setup.token")}
        <input name="setupToken" type="password" autoComplete="off" required />
      </label>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? t(locale, "setup.creating") : t(locale, "setup.submit")}
      </button>
    </form>
  );
}
