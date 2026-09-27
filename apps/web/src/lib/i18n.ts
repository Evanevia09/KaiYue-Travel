export const locales = ["en", "pt", "zh-Hant"] as const;
export type Locale = (typeof locales)[number];

export const localeTags: Record<Locale, string> = {
  en: "en",
  pt: "pt-PT",
  "zh-Hant": "zh-Hant",
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  "zh-Hant": "繁體中文",
};

export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return first === "pt" || first === "zh-Hant" ? first : "en";
}

export function stripLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  if (locale === "en") return pathname;
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localePath(pathname: string, locale: Locale): string {
  const base = stripLocale(pathname);
  if (locale === "en") return base;
  return `/${locale}${base === "/" ? "" : base}`;
}

export function publicSourcePage(pathname: string, supplied?: string): string {
  return localeFromPath(pathname) === "en" ? (supplied ?? pathname) : pathname;
}
