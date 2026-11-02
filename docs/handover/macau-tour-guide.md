# Optional Macau tour guide — handover

**Date:** 2026-11-02  
**Branch:** `cursor/macau-tour-guide-addon-2357`  
**Base:** `staging` only. Do not merge to `main` or touch production.  
**Decision:** Evan (2026-11-02, Asia/Macau) — guests can optionally request a professional Macau tour guide with City Tour packages. It is not included by default. Staff quote later from the enquiry. Macau only; do not invent a guide price.

This increment adds public copy and a booking-step question for half-day (6h) and full-day (10h) packages. Production `/admin` and `/login` 403 gates, D1/R2 bindings, and `wrangler deploy` were not changed.

## What changed

- Home City Tours section (EN / pt / zh-Hant) states that a professional Macau tour guide can be added to packages, not included by default, quoted later.
- City Tours catalogue intro, scope note, and half-day / full-day cards mention the same optional add-on. Special offer copy mentions it lightly. No Hong Kong, Mainland, or other-city guide claim.
- Half-day and full-day package pages / Markdown add the same wording. Shared terms no longer only say guiding is “separate”; they say it can be requested and quoted later. No published guide price.
- About visitor/partner portfolio cards mention an optional professional Macau tour guide. No new partners or operational claims.
- Booking widget step 2: half-day and full-day hide luggage and ask yes/no for a professional Macau tour guide. Other journeys keep luggage. Special Offer enquiries keep luggage.
- Additive D1 column `tour_guide_requested` (`migrations/0008_booking_tour_guide.sql`). Preference is stored on the booking, in notes, in staff email, in the WhatsApp body, and on `/admin/bookings/:reference`.
- Traditional Chinese transfer wording remains 包車接送. Guide copy uses 導遊, not 接送.

## How to verify

Apply the additive migration on the **staging** D1 only, after review. Do not run `wrangler deploy`. Do not apply this to production D1 from this branch.

```sh
npx wrangler d1 migrations apply kaiyue-travel-staging --remote --config wrangler.jsonc
```

Then on a Workers preview of this branch:

1. Home (EN, `/pt`, `/zh-Hant`): City Tours intro mentions an optional professional Macau tour guide, not included by default, quoted later. Half-day and full-day cards show the optional-guide line. Transfer wording still uses 包車接送 on `/zh-Hant`.
2. `/services/city-tours` and `/services/city-tours/half-day`, `/full-day`: catalogue and package copy mention the add-on. Special offer mentions it lightly. No fare or guide price is listed.
3. `/about` (and locales): visitor and partner portfolio cards mention the optional Macau guide.
4. Booking widget on a half-day or full-day page: step 2 hides Big luggage / Hand carry and requires Yes/No for the guide. Submit by Email or WhatsApp. Staff admin detail, notes, email, and WhatsApp include the preference.
5. Airport / hourly / Special Offer booking: step 2 still shows luggage and does not ask for a guide.
6. Production host `/admin` and `/login` must still return 403.

## Limits

- Live staging D1 apply, preview browser pass, and production remain unverified until a human runs the steps above.
- Guide availability, price, and licensing are not published. Staff quote after review.
- Special Offers (D1 / GBA listing) were not given a dedicated guide question.
- `user_accepted` and `released` are not established.

## Tip SHA

Recorded after commit on this branch. See `PROJECT-STATE.md`.
