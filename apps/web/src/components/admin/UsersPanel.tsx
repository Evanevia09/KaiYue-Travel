import { useEffect, useState } from "react";
import { localizeCaughtError, t, type AdminLocale } from "../../lib/admin-i18n.ts";
import { adminFetch, type AdminOperator } from "./api.ts";

function roleLabel(locale: AdminLocale, role: AdminOperator["role"]): string {
  switch (role) {
    case "super_admin":
      return t(locale, "users.roleSuperAdmin");
    case "staff":
      return t(locale, "users.roleStaff");
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}

export function UsersPanel({
  locale,
  passwordMinLength,
}: {
  locale: AdminLocale;
  passwordMinLength: number;
}) {
  const [items, setItems] = useState<AdminOperator[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  async function load() {
    const result = await adminFetch<{ items: AdminOperator[] }>("/api/v1/admin/users", { locale });
    setItems(result.items);
  }

  useEffect(() => {
    void load().catch((err: unknown) => setError(localizeCaughtError(err, locale)));
  }, [locale]);

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminFetch("/api/v1/admin/users", {
        locale,
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          password: String(data.get("password") ?? ""),
          confirmPassword: String(data.get("confirmPassword") ?? ""),
        }),
      });
      form.reset();
      await load();
      setNotice(t(locale, "users.created"));
    } catch (err) {
      setError(localizeCaughtError(err, locale));
    } finally {
      setSaving(false);
    }
  }

  async function saveRole(userId: string, role: AdminOperator["role"]) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminFetch(`/api/v1/admin/users/${userId}`, {
        locale,
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await load();
    } catch (err) {
      setError(localizeCaughtError(err, locale));
    } finally {
      setSaving(false);
    }
  }

  async function setEnabled(userId: string, enabled: boolean) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminFetch(`/api/v1/admin/users/${userId}`, {
        locale,
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      await load();
    } catch (err) {
      setError(localizeCaughtError(err, locale));
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>, userId: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminFetch(`/api/v1/admin/users/${userId}/password`, {
        locale,
        method: "POST",
        body: JSON.stringify({
          password: String(data.get("password") ?? ""),
          confirmPassword: String(data.get("confirmPassword") ?? ""),
        }),
      });
      form.reset();
      setResettingId(null);
      setNotice(t(locale, "users.resetDone"));
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
          <p className="admin-eyebrow">{t(locale, "users.eyebrow")}</p>
          <h2>{t(locale, "users.heading")}</h2>
          <p className="muted">{t(locale, "users.lead")}</p>
        </div>
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
      <section className="admin-card">
        <h3>{t(locale, "users.create")}</h3>
        <form className="admin-login-form" onSubmit={createStaff}>
          <label className="field">
            {t(locale, "users.name")}
            <input name="name" type="text" autoComplete="name" required maxLength={80} />
          </label>
          <label className="field">
            {t(locale, "users.email")}
            <input name="email" type="email" autoComplete="off" required />
          </label>
          <label className="field">
            {t(locale, "users.password", { min: passwordMinLength })}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={passwordMinLength}
              required
            />
          </label>
          <label className="field">
            {t(locale, "users.confirmPassword")}
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={passwordMinLength}
              required
            />
          </label>
          <button className="btn btn--primary" disabled={saving}>
            {saving ? t(locale, "users.creating") : t(locale, "users.submitCreate")}
          </button>
        </form>
      </section>
      <section className="admin-card">
        <div className="admin-resource-list">
          {items.length === 0 ? (
            <p className="muted">{t(locale, "users.empty")}</p>
          ) : (
            items.map((item) => (
              <article key={item.id} className="admin-resource">
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.email} · {roleLabel(locale, item.role)}
                  </small>
                </span>
                <span className={item.enabled ? "admin-active" : "admin-inactive"}>
                  {item.enabled ? t(locale, "users.enabled") : t(locale, "users.disabled")}
                </span>
                <div className="admin-table-actions">
                  <label className="field">
                    {t(locale, "users.role")}
                    <select
                      aria-label={t(locale, "users.role")}
                      defaultValue={item.role}
                      disabled={saving}
                      onChange={(event) => {
                        const next = event.currentTarget.value;
                        if (next === "super_admin" || next === "staff") {
                          void saveRole(item.id, next);
                        }
                      }}
                    >
                      <option value="staff">{t(locale, "users.roleStaff")}</option>
                      <option value="super_admin">{t(locale, "users.roleSuperAdmin")}</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={saving}
                    onClick={() => void setEnabled(item.id, !item.enabled)}
                  >
                    {item.enabled ? t(locale, "users.disable") : t(locale, "users.enable")}
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={saving}
                    onClick={() => setResettingId(item.id === resettingId ? null : item.id)}
                  >
                    {t(locale, "users.resetPassword")}
                  </button>
                </div>
                {resettingId === item.id ? (
                  <form
                    className="admin-login-form"
                    onSubmit={(event) => void resetPassword(event, item.id)}
                  >
                    <label className="field">
                      {t(locale, "users.password", { min: passwordMinLength })}
                      <input
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        minLength={passwordMinLength}
                        required
                      />
                    </label>
                    <label className="field">
                      {t(locale, "users.confirmPassword")}
                      <input
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        minLength={passwordMinLength}
                        required
                      />
                    </label>
                    <button className="btn btn--primary" disabled={saving}>
                      {saving ? t(locale, "users.resetting") : t(locale, "users.resetPassword")}
                    </button>
                  </form>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
