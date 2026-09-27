import type { Locale } from "./i18n.ts";
import pt from "./translations/pt.json";
import ptReviewed from "./translations/pt-reviewed.json";
import zhHant from "./translations/zh-Hant.json";
import zhReviewed from "./translations/zh-Hant-reviewed.json";

const copy: Record<Exclude<Locale, "en">, Record<string, string>> = {
  pt: { ...pt, ...ptReviewed },
  "zh-Hant": { ...zhHant, ...zhReviewed },
};

function tidy(value: string, locale: Exclude<Locale, "en">) {
  if (locale === "zh-Hant") {
    return value
      .replaceAll("凱嶽", "凱悅")
      .replaceAll("凱悦", "凱悅")
      .replaceAll("啟裕旅遊", "凱悅旅遊")
      .replaceAll("明門", "名門")
      .replaceAll("一克出行", "一鍵遊")
      .replaceAll("轉讓", "接送")
      .replaceAll("轉賬", "接送")
      .replaceAll("雙板", "雙牌")
      .replaceAll("廬山", "中山")
      .replaceAll("中國大陸", "內地");
  }
  return value
    .replaceAll("equipes", "equipas")
    .replaceAll("Equipe", "Equipa")
    .replaceAll("Macau-Mainland", "Macau–Interior da China");
}

export function translateCopy(value: string, locale: Locale): string {
  if (locale === "en") return value;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return value;
  const translated = copy[locale][normalized];
  if (!translated || translated === normalized) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return leading + tidy(translated, locale) + trailing;
}

export function copyCoverage(locale: Exclude<Locale, "en">) {
  return Object.keys(copy[locale]);
}
