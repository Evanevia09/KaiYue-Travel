# Kai Yue Travel — handover log

Newest first. Public-safe notes only. Do not add secrets, passwords, private host paths, or credentials.

## 2026-11-10 — Temporary allowlisted admin login

- **task_id:** `kai-yue-temporary-admin-login-20261110`
- **Branch:** `cursor/temporary-admin-login-763f` targeting `staging` (not merged)
- **PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/26
- **Commit:** see PR #26 head after the staging merge and review fixes
- **Report:** `docs/handover/temporary-admin-login.md`
- **Change:** Reconstruct unpublished Access-host admin gate; stop treating the staging workers.dev host as production; explicit allowlisted password login with expiry. Review follow-up: loopback-only signup; Access disables password globally; email-idempotent seed; loopback vault-fill provisioning; wrangler `--env` required (`env.staging` / `env.production`). Merged `staging` `3fb82362` (no rebase/force).
- **D1/R2 in git config:** production `06cf879d-8fea-4088-8881-7d382e1b8c11` / `kaiyue-offers-production` under `env.production`; staging `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` / `kaiyue-offers-staging` under `env.staging`. Top-level is not a live Worker. Do not bind `069aa442…`.
- **Build split (2026-11-12):** GitHub Actions `check` on `f6c9274` is green (139 tests, run 43123457292). Red check is Cloudflare `Workers Builds: kaiyue-travel` production upload. Do not green it by removing `kaiyue-travel-env-required`.
- **t81u package:** `artifacts/kaiyue-staging-complete-5dab462.zip` sha256 `d10a3d7f117fcae626eeffa9b928781b082e1a7afae61c08bab54d29549ce923`. runtimeSourceSHA `5dab462`. Independent verifier uploads; this agent does not.
- **t96 host:** password dashboard `admin.kaiyuemacau.com` while Access unset. Extra Access-only 403 removed. No `staff.` subdomain. Owner accepted complete staging file replacement.
- **Do not:** merge or deploy from this source writer; `wrangler deploy`; retry production Workers Builds; mutate live staging allowlist/expiry; print a password or secret; claim `released`.

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
