# Special Offers photos and dashboard speed — handover

**Date:** 2026-10-16
**Branch:** `cursor/special-offers-photos-dashboard-d4d6`
**PR target:** `staging` only. Do not merge to `main`.
**Database:** `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`), binding `DB`
**R2:** `kaiyue-offers-staging`, binding `OFFERS_BUCKET`

This increment makes Special Offers photos smaller and cache-safe, and makes `/admin` and `/admin/offers` load and update faster. It does **not** change D1 or R2 bindings in `wrangler.jsonc`.

## What changed

### Photo optimisation

- The admin editor copies the chosen `FileList` (and dropped files) before clearing the input, then resizes on a canvas: long edge 1600px for the display file, 480px for a thumbnail, WebP when the browser supports it, otherwise JPEG. Originals up to 25 MB are accepted on the client; the resized file must stay under 5 MB. If resizing fails, the UI shows an error and does not upload the original.
- The Worker still checks magic bytes, MIME, and the 5 MB limit. Existing main-photo rules are unchanged: the first photo is main, staff can pick another, deleting the main photo promotes the next.
- Public cards use `srcset` (480w / 1600w), `sizes`, `width`/`height`, `loading="lazy"` (first card eager), and a reserved `aspect-ratio` so the grid does not jump.

### Instant updates

- Photo URLs are versioned with a content hash, for example `/api/v1/offers/:id/photos/:photoId/:hash` and `/thumb/:hash`.
- Versioned public photos send `Cache-Control: public, max-age=31536000, immutable`. Admin/draft photos stay private. Unversioned legacy URLs send `no-store`.
- `/special-offers`, `/pt/special-offers`, and `/zh-Hant/special-offers` send `Cache-Control: private, no-store` plus Cloudflare CDN `no-store` so publish, edit, and delete show up on the next request. `GET /api/v1/offers` JSON uses the same headers. Offer and photo deletes remove unique R2 display and thumbnail keys one by one.

### Dashboard speed

- `/admin` and `/admin/offers` render the first payload on the server. The React island does not wait for a second list/summary fetch when that payload is present.
- Dashboard counts run as one D1 `batch()` instead of seven separate queries.
- Public offer lists read published rows only, using `idx_offers_status_updated`.
- Main-photo, photo delete, publish/unpublish, and offer delete are optimistic in the UI and roll back if the server rejects them. Upload shows optimise/upload progress. Double-click still no-ops while `busy` is set; Create draft still switches to PATCH on the saved id. The Updated column is formatted in `Asia/Macau` with explicit 2-digit parts so Worker SSR and Chrome hydration match.
- Publish/unpublish labels use `publish:${id}` / `unpublish:${id}` busy keys so an optimistic flip to `published` does not render **Unpublishing…**. Publish is two D1 batches (load offer+photos, then UPDATE+audit) instead of sequential load, UPDATE, reload, and audit insert. Better Auth session cookie cache (60 s) skips extra session D1 reads on the POST. Mutating `adminFetch` uses `keepalive`, and `beforeunload` warns if staff leave during an in-flight write.

### Migration `0006_offer_photo_variants.sql`

Apply **only** to staging D1 `069aa442`:

```bash
npx wrangler d1 migrations apply kaiyue-travel-staging --remote --config wrangler.jsonc
```

Adds `content_hash`, `thumb_object_key`, `width`, `height`, `byte_size` on `offer_photos`, plus indexes:

- `idx_offers_updated`
- `idx_offer_photos_hash`
- `idx_bookings_status_created`
- `idx_bookings_status_updated`
- `idx_bookings_notification_state`

Do not apply to any other database. Do not run `wrangler deploy`. Do not merge to `main`.

## Cleanup

Use a TEST title such as `TEST photo speed` for preview offers. After checks, delete that offer from `/admin/offers` so the public page returns to its previous published set. Do not leave 4000px originals in R2; the upload path stores only the resized variants.

The 2026-10-16 preview check created `TEST photo speed` (`b45d7a3e-…`), published it, swapped the main photo, deleted one photo, then deleted the offer. Staging D1 afterwards contained only the earlier leftover draft titled `Test` (`c820d7d4-…`), which this task did not delete.

## Preview verification (2026-10-16)

Preview: `https://bd89586f-kaiyue-travel.scalingsmb.workers.dev`

Branch preview: `https://cursor-special-offers-photos-dashboard-d4d6-kaiyue-travel.scalingsmb.workers.dev`

Compared with previous Special Offers preview `https://9c070e6d-kaiyue-travel.scalingsmb.workers.dev`.

`0006_offer_photo_variants.sql` applied to staging D1 `069aa442` only.

### Photo byte sizes (4000×3000 JPEG → client canvas WebP)

| File | Original JPEG | Display WebP (1600×1200) | Thumbnail WebP (480×360) |
| --- | ---: | ---: | ---: |
| test-offer-1 | 1,325,866 | 127,686 | 27,790 |
| test-offer-2 | 1,343,751 | 130,598 | 28,284 |
| test-offer-3 | 1,301,287 | 126,042 | 26,804 |

About 90% smaller on the display file. Public photo response: `image/webp`, `Cache-Control: public, max-age=31536000, immutable`.

### Admin load (logged-in Chrome, `networkidle0`)

| Page | Before (extra API after HTML) | After (payload in HTML, no list/summary fetch) |
| --- | --- | --- |
| `/admin` | HTML 367 ms + `/api/v1/admin/summary` 466 ms | HTML 465 ms, 0 API |
| `/admin/offers` | HTML 607 ms + `/api/admin/offers` 521 ms | HTML 576 ms, 0 API |

### Public freshness

- `/special-offers`, `/pt/special-offers`, `/zh-Hant/special-offers`: `Cache-Control: private, no-store` (before: no cache header, so Workers heuristic 2 h).
- Publish, main-photo swap, photo delete, and offer delete were visible on the next public request. Swap changed the card `src` immediately. Console errors: none.

### Lighthouse mobile performance

| Page | Before | After |
| --- | ---: | ---: |
| Home `/` | 72 | 56 (second run also 56; Home was not changed in this work) |
| `/special-offers` empty | 92 | 92 |

CLS on Home stayed 0.228 in both runs (pre-existing). Empty `/special-offers` CLS 0.

## Staging merge and Home Lighthouse (2026-10-16 follow-up)

Merged `origin/staging` at `3e6e310` (WeChat QR placeholder from PR 9). The only conflict was `PROJECT-STATE.md`.

### Shared Home-path audit

The photo/dashboard PR loaded two shared files on Home:

- `apps/web/src/styles/global.css` — added `.admin-upload-progress` only. Home does not use that class.
- `apps/web/src/middleware.ts` — sets `private, no-store` only when the path is `/special-offers`. Home cache headers are unchanged.

It did not change `BaseLayout.astro`, Home `index.astro`, Google Fonts, booking islands, or the hero JPEG. Live `https://kaiyue-travel.scalingsmb.workers.dev/` HTML matched the previous preview hero, PNG logo, and Inter+Noto font link. Live already includes `/images/wechat-qr.svg` from PR 9. The earlier 72→56 pair is not explained by a Home layout/script/font change in this PR.

### Home LCP work in this follow-up

- Home hero: WebP srcset 800/1200/1672 w (37/68/111 KB vs 259 KB JPEG), `fetchpriority=high`, preload, width/height 1672×941.
- Header/footer logo: WebP 28 KB at 624×122 with the original PNG fallback, instead of two 134 KB 1500px PNGs. Footer logo is lazy.
- English and Portuguese skip Noto Sans TC. Google Fonts CSS is `media=print` until load so it does not block the Home `h1`. Footer WeChat QR uses `loading="lazy"`.

New preview: `https://949dbb5a-kaiyue-travel.scalingsmb.workers.dev`

### Lighthouse mobile Home (three runs each, same CLI)

| Target | Run 1 | Run 2 | Run 3 | Median | LCP |
| --- | ---: | ---: | ---: | ---: | --- |
| Live `kaiyue-travel.scalingsmb.workers.dev` | 69 | 69 | 70 | 69 | 4.5–4.7 s |
| Previous photo preview `bd89586f` | 57 | 57 | 57 | 57 | 6.2–6.4 s |
| This follow-up `949dbb5a` | 86 | 87 | 77 | 86 | 2.0–3.2 s |

All three new-preview runs are at or above the original 72. Best new-preview LCP 2.0 s (FCP 1.6 s). Hero transfer 37,635 B WebP vs 258,528 B JPEG. Logo transfer 28,755 B WebP vs 134,024 B PNG. Inter CSS 1,273 B vs the previous Inter+Noto sheet (~104 KB). `/special-offers` stayed 92, CLS 0. Home CLS 0.23 remains on some runs (pre-existing booking-widget shift).

### Migration `0006` vs live D1 `069aa442`

Already applied (`d1_migrations` id 6). Purely additive: extra `offer_photos` columns with defaults, plus `CREATE INDEX IF NOT EXISTS` on offers, offer_photos, and bookings. Main code does not select the new photo columns. Extra bookings indexes do not change query results. Safe for the live Worker that shares this D1. Do not merge this branch to `main`.

## Browser QA blockers (2026-10-16)

Fixes on the same staging PR after Chrome QA on `949dbb5a`. Do not merge to `main`.

1. **Chrome file input.** `takeInputFiles` copies `Array.from(input.files)` before `input.value = ""`. Drag-and-drop uses `filesFromDataTransfer`. Playwright `setInputFiles` covers the copy-before-clear path; the preview UI test uploads a 4000px JPEG over 5 MB and waits for the progress bar.
2. **Size limit.** Client originals up to 25 MB; 5 MB is enforced on the resized output. Resize/encode failure surfaces “Could not resize this photo…” and does not upload the original. Server stays at 5 MB.
3. **Hydration.** `formatWhen` builds `dd/mm/yyyy, hh:mm` from `formatToParts` in `Asia/Macau`, so Worker SSR and Chrome match.
4. **Home waste.** Hero preload includes `imagesrcset` 800/1200/1672 so it matches the candidate the `<picture>` actually uses. Below-fold `hero-home` and city-tour card JPEGs are lazy WebP (`hero-home.webp` 89 KB vs 192 KB JPEG; city-tour 800.webp 51/68 KB vs 309 KB JPEG). Google Fonts no longer load Noto Sans TC (~1 MB of CJK chunks); zh-Hant uses PingFang TC / Microsoft JhengHei with Inter `display=swap`. That Noto cascade plus unused preload and eager below-fold JPEGs was what kept Home from reaching network idle.
5. **Delete.** Public list JSON and `/special-offers` HTML send Cloudflare CDN `no-store`. R2 `deleteMany` removes unique display and thumbnail keys one by one. Tests assert the public list is empty and both object keys are gone.
6. **zh-Hant footer.** Address translation keeps `600-E`.

Measured preview: `https://0c0d8103-kaiyue-travel.scalingsmb.workers.dev` (`a788ea4`). Prettier-only follow-up is `https://5499a601-kaiyue-travel.scalingsmb.workers.dev` (`12ada18`).

### Preview re-check (2026-10-16)

- Chrome `setInputFiles` on `/admin/offers` uploaded a 4000×3000 JPEG of 9,071,564 bytes. The UI showed “Optimising photo 1 of 1…” and the progress bar, then “Photo uploaded.” Stored display WebP was 1600×1200 / 730,358 bytes; thumbnail 103,418 bytes. No React #418 / hydration errors.
- Publish appeared on `GET /api/v1/offers` and `/special-offers` HTML immediately. After delete the public list was `[]`, the HTML no longer contained the TEST title, and both display and thumbnail URLs returned 404. R2 key removal is also covered by the integration test (`objectKey` and `thumbObjectKey` both null after DELETE). TEST offer `af27110c-…` was deleted. The earlier leftover draft titled `Test` was left in place.
- zh-Hant footer: `澳門羅理基博士大馬路600-E號, 第一國際商業中心, 16/F, P16-07, 澳門`.
- Home networkidle in ~1.0 s (21 requests). No Noto Sans TC. No `hero-home.jpg` / `city-tours-*.jpg` downloads; lazy WebP used instead. Inter `display=swap` only.

### Lighthouse mobile Home (three runs each, same CLI as the previous follow-up)

| Locale | Run 1 | Run 2 | Run 3 | Median | LCP |
| --- | ---: | ---: | ---: | ---: | --- |
| EN `/` | 88 | 77 | 77 | 77 | 1.7–3.2 s |
| zh-Hant `/zh-Hant/` | 77 | 77 | 77 | 77 | 3.3 s |

Total transfer ~507–508 KiB (was ~1 MB of Noto chunks on zh-Hant before). `font-display` score 1. Offscreen-images score 1. Home CLS 0.21–0.23 remains (booking widget).

## Publish label and latency (2026-10-16)

Recheck of `0c0d8103` passed except Publish taking ~5 s with the button reading **Unpublishing…**. Cause: optimistic `status = published` plus a shared `status:${id}` busy key, so the Unpublish branch rendered during the POST. The delay was sequential D1: Better Auth `getSession` (several queries) + load offer + load photos + UPDATE + load offer + load photos + audit INSERT.

Fixes on this branch (same staging PR, not merged):

- Button label follows the target action (`Publishing…` / `Unpublishing…`).
- D1 publish path: one batched load, one batched UPDATE+audit, in-memory return (no second load).
- Better Auth `session.cookieCache` (60 s) so the publish POST does not repeat session D1 reads after `/admin/offers` has already authenticated.
- `keepalive` on mutating admin fetches and a `beforeunload` warning while `busy` is set, so navigating away does not abort the write.

Preview verification of this fix is recorded after the new Workers preview is up.

## Limits

- Access is still not configured. Preview login remains the disposable `admin-test@kaiyue.test` operator.
- Client canvas resize needs a real browser; API tests upload already-small fixtures.
- Preview TTFB is higher than live (~210–230 ms vs ~30 ms). Scores are from this environment’s Lighthouse CLI, not PageSpeed Insights.
