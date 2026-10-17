import { useEffect } from "react";
import { persistAdminLocale, t, type AdminLocale } from "../../lib/admin-i18n.ts";

type Props = {
  locale: AdminLocale;
};

export function AdminLocaleSwitch({ locale }: Props) {
  useEffect(() => {
    persistAdminLocale(locale);
  }, [locale]);

  function choose(next: AdminLocale) {
    if (next === locale) return;
    persistAdminLocale(next);
    window.location.reload();
  }

  return (
    <div className="admin-locale-switch" role="group" aria-label={t(locale, "switch.label")}>
      <button
        type="button"
        aria-pressed={locale === "en"}
        className={locale === "en" ? "is-active" : undefined}
        onClick={() => choose("en")}
      >
        {t(locale, "switch.en")}
      </button>
      <button
        type="button"
        aria-pressed={locale === "zh-Hant"}
        className={locale === "zh-Hant" ? "is-active" : undefined}
        onClick={() => choose("zh-Hant")}
      >
        {t(locale, "switch.zhHant")}
      </button>
    </div>
  );
}
