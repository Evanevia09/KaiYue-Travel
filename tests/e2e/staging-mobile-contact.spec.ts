import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ORIGIN = "https://staging.kaiyuemacau.com";
const ARTIFACT_DIR = "/opt/cursor/artifacts/kaiyue-staging-mobile-20261120";
const OWNER_QR_RATIO = 774 / 784;
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "320x844", width: 320, height: 844 },
] as const;

mkdirSync(ARTIFACT_DIR, { recursive: true });

function pathnameOf(page: Page) {
  const path = new URL(page.url()).pathname;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function challengeReason(page: Page, html: string, title: string): string | null {
  if (
    /just a moment|attention required|cf-challenge|cf-browser-verification|checking your browser/i.test(
      `${title}\n${html}`,
    )
  ) {
    return `Cloudflare challenge or block on ${page.url()} title=${title}`;
  }
  return null;
}

async function assertLive(page: Page) {
  const title = await page.title();
  const html = await page.content();
  const blocked = challengeReason(page, html, title);
  expect(blocked, blocked ?? "live staging reachable").toBeNull();
  expect(page.url()).toMatch(/^https:\/\/staging\.kaiyuemacau\.com\//);
}

async function collectConsole(page: Page) {
  const errors: string[] = [];
  const mixed: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (error) => {
    errors.push(error.message);
  });
  page.on("request", (request) => {
    if (request.url().startsWith("http://")) mixed.push(request.url());
  });
  return { errors, mixed };
}

async function noHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    metrics.scrollWidth,
    `horizontal overflow scrollWidth=${metrics.scrollWidth} innerWidth=${metrics.innerWidth}`,
  ).toBeLessThanOrEqual(metrics.innerWidth + 1);
  return metrics;
}

async function headerGeometry(page: Page) {
  return page.evaluate(() => {
    const boxes = (selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        display: style.display,
        visibility: style.visibility,
        overflow: style.overflow,
      };
    };
    const overlap = (
      a: { x: number; y: number; w: number; h: number } | null,
      b: { x: number; y: number; w: number; h: number } | null,
    ) => {
      if (!a || !b || a.w <= 0 || b.w <= 0) return false;
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    };
    const logo = boxes(".site-header .logo");
    const lang = boxes(".lang-switch");
    const menu = boxes(".mobile-nav summary");
    const chip = boxes(".header-chip");
    return {
      logo,
      lang,
      menu,
      chip,
      logoOverlapsLang: overlap(logo, lang),
      logoOverlapsMenu: overlap(logo, menu),
      langOverlapsMenu: overlap(lang, menu),
    };
  });
}

async function qrGeometry(page: Page, selector: string) {
  const handle = page.locator(selector).first();
  await expect(handle).toBeVisible();
  return handle.evaluate((img: HTMLImageElement) => {
    const frame = img.closest(".wechat-qr__frame");
    const figure = img.closest(".wechat-qr");
    const footer = img.closest(".site-footer");
    const imgBox = img.getBoundingClientRect();
    const frameBox = frame?.getBoundingClientRect();
    const figureBox = figure?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    const style = getComputedStyle(img);
    const frameStyle = frame ? getComputedStyle(frame) : null;
    return {
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      src: img.currentSrc || img.src,
      alt: img.alt,
      objectFit: style.objectFit,
      img: { w: imgBox.width, h: imgBox.height, x: imgBox.x, y: imgBox.y },
      frame: frameBox
        ? {
            w: frameBox.width,
            h: frameBox.height,
            aspect: frameBox.width / frameBox.height,
            overflow: frameStyle?.overflow,
            background: frameStyle?.backgroundColor,
          }
        : null,
      figureBottom: figureBox?.bottom ?? null,
      footerTop: footerBox?.top ?? null,
      vw: window.innerWidth,
    };
  });
}

async function bookingControls(page: Page) {
  return page.evaluate(() => {
    const selectors = [
      ".hero-booking",
      ".booking-bar",
      ".mobile-book",
      "button, a.btn, [data-booking]",
    ];
    const hit = selectors
      .flatMap((sel) => [...document.querySelectorAll(sel)])
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          style.visibility !== "hidden" &&
          style.pointerEvents !== "none"
        );
      });
    const footer = document.querySelector(".site-footer")?.getBoundingClientRect();
    const header = document.querySelector(".site-header")?.getBoundingClientRect();
    const blocked = hit.filter((el) => {
      const r = el.getBoundingClientRect();
      const underHeader = header ? r.top < header.bottom - 4 && r.bottom > header.top : false;
      const underFooter = footer ? r.bottom > footer.top + 4 && r.top < footer.bottom : false;
      return underHeader || underFooter;
    });
    return {
      visible: hit.length,
      blocked: blocked.length,
      sample: hit.slice(0, 6).map((el) => ({
        tag: el.tagName,
        className: el.className.toString().slice(0, 80),
        r: el.getBoundingClientRect().toJSON(),
      })),
    };
  });
}

async function switchLocale(page: Page, name: "English" | "Português" | "繁體中文") {
  await page.locator(".lang-switch > summary").click();
  await page.locator(".lang-switch__menu a", { hasText: name }).click();
  await page.waitForLoadState("domcontentloaded");
  await assertLive(page);
}

async function openFooterContact(page: Page) {
  const link = page.locator("footer.site-footer a[href$='/contact']").first();
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForLoadState("domcontentloaded");
  await assertLive(page);
}

async function qrNotCoveredByBookBar(page: Page) {
  const qr = page.locator(".site-footer .wechat-qr img").first();
  await qr.scrollIntoViewIfNeeded();
  const geometry = await page.evaluate(() => {
    const img = document.querySelector(".site-footer .wechat-qr img");
    const bar = document.querySelector(".mobile-book");
    if (!img) return { hasQr: false, overlap: false };
    const a = img.getBoundingClientRect();
    if (!bar) return { hasQr: true, hasBar: false, overlap: false };
    const style = getComputedStyle(bar);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return { hasQr: true, hasBar: false, overlap: false };
    }
    const b = bar.getBoundingClientRect();
    const overlap =
      a.width > 0 &&
      b.width > 0 &&
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
    return {
      hasQr: true,
      hasBar: true,
      overlap,
      qr: { x: a.x, y: a.y, w: a.width, h: a.height },
      bar: { x: b.x, y: b.y, w: b.width, h: b.height },
    };
  });
  expect(geometry.hasQr).toBe(true);
  expect(geometry.overlap, `footer QR covered by Book now bar: ${JSON.stringify(geometry)}`).toBe(
    false,
  );
  return geometry;
}

test.describe("live staging mobile contact/home", () => {
  test.skip(
    process.env.LIVE_STAGING_E2E !== "1",
    "set LIVE_STAGING_E2E=1 to hit https://staging.kaiyuemacau.com/",
  );
  test.describe.configure({ mode: "serial" });

  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} home locales + contact from nav`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const logs = await collectConsole(page);
      await page.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await assertLive(page);

      const html = await page.content();
      expect(html).toContain("wa.me/85363128081");
      expect(html).not.toContain("wa.me/85328338882");
      expect(html).toMatch(/tel:\+85328338882/);

      await noHorizontalOverflow(page);
      const header = await headerGeometry(page);
      expect(header.logoOverlapsLang, "header logo overlaps language switch").toBe(false);
      expect(header.logoOverlapsMenu, "header logo overlaps menu").toBe(false);
      expect(header.langOverlapsMenu, "language switch overlaps menu").toBe(false);
      expect(header.chip?.display === "none" || header.chip === null).toBeTruthy();

      const booking = await bookingControls(page);
      expect(booking.blocked, `booking controls overlapped: ${JSON.stringify(booking)}`).toBe(0);

      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-home-en.png`),
        fullPage: true,
      });

      await switchLocale(page, "Português");
      expect(pathnameOf(page)).toBe("/pt");
      await noHorizontalOverflow(page);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-home-pt.png`),
        fullPage: true,
      });

      await switchLocale(page, "繁體中文");
      expect(pathnameOf(page)).toBe("/zh-Hant");
      await noHorizontalOverflow(page);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-home-zh.png`),
        fullPage: true,
      });
      await qrNotCoveredByBookBar(page);

      await openFooterContact(page);
      expect(pathnameOf(page)).toBe("/zh-Hant/contact");

      await switchLocale(page, "English");
      expect(pathnameOf(page)).toBe("/contact");
      await page.locator(".wechat-qr img").first().scrollIntoViewIfNeeded();
      await page
        .locator(".wechat-qr--page img")
        .first()
        .evaluate((img: HTMLImageElement) => img.decode());
      const enPageQr = await qrGeometry(page, ".wechat-qr--page img");
      const enFooterQr = await qrGeometry(page, ".site-footer .wechat-qr img");
      for (const qr of [enPageQr, enFooterQr]) {
        expect(qr.complete).toBe(true);
        expect(qr.naturalWidth).toBe(774);
        expect(qr.naturalHeight).toBe(784);
        expect(qr.objectFit).toBe("contain");
        expect(qr.frame?.aspect ?? 0).toBeCloseTo(1, 1);
        expect(Math.abs(qr.naturalWidth / qr.naturalHeight - OWNER_QR_RATIO)).toBeLessThan(0.002);
        expect(qr.img.w).toBeGreaterThan(80);
        expect(qr.img.x + qr.img.w).toBeLessThanOrEqual(qr.vw + 1);
      }
      await noHorizontalOverflow(page);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-contact-en.png`),
        fullPage: true,
      });

      await switchLocale(page, "Português");
      expect(pathnameOf(page)).toBe("/pt/contact");
      await page.locator(".wechat-qr--page img").first().scrollIntoViewIfNeeded();
      const ptQr = await qrGeometry(page, ".wechat-qr--page img");
      expect(ptQr.naturalWidth).toBe(774);
      expect(ptQr.objectFit).toBe("contain");
      await noHorizontalOverflow(page);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-contact-pt.png`),
        fullPage: true,
      });

      await switchLocale(page, "繁體中文");
      expect(pathnameOf(page)).toBe("/zh-Hant/contact");
      await page.locator(".wechat-qr--page img").first().scrollIntoViewIfNeeded();
      const zhQr = await qrGeometry(page, ".wechat-qr--page img");
      expect(zhQr.naturalWidth).toBe(774);
      expect(zhQr.objectFit).toBe("contain");
      await noHorizontalOverflow(page);
      const contactHeader = await headerGeometry(page);
      expect(contactHeader.logoOverlapsMenu).toBe(false);
      await page.screenshot({
        path: join(ARTIFACT_DIR, `${viewport.name}-contact-zh.png`),
        fullPage: true,
      });

      const severe = logs.errors.filter(
        (text) => !/favicon|fonts\.googleapis|fonts\.gstatic/i.test(text),
      );
      expect(severe, `console errors: ${severe.join(" | ")}`).toEqual([]);
      expect(logs.mixed, `mixed content: ${logs.mixed.join(" | ")}`).toEqual([]);
    });
  }
});
