import { useState } from "react";
import { authClient } from "./auth-client.ts";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn--secondary"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void authClient.signOut().finally(() => window.location.assign("/login"));
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
