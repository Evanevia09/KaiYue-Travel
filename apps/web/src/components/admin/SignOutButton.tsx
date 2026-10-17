import { useState } from "react";
import { t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { authClient } from "./auth-client.ts";

export function SignOutButton({ locale }: { locale: AdminLocale }) {
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
      {busy ? t(locale, "signOut.busy") : t(locale, "signOut")}
    </button>
  );
}
