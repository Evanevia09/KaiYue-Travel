# Booking time picker, required WhatsApp, language labels — handover

**Date:** 2026-11-03  
**Base:** `staging` only. Do not merge to `main` or touch production.  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/23  
**Decision:** Evan (2026-11-03, Asia/Macau) — fix the mobile booking time wheels so touch scroll stays inside the hour/minute columns; start time blank (`--:--`) and require an explicit choice; make the WhatsApp number required; show language names in the public language switcher, not country/entity names.

This increment stays on a staging PR. Production `/admin` and `/login` 403 gates, D1/R2 bindings, and `wrangler deploy` were not changed. `main` and production remain untouched. Traditional Chinese transfer wording stays 包車接送. Half-day/full-day Macau tour-guide Yes/No is unchanged.

## What changed

- Time picker lives in `apps/web/src/components/booking/DateTimePicker.tsx` (`TimeWheel` / `TimePanel`), with helpers in `datetime.ts` and styles in `apps/web/src/styles/global.css`.
- Hour and minute wheels now capture wheel/touch gestures (`touch-action: none`, `overscroll-behavior: contain`, non-passive listeners, pointer capture). The mobile time sheet uses `overflow: hidden`, and opening the picker locks `document.body` overflow so the page behind does not scroll.
- A new day still does not commit a clock time. Wheels and the footer start at `--` / `--:--`. Save stays disabled until both hour and minute are chosen.
- Shared booking schema requires `phone` when `communicationChannel` is `whatsapp`. Email phone stays optional. Client label is `Your WhatsApp Number *` (pt / zh-Hant reviewed keys included).
- Public language menu labels stay `English` / `Português` / `繁體中文`. The zh-Hant dictionary no longer maps those words to 聯合國 / 葡萄牙. The menu has `data-no-localize` so only the locale prefix changes.

## How to verify

On a Workers preview or local site of this staging branch. Do not run `wrangler deploy`. Do not merge to `main`.

1. Mobile viewport (about 390px), Home or a service page: open pickup date, choose a day, open time. The display is `--:--`, not 12:00. Save/Confirm stay disabled until both hour and minute are chosen.
2. Drag/flick the hour and minute columns. The wheels change; the page behind does not scroll.
3. Communication step, WhatsApp: leave the number blank and continue — client and API reject it. A valid number (for example `+853 6234 5678`) can continue. Email phone remains optional. Repeat on `/pt` and `/zh-Hant`.
4. On `/zh-Hant` (and `/pt`, `/`), open the language switcher. Labels are English / Português / 繁體中文, never 聯合國 / 葡萄牙. Each option only changes `/`, `/pt`, or `/zh-Hant`.
5. Half-day / full-day booking step 2 still asks the Macau tour-guide Yes/No. Transfer wording on `/zh-Hant` remains 包車接送.
6. Production host `/admin` and `/login` must still return 403.

## Limits

- Physical-device iOS Safari and a deployed Workers preview were not verified in this increment.
- Local Chrome mobile emulation (390×844, touch) on `/zh-Hant` confirmed language names, blank `--:--`, wheel-scroll containment, and required WhatsApp. Portuguese and English menus were covered by unit tests.
- `user_accepted` and `released` are not established.

## Tip SHA

Record the merge commit on `staging` after review. See `PROJECT-STATE.md`.
