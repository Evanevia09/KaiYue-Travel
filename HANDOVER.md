# Kai Yue Travel — handover log

Newest first. Public-safe notes only. Do not add secrets, passwords, private host paths, or credentials.

## 2026-11-13 — Version 2 photo recompression; public domain not yet updated

- **Branch:** `cursor/website-photos-v2-compress` from `staging`; PR into `staging`, then promote into `main`
- **Change:** 26 Version 2 JPEGs re-encoded at quality 88 (14.3 MB → 7.1 MB total), same dimensions. Images and docs only.
- **Live state:** `kaiyue-travel.scalingsmb.workers.dev` (GitHub-built) serves the Version 2 photos. `kaiyuemacau.com` and the Kai Yue account staging Worker still serve the previous photos; they are deployed manually from the unpushed `codex/kaiyue-staging-account` branch, so `main` merges do not reach them.
- **Do not:** deploy `main` to the Kai Yue account (it lacks that branch's admin Access gating); run `wrangler deploy` without Evan's explicit go-ahead.

## 2026-11-13 — Illustrative photo set Version 2

- **Branch:** `cursor/website-photos-v2` from `staging` `3fb82362`
- **PR:** into `staging`, then a promote PR into `main` (Evan asked to commit, open the PR, and promote)
- **Change:** All 32 files in `apps/web/public/images/illustrative/` replaced by Evan's Version 2 set under the same names. WebP variants and the About fleet JPEG were encoded from the supplied PNGs. Images only; no code, bindings, migrations, or admin gate changes.
- **Do not:** run `wrangler deploy`; weaken production `/admin` or `/api/auth` 403.

## 2026-11-03 — Booking time picker, required WhatsApp, language labels

- **Branch:** `cursor/booking-time-whatsapp-lang-d8c6`
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/23 (staging only)
- **Report:** `docs/handover/booking-time-whatsapp-lang.md`
- **Change:** Mobile time wheels keep touch scroll inside the hour/minute columns; time starts blank (`--:--`) and must be chosen; WhatsApp number is required on client and server; language switcher shows English / Português / 繁體中文, not 聯合國 / 葡萄牙.
- **Do not:** merge to `main`; run `wrangler deploy`; weaken production `/admin` or `/api/auth` 403.

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
