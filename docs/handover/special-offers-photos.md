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

## Limits

- Access is still not configured. Preview login remains the disposable `admin-test@kaiyue.test` operator.
- Client canvas resize needs a real browser; API tests upload already-small fixtures.
- Lighthouse and admin timings below are from the Workers preview on this branch, not production.
