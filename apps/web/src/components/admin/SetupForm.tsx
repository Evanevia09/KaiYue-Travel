import { useState } from "react";

export function SetupForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  if (done)
    return (
      <p role="status">
        Account created. <a href="/login">Sign in to the dashboard</a>.
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
                response.status === 409
                  ? "An account already exists. Sign in instead."
                  : "Setup failed. Check your approved email, setup token, and password.",
              );
            setDone(true);
          })
          .catch((err: Error) => setError(err.message))
          .finally(() => setBusy(false));
      }}
    >
      <label className="field">
        Name
        <input name="name" autoComplete="name" required />
      </label>
      <label className="field">
        Approved email
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="field">
        Password · at least 12 characters
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
      </label>
      <label className="field">
        One-time setup token
        <input name="setupToken" type="password" autoComplete="off" required />
      </label>
      {error && (
        <p role="alert" className="admin-feedback admin-feedback--error">
          {error}
        </p>
      )}
      <button className="btn btn--primary" disabled={busy}>
        {busy ? "Creating…" : "Create operator account"}
      </button>
    </form>
  );
}
