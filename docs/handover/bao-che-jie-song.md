# Traditional Chinese 包車接送 wording — handover

**Date:** 2026-10-30  
**Branch:** `cursor/bao-che-jie-song-16fb`  
**PR target:** `staging` only. Do not merge to `main`.  
**Database:** unchanged. No D1 migration. Staging D1 and R2 bindings were not edited.  
**Owner request:** Evan (2026-10-30) — every Chinese UI phrase that says 接送 must say 包車接送 so the site clearly names a private-car / chauffeur service, not a taxi-style transfer.

This increment is a wording clarification only. English and Portuguese copy are unchanged. No new prices, licences, fleet, hours, or other marketing claims were added.

## What changed

- Public zh-Hant dictionaries (`zh-Hant.json` + reviewed overlay) now use 包車接送 in nav, titles, meta, buttons, form labels, FAQs, service and B2B copy, and SEO strings.
- Staff admin zh-Hant service labels: 機場包車接送, 酒店包車接送.
- WhatsApp / email booking summaries: 機場包車接送, 酒店包車接送, 點對點包車接送.
- Special Offers zh-Hant chrome: 司機包車接送優惠.
- Machine-translation tidy in `i18n-copy.ts` now maps leftover 轉讓 / 轉賬 to 包車接送 (not bare 接送).
- Existing 包車 strings that were not 接送 (for example 按小時包車) were left as-is. The replace skipped any 接送 already preceded by 包車 so 包車包車接送 cannot appear.

## What was not changed

- English and Portuguese dictionaries and UI.
- Staff-authored D1 offer titles and descriptions. Those rows are not in git. If any live Chinese offer copy still says 接送, update it in the admin editor as a follow-up.
- Production `/admin` and `/api/auth` 403 gate, `wrangler.jsonc` bindings, and schema.
- Historical handover tables that quote the previous 接送 labels (they document an earlier rename).

## Preview

Expected Workers preview after push (pattern used by earlier staging PRs):

- Branch: `https://cursor-bao-che-jie-song-16fb-kaiyue-travel.scalingsmb.workers.dev`

Confirm the live preview URL on the PR once Workers Builds finishes. Check `/zh-Hant`, `/zh-Hant/services/airport-transfer`, `/zh-Hant/services/local-transfers`, and admin service labels in 繁體中文.

## Verification

Automated: dictionary scan that no product zh-Hant string still has 接送 unless it is already 包車接送; typecheck; unit/integration tests; production build.

Not verified in this increment: live D1 offer copy; a logged-in admin browser pass; production.

## Cleanup

No new D1 rows or R2 objects. Do not run `wrangler deploy`. Do not merge to `main`.
