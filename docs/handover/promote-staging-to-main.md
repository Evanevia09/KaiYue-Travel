# Promote staging to main — handover

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
