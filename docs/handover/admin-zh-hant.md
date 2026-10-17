# Staff dashboard Traditional Chinese — handover

**Date:** 2026-10-17  
**Branch:** `cursor/admin-zh-hant-d1f1`  
**PR target:** `staging` only. Do not merge to `main`.  
**Database:** unchanged. No D1 migration. Staging D1 `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`) and R2 `kaiyue-offers-staging` were not edited.  
**Owner request:** Evan asked for full Traditional Chinese (`zh-Hant`) on the staff dashboard / admin portal.

## What was implemented

- Shared staff dictionaries in `apps/web/src/lib/admin-i18n.ts` (`en` and `zh-Hant`, identical keys).
- Language switch (English / 繁體中文) on `/login`, `/setup-admin`, and the admin header.
- Persistence: cookie `kaiyue-admin-locale` (1 year, `Path=/`, `SameSite=Lax`) plus `localStorage`. If only localStorage is set, an inline script copies it to the cookie and reloads so Astro SSR matches. Default remains English.
- Localized staff chrome: nav, header, page titles/meta, login and local setup, dashboard, bookings list/detail, calendar, contacts, drivers & vehicles, Special Offers list/editor (photos, set main, publish/unpublish, delete dialogs), empty/loading states, status and service labels, buttons including busy text, form labels, toasts, confirm dialogs, and Asia/Macau date/time stamps.
- API errors that reach the admin UI are mapped client-side from known English messages or error codes (`VALIDATION_FAILED`, `UNAUTHORIZED`, and the rest of the shared `ERROR_CODES`).
- Production admin stay fail-closed. `wrangler.jsonc` and the production 403 gate were not changed.

## What was not done

- **Bilingual offer content** (zh-Hant title/description on `/zh-Hant/special-offers`) was skipped. It needs an additive D1 migration and public-page fallback. Left as a follow-up so this change stays UI-only on the shared staging database.
- Browser-native validation bubbles (`required`, `type="email"`, `datetime-local` picker chrome) stay in the browser language. Staff data (names, addresses, offer copy, notes) stays as entered.
- Public website locales are unchanged. Portuguese is not added to admin.

## How to switch language

1. Open `/login` or any `/admin` page on a preview host.
2. Use the English / 繁體中文 control.
3. The page reloads in that language. The choice survives refresh and later visits on the same browser.

## Preview test operator

Use the existing disposable preview operator only:

- Email: `admin-test@kaiyue.test`

The password, `BETTER_AUTH_SECRET`, and any setup token are **not** in git, the PR, or this file. Production `/admin` and `/api/auth` stay 403 until Cloudflare Access is configured.

## Verification

Automated: dictionary key-coverage, locale cookie/storage, API error mapping, date stamps, offer publish-label keys, and a scan that the listed admin surfaces no longer hard-code common English chrome. Typecheck, tests, and production build are required before calling this done.

Preview: log in on the Workers commit/branch preview, open every admin page in 繁體中文, then switch back to English. Do not merge to `main`. Do not run `wrangler deploy`.

## Cleanup

No new D1 rows or R2 objects are required. If preview QA creates a TEST offer or booking, delete or cancel it as in the Special Offers handovers. Do not leave TEST records published.
