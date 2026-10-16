import { describe, expect, it } from "vitest";
import { localizeHtml } from "./i18n-html.ts";
import { localeFromPath, localePath, publicSourcePage, stripLocale } from "./i18n.ts";

describe("public locale routing", () => {
  it("retains ordinary metadata localization when preservation is disabled", () => {
    const result = localizeHtml(
      '<meta name="description" content="Private travel in Macau" data-no-localize="false">',
      "pt",
    );
    expect(result).toContain('content="Viagens privadas em Macau"');
  });
  it("preserves declared English package Markdown while localizing the surrounding page", () => {
    const result = localizeHtml(
      '<meta name="description" content="Airport Transfer" data-no-localize><a href="/services/city-tours/heritage-walk">City Tours</a><div lang="en" data-no-localize><p>Airport Transfer</p><a href="/contact">Contact</a></div>',
      "pt",
    );
    expect(result).toContain('href="/pt/services/city-tours/heritage-walk"');
    expect(result).toContain('content="Airport Transfer"');
    expect(result).toContain('<p>Airport Transfer</p><a href="/contact">Contact</a>');
  });
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

  it("localizes the Special Offers nav label and href in Portuguese", () => {
    const result = localizeHtml(
      '<nav><a href="/special-offers">Special Offers</a><a href="/services/city-tours/half-day">Half day</a></nav>',
      "pt",
    );
    expect(result).toContain('href="/pt/special-offers"');
    expect(result).toContain(">Ofertas especiais</a>");
    expect(result).toContain(">Meio dia</a>");
  });

  it("localizes a special-offer package page link", () => {
    const result = localizeHtml(
      '<a href="/special-offers/3f1c2a90-4b71-4d2e-9c1a-8a0f6d2e1b33">Request this offer</a>',
      "pt",
    );
    expect(result).toContain('href="/pt/special-offers/3f1c2a90-4b71-4d2e-9c1a-8a0f6d2e1b33"');
    expect(result).toContain(">Pedir esta oferta</a>");
  });

  it("keeps 600-E in the zh-Hant footer address", () => {
    const result = localizeHtml(
      "<p>600-E Avenida do Dr. Rodrigo Rodrigues, First International Commercial Centre, 16/F, P16-07, Macau</p>",
      "zh-Hant",
    );
    expect(result).toContain("600-E");
    expect(result).toContain("澳門羅理基博士大馬路600-E號");
  });

  it("localizes the WeChat QR placeholder label and alt text", () => {
    const markup =
      '<img alt="WeChat QR – coming soon"><span>WeChat QR – coming soon</span><figcaption>WeChat</figcaption>';
    const pt = localizeHtml(markup, "pt");
    const zh = localizeHtml(markup, "zh-Hant");
    expect(pt).toContain('alt="QR WeChat – em breve"');
    expect(pt).toContain(">QR WeChat – em breve</span>");
    expect(pt).toContain(">WeChat</figcaption>");
    expect(zh).toContain('alt="微信二維碼 – 即將推出"');
    expect(zh).toContain(">微信二維碼 – 即將推出</span>");
    expect(zh).toContain(">微信</figcaption>");
  });
});
