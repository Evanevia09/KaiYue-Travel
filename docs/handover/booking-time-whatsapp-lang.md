# Booking time picker, required WhatsApp, language labels — handover

## Released (2026-11-03)

**Status:** `released` — established after this live verify.  
**Live SHA:** `870c536fe4b05e0028e166997e367259c54ce100`  
**PR:** [#24](https://github.com/Evanevia09/KaiYue-Travel/pull/24) squash-merged to `main`  
**Owner request:** Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.  
**Live host:** https://kaiyue-travel.scalingsmb.workers.dev

Public-safe facts after promote:

- Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.
- PR #24 squash-merged to `main` as `870c536fe4b05e0028e166997e367259c54ce100` (head was `b3ff757555bfaeaae285d6c4bd7cfb81c1247240` on `cursor/promote-booking-ux-to-main-25d7`; base had been `96390fa27faefd6d1c1cc4435e74ff344b0ad218`).
- Workers Builds on `main` SUCCESS for that SHA. Live https://kaiyue-travel.scalingsmb.workers.dev published.
- Live browser QA **PASS** (390×844):
  - Language switcher shows English / Português / 繁體中文 (no 聯合國 / 葡萄牙).
  - Time picker blank `--:--`; Save disabled until hour and minute are chosen.
  - WhatsApp required on the WhatsApp tab; email phone optional.
  - Console clean.
- Production `/admin` and `/login` still return 403 JSON gate `Admin access is not configured` (requestId gate).
- Shared D1 `0008` was already applied 2026-11-02 — not re-applied. Staging tip that was promoted: `3fb823629c1412007af40f40b32a4183b739e08b` (PR #23).
- No `wrangler deploy` from agents.

Do not re-apply `0008`. Do not weaken production admin gates. Do not run `wrangler deploy` from an agent.

---

## Feature record

**Date:** 2026-11-03  
**Staging PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/23  
**Staging tip:** `3fb823629c1412007af40f40b32a4183b739e08b`  
**Decision:** Evan (2026-11-03, Asia/Macau) — fix the mobile booking time wheels so touch scroll stays inside the hour/minute columns; start time blank (`--:--`) and require an explicit choice; make the WhatsApp number required; show language names in the public language switcher, not country/entity names.

This increment was implemented on a staging PR and later promoted to live. Production `/admin` and `/login` 403 gates, D1/R2 bindings, and `wrangler deploy` were not changed. Traditional Chinese transfer wording stays 包車接送. Half-day/full-day Macau tour-guide Yes/No stays as already released on live.

## Promote record (pre-merge)

**Status:** promote completed. `released` established after the live verify recorded above.  
**Owner request:** Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.  
**Promote branch:** `cursor/promote-booking-ux-to-main-25d7`  
**PR into `main`:** https://github.com/Evanevia09/KaiYue-Travel/pull/24 (squash-merged as `870c536fe4b05e0028e166997e367259c54ce100`)  
**Head vs base:** staging tip `3fb823629c1412007af40f40b32a4183b739e08b` (PR #23) merged with `origin/main` `96390fa27faefd6d1c1cc4435e74ff344b0ad218`  
**Promote-branch tip before squash:** `b3ff757555bfaeaae285d6c4bd7cfb81c1247240`  
**Staging QA:** already **PASS** on the staging alias.  
**Live browser QA:** **PASS** on https://kaiyue-travel.scalingsmb.workers.dev (390×844), as listed in **Released**.

This promote kept live tour-guide (#21/#22) and 包車接送 (#17) and added the booking UX from staging. No `wrangler deploy` from agents. Production `/admin` and `/login` stay 403 until Cloudflare Access is configured.

See also `docs/handover/promote-staging-to-main.md`.

## What changed

- Time picker lives in `apps/web/src/components/booking/DateTimePicker.tsx` (`TimeWheel` / `TimePanel`), with helpers in `datetime.ts` and styles in `apps/web/src/styles/global.css`.
- Hour and minute wheels now capture wheel/touch gestures (`touch-action: none`, `overscroll-behavior: contain`, non-passive listeners, pointer capture). The mobile time sheet uses `overflow: hidden`, and opening the picker locks `document.body` overflow so the page behind does not scroll.
- A new day still does not commit a clock time. Wheels and the footer start at `--` / `--:--`. Save stays disabled until both hour and minute are chosen.
- Shared booking schema requires `phone` when `communicationChannel` is `whatsapp`. Email phone stays optional. Client label is `Your WhatsApp Number *` (pt / zh-Hant reviewed keys included).
- Public language menu labels stay `English` / `Português` / `繁體中文`. The zh-Hant dictionary no longer maps those words to 聯合國 / 葡萄牙. The menu has `data-no-localize` so only the locale prefix changes.

## Live verify (completed)

On the production host, PM verified at 390×844:

1. Language switcher shows English / Português / 繁體中文, never 聯合國 / 葡萄牙.
2. Time picker starts blank `--:--`. Save stays disabled until both hour and minute are chosen.
3. WhatsApp tab requires a WhatsApp number. Email phone remains optional.
4. Console clean.
5. `/admin` and `/login` still return 403 JSON (`Admin access is not configured` requestId gate).

Do not run `wrangler deploy` unless Workers Builds fail and Evan asks for a manual upload. Do not re-apply `0008`.

## Limits

- `released` established after the live verify on `870c536fe4b05e0028e166997e367259c54ce100`.
- Physical-device iOS Safari was not separately recorded beyond the 390×844 live pass.
- Local Chrome mobile emulation (390×844, touch) on `/zh-Hant` had already confirmed language names, blank `--:--`, wheel-scroll containment, and required WhatsApp before promote. Portuguese and English menus were covered by unit tests.

## Tip SHA

- Staging squash: `3fb823629c1412007af40f40b32a4183b739e08b` (PR #23).
- Live `main` after squash-merge: `870c536fe4b05e0028e166997e367259c54ce100` (PR #24).
