import { describe, expect, it } from "vitest";
import { localizeHtml } from "./i18n-html.ts";
import { localeFromPath, localePath, publicSourcePage, stripLocale } from "./i18n.ts";

describe("public locale routing", () => {
  it("keeps the same public page while switching between locales", () => {
    expect(localeFromPath("/zh-Hant/services/airport-transfer")).toBe("zh-Hant");
    expect(stripLocale("/pt/business/travel-agency")).toBe("/business/travel-agency");
    expect(localePath("/pt/about", "zh-Hant")).toBe("/zh-Hant/about");
    expect(localePath("/zh-Hant/about", "en")).toBe("/about");
    expect(localePath("/", "pt")).toBe("/pt");
    expect(publicSourcePage("/pt/about", "/about")).toBe("/pt/about");
    expect(publicSourcePage("/about", "/about")).toBe("/about");
  });

  it("translates public copy and links without changing a React island before hydration", () => {
    const result = localizeHtml(
      '<!doctype html><html lang="pt-PT"><head><meta name="description" content="Private travel in Macau"></head><body><a href="/services/airport-transfer?from=home">Airport Transfer</a><a href="/admin">Admin</a><astro-island><span>Airport Transfer</span></astro-island></body></html>',
      "pt",
    );
    expect(result).toContain('content="Viagens privadas em Macau"');
    expect(result).toContain('href="/pt/services/airport-transfer?from=home"');
    expect(result).toContain(">Transfer do aeroporto</a>");
    expect(result).toContain('href="/admin"');
    expect(result).toContain("<astro-island><span>Airport Transfer</span></astro-island>");
  });
});
