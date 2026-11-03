# Promote optional Macau tour guide to main — handover

## Released (2026-11-03)

**Status:** `released` — established after this live verify.  
**Live SHA:** `7c9ca1d5a308f810a485dcc8edc852aa90a128cb`  
**PR:** [#21](https://github.com/Evanevia09/KaiYue-Travel/pull/21) squash-merged to `main`  
**Owner request:** Evan (2026-11-03 Asia/Macau) asked to make the tour-guide work live.  
**Live host:** https://kaiyue-travel.scalingsmb.workers.dev

Public-safe facts after promote:

- Evan asked 2026-11-03 Asia/Macau to make tour-guide live.
- PR #21 squash-merged to `main` as `7c9ca1d5a308f810a485dcc8edc852aa90a128cb`.
- Workers Builds on that commit succeeded. Live https://kaiyue-travel.scalingsmb.workers.dev serves optional Macau tour-guide copy.
- PM browser QA **PASS**:
  - Home, City Tours, and half-day show optional guide wording.
  - Half-day booking step 2 shows guide Yes/No and hides luggage.
  - Point-to-point restores luggage.
  - zh-Hant uses 包車接送 and 導遊.
  - Production `/admin` and `/login` still return 403 JSON.
  - Home console: 0 red errors.
- Shared D1 `0008` was already applied 2026-11-02 — not re-applied.
- No `wrangler deploy` from agents.

Do not re-apply `0008`. Do not weaken production admin gates. Do not run `wrangler deploy` from an agent.

---

## Promote record (pre-merge)

**Date:** 2026-11-03  
**Branch:** `cursor/promote-tour-guide-main-71d8` (based on `staging` `a66caec8e0f00afea79c821e1ac291f62679c978`, merged `origin/main` `952160998a5e658173712194c7e47b2032279978`)  
**Promote-branch tip before squash:** `d7abff8e240834d60ad560eb8b871d709edc299c`  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/21 into `main` (squash-merged as `7c9ca1d5a308f810a485dcc8edc852aa90a128cb`)  
**Owner request:** Evan (2026-11-03 Asia/Macau) — “can you make it live”.

This increment made the optional Macau tour-guide work mergeable to production. It did not invent a guide price, change production admin gates, or apply D1 migrations.

## Source SHAs

- Staging tip: `a66caec8e0f00afea79c821e1ac291f62679c978` (docs PR #20; records the staging merge and D1 0008 apply)
- Tour-guide squash on staging: `be4558287dd4dcc2176b93ff13c5f88c70fc3378` (PR #19)
- Prior `main`: `952160998a5e658173712194c7e47b2032279978` (2026-10-30 promote: admin zh-Hant + 包車接送)
- Merge-base before this promote: `aeaf9d4bd2a38303c475fb3f6032e4417dc3222b`
- Live `main` after squash-merge: `7c9ca1d5a308f810a485dcc8edc852aa90a128cb` (PR #21)

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

There is no separate production D1 binding in this repository. Migration `0008_booking_tour_guide.sql` was applied on that shared remote D1 on 2026-11-02 11:41:12 UTC (`bookings.tour_guide_requested` INTEGER; `d1_migrations` row recorded). **Do not re-apply.** Do not invent a second production D1 apply. The 2026-11-03 live promote did not re-apply it.

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

Workers Builds for this repository upload from repo-root `wrangler.jsonc`. After PR #21 merged to `main`, Workers Builds succeeded on `7c9ca1d5a308f810a485dcc8edc852aa90a128cb` and published live. Agents must not run `wrangler deploy`. If a later Workers Builds publish fails, PM should use the usual Cloudflare Workers Builds production path — not a one-off agent deploy — unless Evan explicitly asks.

## Status gates

- Evan’s 2026-11-03 request to make tour-guide live is the owner approval for this promote. A separate `user_accepted` ritual is not required beyond that ask.
- `released` is established after the `main` squash-merge **and** the PM live production verify recorded above.

## Live verify (completed)

On the production host, PM verified:

1. Home, City Tours catalogue, and half-day mention optional professional Macau tour-guide copy. No published guide price.
2. Half-day booking step 2 asks Yes/No for the guide and hides luggage. Point-to-point restores luggage.
3. `/zh-Hant` uses 包車接送 and 導遊.
4. `/admin` and `/login` still return 403 JSON.
5. Home console: 0 red errors.

Do not run `wrangler deploy` unless Workers Builds fail and Evan asks for a manual upload. Do not re-apply `0008`.

## Verification

Local on `cursor/promote-tour-guide-main-71d8` (pre-merge):

- Conflict markers gone. Merge parents: staging `a66caec8` and `origin/main` `9521609`.
- `pnpm lint` clean; `pnpm typecheck` 0 errors (3 existing hints); `pnpm test` 108/108 including production admin-gate 403; `pnpm build` completed.
- Production admin-gate test still forbids `/admin` and `/api/auth` on `kaiyue-travel.scalingsmb.workers.dev`.
- Built half-day / full-day HTML mentions an optional professional Macau tour guide and no published guide price.
- Built `/zh-Hant` home and airport HTML still use 包車接送.

Live after squash-merge (2026-11-03):

- Workers Builds succeeded on `7c9ca1d5a308f810a485dcc8edc852aa90a128cb`.
- PM browser QA **PASS** on https://kaiyue-travel.scalingsmb.workers.dev as listed in **Released**.
- Shared D1 `0008` was not re-applied. No agent `wrangler deploy`.

Not verified here: Cloudflare Access; staff-authored D1 offer copy; a full production booking/admin/accessibility/performance/security pass beyond the PM tour-guide checks above.
