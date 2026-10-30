import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_LOCALE_COOKIE,
  ADMIN_LOCALE_STORAGE_KEY,
  adminEn,
  adminLocaleCookie,
  adminLocaleFromCookieHeader,
  adminMessageKeys,
  adminZhHant,
  formatAdminWhen,
  localizeAdminError,
  persistAdminLocale,
  parseAdminLocale,
  prefixedLabel,
  t,
} from "./admin-i18n.ts";

const HARDCODED_ENGLISH = [
  "Loading dashboard…",
  "Protected operations area",
  "Operations workspace",
  "Sign-in failed. Check your credentials",
  "Loading bookings…",
  "No bookings match these filters.",
  "Ready to publish",
  "Delete this offer?",
  "Publishing…",
  "Unpublishing…",
  "Add booking enquiry",
  "Protected workspace",
  "View website",
  "Signing out…",
  "No bookings yet.",
  "Email notifications requiring review",
  "Loading inquiries…",
  "No inquiries match these filters.",
  "Driver + car assigned",
  "Cancel this booking request?",
  "Manage drivers & vehicles",
  "Photo upload progress",
  "Create special offer",
];

const ADMIN_UI_FILES = [
  "apps/web/src/layouts/AdminLayout.astro",
  "apps/web/src/pages/login.astro",
  "apps/web/src/pages/setup-admin.astro",
  "apps/web/src/pages/admin/index.astro",
  "apps/web/src/pages/admin/bookings/index.astro",
  "apps/web/src/pages/admin/bookings/[reference].astro",
  "apps/web/src/pages/admin/calendar.astro",
  "apps/web/src/pages/admin/contacts/index.astro",
  "apps/web/src/pages/admin/contacts/[id].astro",
  "apps/web/src/pages/admin/inventory.astro",
  "apps/web/src/pages/admin/offers.astro",
  "apps/web/src/components/admin/LoginForm.tsx",
  "apps/web/src/components/admin/SetupForm.tsx",
  "apps/web/src/components/admin/SignOutButton.tsx",
  "apps/web/src/components/admin/DashboardPanel.tsx",
  "apps/web/src/components/admin/BookingsPanel.tsx",
  "apps/web/src/components/admin/BookingDetailPanel.tsx",
  "apps/web/src/components/admin/CalendarPanel.tsx",
  "apps/web/src/components/admin/ContactsPanel.tsx",
  "apps/web/src/components/admin/ContactDetailPanel.tsx",
  "apps/web/src/components/admin/InventoryPanel.tsx",
  "apps/web/src/components/admin/OffersPanel.tsx",
  "apps/web/src/components/admin/AdminLocaleSwitch.tsx",
];

describe("admin i18n dictionaries", () => {
  it("keeps identical keys in English and Traditional Chinese", () => {
    const enKeys = Object.keys(adminEn).sort();
    const zhKeys = Object.keys(adminZhHant).sort();
    expect(zhKeys).toEqual(enKeys);
    expect(adminMessageKeys).toHaveLength(enKeys.length);
  });

  it("uses a non-empty Traditional Chinese string for every key", () => {
    for (const key of adminMessageKeys) {
      expect(adminZhHant[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("translates staff chrome instead of leaving English for zh-Hant", () => {
    expect(t("zh-Hant", "nav.dashboard")).toBe("總覽");
    expect(t("zh-Hant", "nav.offers")).toBe("特別優惠");
    expect(t("zh-Hant", "status.enquiry")).toBe("查詢");
    expect(t("zh-Hant", "status.cancelled")).toBe("已取消");
    expect(t("zh-Hant", "login.submit")).toBe("登入");
    expect(t("en", "nav.dashboard")).toBe("Dashboard");
    expect(t("zh-Hant", "bookings.specialOffer", { title: "Harbour" })).toBe("特別優惠：Harbour");
  });
});

describe("admin locale persistence", () => {
  it("defaults unknown values to English and accepts zh-Hant", () => {
    expect(parseAdminLocale(undefined)).toBe("en");
    expect(parseAdminLocale("pt")).toBe("en");
    expect(parseAdminLocale("zh-Hant")).toBe("zh-Hant");
    expect(adminLocaleFromCookieHeader(`${ADMIN_LOCALE_COOKIE}=zh-Hant; Path=/`)).toBe("zh-Hant");
    expect(adminLocaleFromCookieHeader("other=1")).toBe("en");
  });

  it("writes the staff locale to a cookie and localStorage", () => {
    const store: Record<string, string> = {};
    const jar = { cookie: "" };
    persistAdminLocale("zh-Hant", { setItem: (key, value) => (store[key] = value) }, jar);
    expect(jar.cookie).toBe(adminLocaleCookie("zh-Hant"));
    expect(store[ADMIN_LOCALE_STORAGE_KEY]).toBe("zh-Hant");
    persistAdminLocale("en", { setItem: (key, value) => (store[key] = value) }, jar);
    expect(jar.cookie).toContain(`${ADMIN_LOCALE_COOKIE}=en`);
    expect(store[ADMIN_LOCALE_STORAGE_KEY]).toBe("en");
  });
});

describe("admin error and label localization", () => {
  it("maps API codes and known English messages", () => {
    expect(localizeAdminError({ code: "UNAUTHORIZED", message: "nope" }, "zh-Hant")).toBe(
      "需要員工驗證。",
    );
    expect(localizeAdminError({ message: "Booking not found." }, "zh-Hant")).toBe("找不到此預約。");
    expect(localizeAdminError({ message: "Check pickup location." }, "zh-Hant")).toBe(
      "請檢查接載地點。",
    );
    expect(
      localizeAdminError({ message: "Cannot change status from enquiry to completed." }, "zh-Hant"),
    ).toBe("無法將狀態由查詢改為已完成。");
    expect(localizeAdminError({ code: "NOT_FOUND" }, "en")).toBe("Not found.");
    expect(localizeAdminError(undefined, "zh-Hant")).toBe("後台要求失敗。");
  });

  it("localizes status and service labels used in the dashboard", () => {
    expect(prefixedLabel("zh-Hant", "status", "enquiry")).toBe("查詢");
    expect(prefixedLabel("zh-Hant", "service", "airport_transfer")).toBe("機場包車接送");
    expect(prefixedLabel("en", "service", "airport_transfer")).toBe("Airport transfer");
  });
});

describe("admin date formatting", () => {
  it("keeps the English Macau stamp and uses a Traditional Chinese stamp", () => {
    expect(formatAdminWhen("2026-10-16T04:05:00.000Z", "en")).toBe("16/10/2026, 12:05");
    expect(formatAdminWhen("2026-10-16T04:05:00.000Z", "zh-Hant")).toBe("2026年10月16日 12:05");
  });
});

describe("admin UI copy coverage", () => {
  it("does not leave common staff English strings hard-coded in admin surfaces", () => {
    const root = resolve(process.cwd());
    const sources = ADMIN_UI_FILES.map((file) => readFileSync(resolve(root, file), "utf8")).join(
      "\n",
    );
    for (const phrase of HARDCODED_ENGLISH) {
      expect(sources, `hard-coded English remains: ${phrase}`).not.toContain(phrase);
    }
  });
});
