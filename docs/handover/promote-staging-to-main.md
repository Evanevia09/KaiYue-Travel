# Promote staging to main — handover

## Released (2026-11-03) — Booking UX

**Status:** `released` — established after this live verify.  
**Live SHA:** `870c536fe4b05e0028e166997e367259c54ce100`  
**PR:** [#24](https://github.com/Evanevia09/KaiYue-Travel/pull/24) squash-merged to `main`  
**Owner request:** Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.  
**Live host:** https://kaiyue-travel.scalingsmb.workers.dev

Public-safe facts after promote:

- Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.
- PR #24 squash-merged to `main` as `870c536fe4b05e0028e166997e367259c54ce100` (head was `b3ff757555bfaeaae285d6c4bd7cfb81c1247240` on `cursor/promote-booking-ux-to-main-25d7`; base had been `96390fa27faefd6d1c1cc4435e74ff344b0ad218`).
- Workers Builds on `main` SUCCESS for that SHA. Live https://kaiyue-travel.scalingsmb.workers.dev published.
- Live browser QA **PASS** (390×844): language switcher English / Português / 繁體中文 (no 聯合國 / 葡萄牙); time picker blank `--:--` + Save disabled until hour+minute; WhatsApp required on WhatsApp tab; email phone optional; console clean.
- Production `/admin` and `/login` still return 403 JSON gate `Admin access is not configured` (requestId gate).
- Shared D1 `0008` was already applied 2026-11-02 — not re-applied. Staging tip that was promoted: `3fb823629c1412007af40f40b32a4183b739e08b` (PR #23).
- No `wrangler deploy` from agents.

Do not re-apply `0008`. Do not weaken production admin gates. Do not run `wrangler deploy` from an agent.

---

## 2026-11-03 — Booking UX promote (pre-merge)

**Status:** promote completed. `released` established after the live verify recorded above.  
**Owner request:** Evan asked push live 2026-11-03 ~8:28 PM Asia/Macau.  
**Promote branch:** `cursor/promote-booking-ux-to-main-25d7`  
**PR into `main`:** https://github.com/Evanevia09/KaiYue-Travel/pull/24 (squash-merged as `870c536fe4b05e0028e166997e367259c54ce100`)  
**Staging tip:** `3fb823629c1412007af40f40b32a4183b739e08b` (PR #23 squash-merge)  
**Main tip merged in:** `96390fa27faefd6d1c1cc4435e74ff344b0ad218`  
**Promote-branch tip before squash:** `b3ff757555bfaeaae285d6c4bd7cfb81c1247240`  
**Staging QA:** already **PASS**.  
**Live browser QA:** **PASS** (390×844) as listed in **Released**.

What this promote includes:

- From `staging` (kept): mobile time picker (wheel scroll contained; blank `--:--` until both hour/minute chosen), WhatsApp required on WhatsApp channel, language switcher shows English / Português / 繁體中文 (PR #23).
- From `main` (kept): released optional Macau tour-guide (#21 live, #22 released docs) and 包車接送 (#17).

Unchanged on purpose:

- No `wrangler deploy` from this task.
- Production `/admin` and `/login` stay 403 until Cloudflare Access is configured.
- Shared D1 `0008` already applied 2026-11-02 — not re-applied.
- `wrangler.jsonc` D1/R2 bindings were not edited.

Conflict files (manual, docs only): `HANDOVER.md`, `PROJECT-STATE.md`, `docs/06-booking-widget.md`, `docs/README.md`, `docs/handover/macau-tour-guide.md`. Product files auto-merged.

Feature report: `docs/handover/booking-time-whatsapp-lang.md`.

---

## 2026-10-30 — Admin zh-Hant + 包車接送 (PR #17)

**Date:** 2026-10-30  
**Branch:** `cursor/promote-staging-to-main-3426` (based on `staging` `dbcdbb48`, merged `origin/main` `9157ea43`)  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/17 into `main`  
**Database:** unchanged. No D1 migration. `wrangler.jsonc` D1 `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`) and R2 `kaiyue-offers-staging` were already identical on both branches and were not edited.  
**Owner request:** Evan (2026-10-30 Asia/Macau) — “ok promote to main”.

Staging and main had diverged. This increment makes the promote mergeable. It does not add product features beyond combining both sides and recording the resolution.

## What this promote includes

From `staging` (kept):

- Staff admin Traditional Chinese (`zh-Hant`) language switch and dictionaries (PR 15).
- Public and admin Chinese wording 接送 → 包車接送 (PR 16). English and Portuguese unchanged.

From `main` (kept):

- Hero / illustrative exterior plates with Kai Yue branding, Home Alphard revision, and matching WebP variants (`3e5228e`).
- Header logo scroll hide above 8px and green WhatsApp enquiry icon (`9157ea4`).

Unchanged on purpose:

- Production `/admin` and `/api/auth` 403 gate (`apps/web/src/lib/server/admin-gate.ts`).
- D1/R2 bindings and schema.
- No `wrangler deploy` from this task. Live deploy is expected from Workers Builds after `main` merge.

## Conflict resolution

Merge used (`origin/main` into the staging-based task branch). Rebase of shared history was not used.

| File | How it was resolved |
| --- | --- |
| `PROJECT-STATE.md` | Manual. Kept staging’s 2026-10-30 / 2026-10-17 copy-and-admin records and main’s 2026-10-22 hero-plate / header notes. Added this promote entry. |
| `apps/web/src/styles/global.css` | Auto-merged. Result keeps staging `.admin-locale-switch` rules and main `.site-header--scrolled` logo hide plus WhatsApp `#25d366`. |
| Hero / illustrative images, `header-menus.ts`, `docs/10-illustrative-image-set.md`, `docs/records/2026-10-22-hero-plate-prompts.json` | Taken from main with no conflict. |
| Admin i18n, zh-Hant dictionaries, `HANDOVER.md`, 包車接送 docs | Taken from staging with no conflict. |

No secrets, passwords, private host paths, or credentials were added.

## What was not changed

- Cloudflare Access is still not configured. Production admin stays fail-closed.
- Staff-authored D1 offer titles and descriptions are not in git. If any live Chinese offer copy still says 接送, update it in admin as a follow-up.
- Image-use and generated plate lettering remain illustrative. Fine lettering may vary from the source logo.

## After merge

Workers Builds should deploy live from `main`. Verify on the production host:

1. Header logo hides after scroll and returns at the top; WhatsApp chip is green.
2. Exterior heroes show branded plates; Home vehicle still matches the Alphard set.
3. `/zh-Hant` uses 包車接送 (no bare 接送 in product UI).
4. `/admin` and `/api/auth` still return 403.

Do not run `wrangler deploy` unless Workers Builds fail and Evan asks for a manual upload.

## Verification

Local on `cursor/promote-staging-to-main-3426`:

- Conflict markers gone. Merge-base with `origin/main` is `9157ea43`.
- `pnpm lint` clean; `pnpm typecheck` 0 errors (3 existing hints); `pnpm test` 102/102; `pnpm build` completed.
- Production admin-gate test still forbids `/admin` and `/api/auth` on `kaiyue-travel.scalingsmb.workers.dev`.
- Built `/zh-Hant` home, airport, and local-transfer HTML contain 包車接送.
- `global.css` keeps `.admin-locale-switch`, `.site-header--scrolled`, and WhatsApp `#25d366`.

Not verified here: live production after merge; Cloudflare Access; staff-authored D1 offer copy.
