# Promote optional Macau tour guide to main — handover

**Date:** 2026-11-03  
**Branch:** `cursor/promote-tour-guide-main-71d8` (based on `staging` `a66caec8e0f00afea79c821e1ac291f62679c978`, merged `origin/main` `952160998a5e658173712194c7e47b2032279978`)  
**PR:** into `main` (see GitHub; do not merge from this agent)  
**Owner request:** Evan (2026-11-03 Asia/Macau) — “can you make it live”.

This increment makes the optional Macau tour-guide work mergeable to production. It does not invent a guide price, change production admin gates, or apply D1 migrations.

## Source SHAs

- Staging tip: `a66caec8e0f00afea79c821e1ac291f62679c978` (docs PR #20; records the staging merge and D1 0008 apply)
- Tour-guide squash on staging: `be4558287dd4dcc2176b93ff13c5f88c70fc3378` (PR #19)
- Prior `main`: `952160998a5e658173712194c7e47b2032279978` (2026-10-30 promote: admin zh-Hant + 包車接送)
- Merge-base before this promote: `aeaf9d4bd2a38303c475fb3f6032e4417dc3222b`

Staging PRs: [#19](https://github.com/Evanevia09/KaiYue-Travel/pull/19), [#20](https://github.com/Evanevia09/KaiYue-Travel/pull/20).

## What this promote includes

From `staging` (kept):

- Public EN / pt / zh-Hant copy that a professional Macau tour guide can be added to City Tour packages, not included by default, quoted later.
- Booking step 2 Yes/No (`tour_guide_requested`) on half-day and full-day; luggage stays on other journeys.
- Additive migration `0008_booking_tour_guide.sql`.
- Traditional Chinese transfer wording 包車接送 (guide copy uses 導遊, not 接送).

From `main` (kept, already present on staging):

- Oct 30 promote: admin zh-Hant, 包車接送, hero plates, header logo scroll, green WhatsApp icon.

Unchanged on purpose:

- Production `/admin`, `/login`, and `/api/auth` 403 gate (`apps/web/src/lib/server/admin-gate.ts`).
- `wrangler.jsonc` D1/R2 bindings and Access vars.
- No `wrangler deploy` from this task.

## D1 binding conclusion — shared, do not re-apply 0008

`wrangler.jsonc` on both `main` and `staging` binds the same database:

- Name: `kaiyue-travel-staging`
- Id: `069aa442-30c9-4454-ab3a-26eb372b3a1f`
- Binding: `DB`

There is no separate production D1 binding in this repository. Migration `0008_booking_tour_guide.sql` was applied on that shared remote D1 on 2026-11-02 11:41:12 UTC (`bookings.tour_guide_requested` INTEGER; `d1_migrations` row recorded). **Do not re-apply.** Do not invent a second production D1 apply.

## Conflict resolution

Merge used (`origin/main` into the staging-based task branch). Rebase of shared history was not used.

| File | How it was resolved |
| --- | --- |
| _(none)_ | `git merge origin/main` completed with the ort strategy and **no file conflicts**. |

Why it was clean: `main` was one squash commit ahead (`9521609`, PR #17). Staging already carried the same tree through `7f8dbf3` + `aeaf9d4`. After the merge, `HEAD` matched the staging parent file-for-file; the only delta versus `origin/main` is the 29 tour-guide files from PRs #19 and #20.

`admin-gate.ts`, middleware, and `wrangler.jsonc` have no diff versus either parent.

No secrets, passwords, private host paths, or credentials were added.

## Deploy path

GitHub Actions `check` (lint, typecheck, tests, production build) runs on pull requests and on push to `main`. It does **not** run `wrangler deploy`.

Workers Builds for this repository upload from repo-root `wrangler.jsonc`. After PM merges this PR to `main`, Workers Builds should deploy live automatically, as on the 2026-10-30 promote. This agent must not run `wrangler deploy`. If Workers Builds do not publish after merge, PM should use the usual Cloudflare Workers Builds production path — not a one-off agent deploy — unless Evan explicitly asks.

## Status gates

- Evan’s 2026-11-03 “can you make it live” is the owner approval to open this promote. A separate `user_accepted` ritual is not required beyond that ask.
- `released` is established only after the `main` merge **and** a live production verify by PM.

## After merge

On the production host, verify:

1. Home, City Tours catalogue, half-day / full-day pages, and About mention an optional professional Macau tour guide, not included by default, quoted later. No published guide price.
2. Half-day / full-day booking step 2 asks Yes/No for the guide and hides luggage. Airport / hourly / Special Offer still show luggage and do not ask for a guide.
3. `/zh-Hant` transfer wording still uses 包車接送.
4. `/admin` and `/login` still return 403.

Do not run `wrangler deploy` unless Workers Builds fail and Evan asks for a manual upload. Do not re-apply `0008`.

## Verification

Local on `cursor/promote-tour-guide-main-71d8`:

- Conflict markers gone. Merge parents: staging `a66caec8` and `origin/main` `9521609`.
- `pnpm lint` clean; `pnpm typecheck` 0 errors (3 existing hints); `pnpm test` 108/108 including production admin-gate 403; `pnpm build` completed.
- Production admin-gate test still forbids `/admin` and `/api/auth` on `kaiyue-travel.scalingsmb.workers.dev`.
- Built half-day / full-day HTML mentions an optional professional Macau tour guide and no published guide price.
- Built `/zh-Hant` home and airport HTML still use 包車接送.

Not verified here: live production after merge; Cloudflare Access; staff-authored D1 offer copy.
