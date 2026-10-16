# Special Offers photos and dashboard speed — handover

**Date:** 2026-10-16
**Branch:** `cursor/special-offers-photos-dashboard-d4d6`
**PR target:** `staging` only. Do not merge to `main`.
**Database:** `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`), binding `DB`
**R2:** `kaiyue-offers-staging`, binding `OFFERS_BUCKET`

This increment makes Special Offers photos smaller and cache-safe, and makes `/admin` and `/admin/offers` load and update faster. It does **not** change D1 or R2 bindings in `wrangler.jsonc`.

## What changed

### Photo optimisation

- The admin editor resizes on a canvas before upload: long edge 1600px for the display file, 480px for a thumbnail, WebP when the browser supports it, otherwise JPEG.
- The Worker still checks magic bytes, MIME, and the 5 MB limit. Existing main-photo rules are unchanged: the first photo is main, staff can pick another, deleting the main photo promotes the next.
- Public cards use `srcset` (480w / 1600w), `sizes`, `width`/`height`, `loading="lazy"` (first card eager), and a reserved `aspect-ratio` so the grid does not jump.

### Instant updates

- Photo URLs are versioned with a content hash, for example `/api/v1/offers/:id/photos/:photoId/:hash` and `/thumb/:hash`.
- Versioned public photos send `Cache-Control: public, max-age=31536000, immutable`. Admin/draft photos stay private. Unversioned legacy URLs send `no-store`.
- `/special-offers`, `/pt/special-offers`, and `/zh-Hant/special-offers` send `Cache-Control: private, no-store` so publish, edit, and delete show up on the next request. `GET /api/v1/offers` already used `no-store`.

### Dashboard speed

- `/admin` and `/admin/offers` render the first payload on the server. The React island does not wait for a second list/summary fetch when that payload is present.
- Dashboard counts run as one D1 `batch()` instead of seven separate queries.
- Public offer lists read published rows only, using `idx_offers_status_updated`.
- Main-photo, photo delete, publish/unpublish, and offer delete are optimistic in the UI and roll back if the server rejects them. Upload shows optimise/upload progress. Double-click still no-ops while `busy` is set; Create draft still switches to PATCH on the saved id.

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
- English and Portuguese skip Noto Sans TC. Footer WeChat QR uses `loading="lazy"`.

### Migration `0006` vs live D1 `069aa442`

Already applied (`d1_migrations` id 6). Purely additive: extra `offer_photos` columns with defaults, plus `CREATE INDEX IF NOT EXISTS` on offers, offer_photos, and bookings. Main code does not select the new photo columns. Extra bookings indexes do not change query results. Safe for the live Worker that shares this D1. Do not merge this branch to `main`.

## Limits

- Access is still not configured. Preview login remains the disposable `admin-test@kaiyue.test` operator.
- Client canvas resize needs a real browser; API tests upload already-small fixtures.
- First Lighthouse pair above is from the Workers preview before the Home LCP follow-up. Live vs preview scores from the three-run check are recorded after the new preview deploys.
