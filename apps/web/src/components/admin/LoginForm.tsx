import { useState } from "react";
import { t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { authClient } from "./auth-client.ts";
import { loginFormErrorMessage } from "./login-form-error.ts";

export function LoginForm({
  locale,
  passwordMinLength = 12,
}: {
  locale: AdminLocale;
  passwordMinLength?: number;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="admin-login-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        let retryAfter: string | null = null;
        void authClient.signIn
          .email({
            email: String(form.get("email")),
            password: String(form.get("password")),
            fetchOptions: {
              onResponse(context) {
                retryAfter = context.response.headers.get("Retry-After");
              },
            },
          })
          .then(({ error }) => {
            if (error) {
              setError(loginFormErrorMessage(locale, error, retryAfter));
              return;
            }
            window.location.assign("/admin");
          })
          .catch(() => setError(t(locale, "login.errorUnavailable")))
          .finally(() => setBusy(false));
      }}
    >
      <label className="field">
        {t(locale, "login.email")}
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        {t(locale, "login.password")}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={passwordMinLength}
          required
        />
      </label>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? t(locale, "login.submitting") : t(locale, "login.submit")}
      </button>
    </form>
  );
}
