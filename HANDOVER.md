# Kai Yue Travel — handover log

Newest first. Public-safe notes only. Do not add secrets, passwords, private host paths, or credentials.

## 2026-11-13 — Version 2 photos live on kaiyuemacau.com

- **Live:** Kai Yue Worker `kaiyue-travel` version `5b859f36` at 100% (apex and www). Previous public build plus the final Version 2 photos; built from local, unpushed `cursor/public-photos-v2` (`9ff8192`).
- **Rollback:** `wrangler versions deploy 74ebe1fc-135d-4a97-b297-e2d1d2748fa0@100% --name kaiyue-travel` on the Kai Yue account.
- **Verified:** all 32 images and 59 pages served as built on apex and www; `/admin`, `/api/auth/session`, `/api/v1/admin/summary` 403. Bindings identical to the previous version; routes untouched.
- **Not done:** Kai Yue staging Worker not redeployed (it carries the PR #26 temporary admin login). GitHub Builds for the Kai Yue account still pending.

## 2026-11-13 — Version 2 photo recompression; public domain not yet updated

- **Branch:** `cursor/website-photos-v2-compress` from `staging`; PR into `staging`, then promote into `main`
- **Change:** 26 Version 2 JPEGs re-encoded at quality 88 (14.3 MB → 7.1 MB total), same dimensions. Images and docs only.
- **Live state:** `kaiyue-travel.scalingsmb.workers.dev` (GitHub-built) serves the Version 2 photos. `kaiyuemacau.com` (Worker `kaiyue-travel`, version `74ebe1fc`, manually deployed from the unpushed `codex/kaiyue-staging-account` branch) and the Kai Yue account staging Worker (`kaiyue-travel-staging`, 2026-11-10 API upload carrying the PR #26 temporary admin login) still serve the previous photos. `main` merges do not reach either.
- **Do not:** deploy `main` to the Kai Yue account (it lacks that branch's admin Access gating); run `wrangler deploy` without Evan's explicit go-ahead.

## 2026-11-13 — Illustrative photo set Version 2 (staging, then promote)

- **Staging:** https://github.com/Evanevia09/KaiYue-Travel/pull/27 squash-merged to `staging` as `9027ee4`
- **Promote branch:** `cursor/promote-photos-v2-to-main` (staging `9027ee4` + merge `origin/main` `608c4f5`); PR into `main`
- **Change:** All 32 files in `apps/web/public/images/illustrative/` replaced by Evan's Version 2 set under the same names. WebP variants and the About fleet JPEG were encoded from the supplied PNGs. Images only; no code, bindings, migrations, or admin gate changes.
- **Preview:** https://cursor-website-photos-v2-kaiyue-travel.scalingsmb.workers.dev served all 32 images byte-identical to the commit; Home and About reference them.
- **Conflict files:** docs only. `docs/README.md` and two handover reports taken from `main`; `HANDOVER.md` and `PROJECT-STATE.md` take `main` plus this entry.
- **Do not:** run `wrangler deploy` (Workers Builds deploys from `main`); weaken production `/admin` or `/api/auth` 403.

## 2026-11-03 — Booking UX live verify (`released`)

- **Live SHA:** `870c536fe4b05e0028e166997e367259c54ce100` (PR #24 squash-merge to `main`)
- **Host:** https://kaiyue-travel.scalingsmb.workers.dev
- **Report:** `docs/handover/booking-time-whatsapp-lang.md` and `docs/handover/promote-staging-to-main.md`
- **Change:** Docs-only record. Workers Builds succeeded on `870c536`. Live browser QA **PASS** (390×844): language switcher English / Português / 繁體中文 (no 聯合國 / 葡萄牙); time picker blank `--:--` + Save disabled until hour+minute; WhatsApp required on WhatsApp tab; email phone optional; console clean. Production `/admin` and `/login` still 403 JSON gate `Admin access is not configured`.
- **D1:** Shared `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`). Migration `0008` already applied 2026-11-02 — not re-applied.
- **Do not:** run `wrangler deploy` from an agent; weaken `/admin` or `/login` 403; re-apply `0008`.

## 2026-11-03 — Promote booking UX to main

- **Branch:** `cursor/promote-booking-ux-to-main-25d7` (staging `3fb823629c1412007af40f40b32a4183b739e08b` + merge `origin/main` `96390fa27faefd6d1c1cc4435e74ff344b0ad218`)
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/24 into `main` (squash-merged as `870c536fe4b05e0028e166997e367259c54ce100`)
- **Report:** `docs/handover/booking-time-whatsapp-lang.md` and `docs/handover/promote-staging-to-main.md`
- **Owner request:** Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau
- **Change:** Promote staging booking UX (PR #23: mobile time picker + required WhatsApp + language names) to live. Keep released tour-guide (#21/#22) and 包車接送 (#17). Staging alias already QA PASS. Live verify and `released` are recorded in the 2026-11-03 live-verify entry above.
- **Do not:** run `wrangler deploy` from an agent; weaken production `/admin` or `/login` 403; touch Cloudflare Access.

## 2026-11-03 — Booking time picker, required WhatsApp, language labels

- **Branch:** `cursor/booking-time-whatsapp-lang-d8c6`
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/23 (squash-merged to `staging` as `3fb823629c1412007af40f40b32a4183b739e08b`)
- **Report:** `docs/handover/booking-time-whatsapp-lang.md`
- **Change:** Mobile time wheels keep touch scroll inside the hour/minute columns; time starts blank (`--:--`) and must be chosen; WhatsApp number is required on client and server; language switcher shows English / Português / 繁體中文, not 聯合國 / 葡萄牙.
- **Do not:** run `wrangler deploy`; weaken production `/admin` or `/api/auth` 403.

## 2026-11-03 — Tour-guide live verify (`released`)

- **Live SHA:** `7c9ca1d5a308f810a485dcc8edc852aa90a128cb` (PR #21 squash-merge to `main`)
- **Host:** https://kaiyue-travel.scalingsmb.workers.dev
- **Report:** `docs/handover/promote-tour-guide-to-main.md`
- **Change:** Docs-only record. Workers Builds succeeded on `7c9ca1d`. PM browser QA **PASS**: Home/City Tours/half-day optional guide wording; half-day step 2 Yes/No hides luggage; point-to-point restores luggage; zh-Hant 包車接送 and 導遊; production `/admin` and `/login` still 403 JSON; home console 0 red errors.
- **D1:** Shared `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`). Migration `0008` already applied 2026-11-02 — not re-applied.
- **Do not:** run `wrangler deploy` from an agent; weaken `/admin` or `/login` 403; invent a guide price; re-apply `0008`.

## 2026-11-03 — Promote optional Macau tour guide to main

- **Branch:** `cursor/promote-tour-guide-main-71d8` (staging `a66caec8` + merge `origin/main` `9521609`)
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/21 into `main` (squash-merged as `7c9ca1d5a308f810a485dcc8edc852aa90a128cb`)
- **Report:** `docs/handover/promote-tour-guide-to-main.md`
- **Change:** Promote staging tour-guide PRs #19 (`be455828`) and #20 (`a66caec8`) to live. Merge of `origin/main` had no file conflicts. Production admin/auth 403 gate and D1/R2 bindings unchanged.
- **D1:** Shared `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`). Migration `0008` already applied 2026-11-02 — do not re-apply.
- **Do not:** run `wrangler deploy` from an agent; weaken `/admin` or `/login` 403; invent a guide price.

## 2026-10-30 — Promote staging to main

- **Branch:** `cursor/promote-staging-to-main-3426` (staging `dbcdbb48` + merge `origin/main` `9157ea43`)
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/17 into `main`
- **Report:** `docs/handover/promote-staging-to-main.md`
- **Change:** Resolve the staging/main divergence so live promote is mergeable. Keep staging admin zh-Hant + 包車接送 copy, and main hero-plate / header-logo / WhatsApp-icon visuals. Production admin/auth 403 gate and D1/R2 bindings unchanged.
- **Conflict files:** `PROJECT-STATE.md` (manual); `global.css` auto-merged and keeps both sides.
- **Do not:** run `wrangler deploy` (Workers Builds should deploy from `main` after merge); weaken `/admin` or `/api/auth` 403.

## 2026-10-30 — zh-Hant 接送 → 包車接送

- **Branch:** `cursor/bao-che-jie-song-16fb`
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/16 into `staging` only
- **Commit:** `2d0c94d6b5923df21dcbfcd52291131d624b0d46`
- **Report:** `docs/handover/bao-che-jie-song.md`
- **Change:** Traditional Chinese UI copy that said 接送 now says 包車接送 (private-car / chauffeur wording). English and Portuguese unchanged. No new marketing claims. No D1/R2 or production admin-gate change.
- **Preview:** https://cursor-bao-che-jie-song-16fb-kaiyue-travel.scalingsmb.workers.dev (`/zh-Hant` confirmed)
- **CI:** GitHub `check` and Workers Builds green on `ff87fed`
- **Follow-up:** Staff-authored D1 offer titles/descriptions are not in git. Review live Chinese offer rows in admin if any still say 接送.
- **Do not:** merge to `main`; run `wrangler deploy`.

## Earlier notes

Prior increment handovers live under `docs/handover/`:

- [Staff dashboard Traditional Chinese](docs/handover/admin-zh-hant.md)
- [Greater Bay Area chauffeur copy](docs/handover/gba-chauffeur-copy.md)
- [Special Offers enquiry](docs/handover/special-offers-enquiry.md)
- [Special Offers photos](docs/handover/special-offers-photos.md)
- [Special Offers dashboard](docs/handover/special-offers-dashboard.md)
