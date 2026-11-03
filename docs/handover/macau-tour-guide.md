# Optional Macau tour guide — handover

**Date:** 2026-11-02 (staging); promote opened 2026-11-03  
**Feature branch:** `cursor/macau-tour-guide-addon-2357`  
**Staging merge:** `be4558287dd4dcc2176b93ff13c5f88c70fc3378` (squash of [PR #19](https://github.com/Evanevia09/KaiYue-Travel/pull/19); Mika staging-only approval)  
**Staging tip with docs:** `a66caec8e0f00afea79c821e1ac291f62679c978` ([PR #20](https://github.com/Evanevia09/KaiYue-Travel/pull/20))  
**Pre-merge implementation:** `328148bba97fa0fbdf8d84ae7cfc33723e1d7509`  
**Promote to main:** Evan (2026-11-03 Asia/Macau) — “can you make it live”. Promote branch `cursor/promote-tour-guide-main-71d8`. See `docs/handover/promote-tour-guide-to-main.md`. Live verify later recorded `released` after [PR #21](https://github.com/Evanevia09/KaiYue-Travel/pull/21) squash-merge `7c9ca1d5a308f810a485dcc8edc852aa90a128cb` and [PR #22](https://github.com/Evanevia09/KaiYue-Travel/pull/22) released docs.
**Decision:** Evan (2026-11-02, Asia/Macau) — guests can optionally request a professional Macau tour guide with City Tour packages. It is not included by default. Staff quote later from the enquiry. Macau only; do not invent a guide price.

This increment adds public copy and a booking-step question for half-day (6h) and full-day (10h) packages. Production `/admin` and `/login` 403 gates, D1/R2 bindings, and `wrangler deploy` were not changed. `main` and production remain untouched.

## Staging D1

`migrations/0008_booking_tour_guide.sql` is applied on **remote staging D1 only** (2026-11-02 11:41:12 UTC). Column `bookings.tour_guide_requested` (`INTEGER`) exists. `d1_migrations` has row `0008_booking_tour_guide.sql`. Do not re-apply. Do not apply this migration to production D1. Do not run `wrangler deploy`.

## What changed

- Home City Tours section (EN / pt / zh-Hant) states that a professional Macau tour guide can be added to packages, not included by default, quoted later.
- City Tours catalogue intro, scope note, and half-day / full-day cards mention the same optional add-on. Special offer copy mentions it lightly. No Hong Kong, Mainland, or other-city guide claim.
- Half-day and full-day package pages / Markdown add the same wording. Shared terms no longer only say guiding is “separate”; they say it can be requested and quoted later. No published guide price.
- About visitor/partner portfolio cards mention an optional professional Macau tour guide. No new partners or operational claims.
- Booking widget step 2: half-day and full-day hide luggage and ask yes/no for a professional Macau tour guide. Other journeys keep luggage. Special Offer enquiries keep luggage.
- Additive D1 column `tour_guide_requested`. Preference is stored on the booking, in notes, in staff email, in the WhatsApp body, and on `/admin/bookings/:reference`.
- Traditional Chinese transfer wording remains 包車接送. Guide copy uses 導遊, not 接送.

## How to verify

On a Workers preview or staging host of `be4558287dd4dcc2176b93ff13c5f88c70fc3378` (or later staging tip). Do not re-apply `0008`. Do not run `wrangler deploy`.

1. Home (EN, `/pt`, `/zh-Hant`): City Tours intro mentions an optional professional Macau tour guide, not included by default, quoted later. Half-day and full-day cards show the optional-guide line. Transfer wording still uses 包車接送 on `/zh-Hant`.
2. `/services/city-tours` and `/services/city-tours/half-day`, `/full-day`: catalogue and package copy mention the add-on. Special offer mentions it lightly. No fare or guide price is listed.
3. `/about` (and locales): visitor and partner portfolio cards mention the optional Macau guide.
4. Booking widget on a half-day or full-day page: step 2 hides Big luggage / Hand carry and requires Yes/No for the guide. Submit by Email or WhatsApp. Staff admin detail, notes, email, and WhatsApp include the preference.
5. Airport / hourly / Special Offer booking: step 2 still shows luggage and does not ask for a guide.
6. Production host `/admin` and `/login` must still return 403.

## Limits

- Guide availability, price, and licensing are not published. Staff quote after review.
- Special Offers (D1 / GBA listing) were not given a dedicated guide question.
- Live tour-guide `released` is recorded in `docs/handover/promote-tour-guide-to-main.md` after PR #21 / #22. This file remains the product handover for the increment.

## Tip SHA

Staging squash-merge: `be4558287dd4dcc2176b93ff13c5f88c70fc3378`. See `PROJECT-STATE.md`.
