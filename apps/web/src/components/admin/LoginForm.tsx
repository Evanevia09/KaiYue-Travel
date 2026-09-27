import { useState } from "react";
import { authClient } from "./auth-client.ts";

export function LoginForm() {
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
        void authClient.signIn
          .email({ email: String(form.get("email")), password: String(form.get("password")) })
          .then(({ error }) => {
            if (error) {
              setError(
                "Sign-in failed. Check your credentials or ask the administrator for access.",
              );
              return;
            }
            window.location.assign("/admin");
          })
          .catch(() => setError("Sign-in is unavailable. Please try again later."))
          .finally(() => setBusy(false));
      }}
    >
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
