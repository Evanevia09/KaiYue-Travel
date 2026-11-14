# Kai Yue Travel — handover log

Newest first. Public-safe notes only. Do not add secrets, passwords, private host paths, or credentials.

## 2026-11-15 — Production-safe staff-dashboard UX candidate from live 9ff81925 (prepare-only)

- **Branch:** `cursor/promote-staff-dashboard-ux-from-live-2cad` from `9ff81925d722bb5f9fbdd2af3ef609d72ada8ecc`. Separate from PR #33, PR #34 (`dad60edf` / `d8c8bd20`), PR #26, and PR #32 (this SHA is PR #32 head; do not merge #32 or #34).
- **Change:** UX-only deltas from `8ed952a7` on the independently verified live source. Git `admin-gate.ts` / `middleware.ts` / `auth.ts` / `wrangler.jsonc` unchanged. Overlay `docs/records/wrangler.production-artifact.jsonc`: production D1 `06cf879d`, `run_worker_first=false`, no temp-admin/6-char/allowlist/secrets/staging bindings.
- **Report:** `docs/records/2026-11-15-production-staff-dashboard-ux-candidate.md`
- **Do not:** merge/upload/activate; retry Workers Builds; change production D1/DNS/Access; upload staging packages to live.
- **Statuses:** `implemented`/`checked` only after local gates in the report. Not `user_accepted` / `deployed` / `released`.

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
