# Special Offers enquiry, hero, and package pages — handover

**Date:** 2026-10-16  
**Branch:** `cursor/special-offers-enquiry-pages-e1be`  
**PR target:** `staging` only. Do not merge to `main`.  
**Database:** `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`), binding `DB`  
**R2:** `kaiyue-offers-staging`, binding `OFFERS_BUCKET`

This increment adds a Special Offers hero booking widget, a Special Offer enquiry modal that reuses the City Tour booking API, per-offer public pages, and a green general-enquiry card. It does **not** change D1 or R2 bindings in `wrangler.jsonc`.

## What changed

- Contact general-enquiry card uses a brand-green background (`#00704b`, the owner-specified `#008c5e` darkened so white text meets WCAG 2.2 AA). Form fields stay white with dark text.
- The City Tours booking widget dropdown no longer includes the Markdown `special-offer` package.
- `/special-offers` (EN, `/pt`, `/zh-Hant`) has a City Tours-style photographic hero and its own widget. The dropdown is the published D1 offers only, injected in the HTML. If none exist, the dropdown has no packages.
- Continuing from that widget opens a **Special Offer enquiry** modal. It uses the same City Tour communication step and `POST /api/v1/bookings`. The Worker verifies the offer is published and stores `offer_id` / `offer_title`.
- `/admin/bookings` and the booking detail page show the package title (and id on detail).
- Each published offer has `/special-offers/:id` plus `/pt/` and `/zh-Hant/` counterparts. Design matches City Tour package pages: gallery with the main photo first, title, description, price from only if set, terms only if set, and the widget preselected to that package. Cards on `/special-offers` link here. Unpublished or deleted offers return HTTP 404 and render the site not-found page (no `Astro.rewrite`, which 500s on Workers). Title and meta come from the offer. Images are lazy except the first card/hero.
- UI chrome for the new hero, cards, package pages, widget labels, and modal is in English, Portuguese, and Traditional Chinese.
- Pages are SSR (`prerender = false`). The browser does not fetch `/api/v1/offers` for the dropdown.

## Migration `0007_booking_offer.sql`

Apply **only** to staging D1 `069aa442`:

```bash
npx wrangler d1 migrations apply kaiyue-travel-staging --remote --config wrangler.jsonc
```

Adds nullable `offer_id` and `offer_title` on `bookings`, plus `idx_bookings_offer_id`. Does not rebuild the table. Do not apply to any other database. Do not run `wrangler deploy`. Do not merge to `main`.

## Preview verification

- PR: https://github.com/Evanevia09/KaiYue-Travel/pull/13 (draft into `staging`)
- Branch preview: https://cursor-special-offers-enquiry-pages-e1be-kaiyue-travel.scalingsmb.workers.dev
- Latest commit preview: https://8ef6d610-kaiyue-travel.scalingsmb.workers.dev
- GitHub `check` and Workers Builds succeeded on `b7d0327`. Do not merge to `main`.

Checked on the branch/commit Workers preview at desktop and 390px:

- Contact general-enquiry card is brand green (`#00704b`) with white labels and white inputs. An earlier `.card` rule had been painting it white; specificity was raised so the green wins.
- City Tours `/services/city-tours/half-day` widget dropdown: Half day, Full day only. No special-offer option.
- `/special-offers` hero lists the three published `[Sample]` offers. Cards link to `/special-offers/:id`.
- `/special-offers/465463fc-29ba-4ddb-88b9-a427dcdd99ca` shows title, description, gallery, and a preselected widget. Unknown id returns HTTP 404 + not-found page.
- `/pt/special-offers` and `/zh-Hant/special-offers` load with localized chrome.
- No application console errors. DevTools Issues had one pre-existing CLS note about a lazy image without dimensions (not a JS exception).

Test enquiry (cancelled after checks):

- Name: `TEST offer enquiry - delete me`
- Email: `qa@kaiyue.test`
- Pickup: Macau International Airport, 23 Oct 2026 13:00
- Package: `[Sample] Zhuhai Day Trip` (`465463fc-29ba-4ddb-88b9-a427dcdd99ca`)
- Reference: `KY-S99HVV5K`
- Admin list and detail showed `Special offer: [Sample] Zhuhai Day Trip` and the offer id. Status marked **cancelled**. D1 row on `069aa442` matches. Sample offers were not edited.

## Limits

- Access is still not configured. Preview login remains the disposable `admin-test@kaiyue.test` operator.
- The leftover Markdown `/services/city-tours/special-offer` page still exists as a draft catalogue item; it is no longer in the City Tours booking dropdown.
- Special-offer titles and photos are staff-authored D1/R2 data. This task treats published `[Sample]` offers as read-only.
