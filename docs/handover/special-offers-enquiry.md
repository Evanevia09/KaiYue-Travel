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
- Each published offer has `/special-offers/:id` plus `/pt/` and `/zh-Hant/` counterparts. Design matches City Tour package pages: gallery with the main photo first, title, description, price from only if set, terms only if set, and the widget preselected to that package. Cards on `/special-offers` link here. Unpublished or deleted offers rewrite to 404. Title and meta come from the offer. Images are lazy except the first card/hero.
- UI chrome for the new hero, cards, package pages, widget labels, and modal is in English, Portuguese, and Traditional Chinese.
- Pages are SSR (`prerender = false`). The browser does not fetch `/api/v1/offers` for the dropdown.

## Migration `0007_booking_offer.sql`

Apply **only** to staging D1 `069aa442`:

```bash
npx wrangler d1 migrations apply kaiyue-travel-staging --remote --config wrangler.jsonc
```

Adds nullable `offer_id` and `offer_title` on `bookings`, plus `idx_bookings_offer_id`. Does not rebuild the table. Do not apply to any other database. Do not run `wrangler deploy`. Do not merge to `main`.

## Preview verification

Preview URL and screenshots will be recorded after the Workers preview is live.

Test enquiry (to cancel after checks):

- Name: `TEST offer enquiry - delete me`
- Email: `qa@kaiyue.test`

Cancel on `/admin/bookings/:reference` or with `scripts/cancel-test-booking.sql` against D1 `069aa442` only. Do not delete live `[Sample]` offers.

## Limits

- Access is still not configured. Preview login remains the disposable `admin-test@kaiyue.test` operator.
- The leftover Markdown `/services/city-tours/special-offer` page still exists as a draft catalogue item; it is no longer in the City Tours booking dropdown.
- Special-offer titles and photos are staff-authored D1/R2 data. This task treats published `[Sample]` offers as read-only.
