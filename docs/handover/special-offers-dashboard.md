# Special Offers dashboard — handover

**Date:** 2026-10-16  
**Branch:** `cursor/special-offers-dashboard-d246`  
**PR target:** `staging` only. Do not merge to `main`.  
**Database:** `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`), binding `DB`  
**R2:** `kaiyue-offers-staging`, binding `OFFERS_BUCKET`

This branch adds a staff Special Offers dashboard, a public published-only offers page, fail-closed production admin, and a preview-only test operator account. Production admin and auth routes stay 403 until Cloudflare Access is configured.

## What was implemented

- Additive migration `migrations/0005_special_offers.sql` (`offers`, `offer_photos`, `offer_audit_events`). Existing migrations 0001–0004 were not edited.
- Admin API at `/api/admin/offers` and `/api/v1/admin/offers`: list, create, edit, delete, publish, unpublish, photo upload/delete/main.
- Public API `GET /api/v1/offers` returns only published, complete offers (title, description, at least one photo with a main photo). Drafts are never exposed.
- Dashboard at `/admin/offers`. Public page at `/special-offers` (and `/pt`, `/zh-Hant`) with an empty state.
- Special Offers is in the main nav after City Tours. The City Tour menu keeps Half day and Full day. `/services/city-tours/special-offer` remains bookable.
- Offer storage is behind `OfferStore` / `ObjectStore` interfaces so tests run against in-memory fakes.
- Images: JPEG/PNG/WebP only, magic bytes plus MIME, 5 MB max, server-generated keys, no SVG. Delete removes R2 objects.
- Follow-on photo optimisation, immutable URLs, and dashboard speed: [special-offers-photos.md](special-offers-photos.md).

## Workers Build / wrangler (no dashboard change)

The live Workers Build uses the **repository-root** `wrangler.jsonc`. That file is now the full Worker (script + assets + D1 + R2), not the old static-only profile.

- **Dashboard root directory can stay at the repository root.** Do not change it to `apps/web` unless you also change the build/preview commands. That would be a dashboard change.
- `wrangler versions upload` uses the **top-level** config unless `--env` or `CLOUDFLARE_ENV` is set. Top-level `ENVIRONMENT` is `production` and `DEV_ADMIN_BYPASS` is `false`. The live non-production trigger is `npx wrangler versions upload`, so this branch also sets top-level `ADMIN_EMAILS=admin-test@kaiyue.test`. This Worker 403s `/admin`, `/login`, `/setup-admin`, `/api/v1/admin/*`, `/api/admin/*`, and `/api/auth/*` on `kaiyue-travel.scalingsmb.workers.dev`. The host currently still serves main’s static-only Worker, which 404s those routes. Do not merge this file to `main`.
- Worker entry is the Astro server bundle `apps/web/dist/server/entry.mjs` with assets from `apps/web/dist/client` (not the old `dist/_worker.js` path).
- `npx wrangler preview` uses the `previews` block and does **not** inherit top-level D1/R2. This branch duplicates the staging D1 and R2 bindings there, with `ENVIRONMENT=preview` and `ADMIN_EMAILS=admin-test@kaiyue.test`.
- Both production and preview on this branch bind staging D1 `069aa442` and R2 `kaiyue-offers-staging`.
- `RESEND_*` is unset in the root/production config. Bookings still persist; staff email is skipped.
- `DEV_ADMIN_BYPASS` is `false`. `/setup-admin` is disabled outside local development.
- `apps/web/wrangler.jsonc` remains the local Astro/dev profile (`ENVIRONMENT=development`) and points at the same staging D1/R2 IDs for `wrangler d1` commands.

## Admin gate

| Surface | Production host `kaiyue-travel.scalingsmb.workers.dev` | Preview host `*-kaiyue-travel.scalingsmb.workers.dev` or `ENVIRONMENT=preview` | Local `ENVIRONMENT=development` or `ENV=local` |
| --- | --- | --- | --- |
| `/admin`, `/api/v1/admin/*`, `/api/admin/*` | 403 until Access vars are set and a valid Access JWT is present | better-auth session for `ADMIN_EMAILS` | existing bypass / better-auth |
| `/login`, `/api/auth/*` | 403 | preview test login allowed | allowed |
| `/setup-admin` | 403 | 403 | allowed when `ENVIRONMENT=development` |

Access JWT checks: exact issuer (`https://<team-domain>`), audience, `exp`, `nbf`, signature, and a one-hour JWKS cache. No secrets are hardcoded.

## Preview test operator

A disposable test user is seeded in D1 `069aa442` only (applied 2026-10-16):

- Email: `admin-test@kaiyue.test`
- Display name: `TEST admin — remove after Access is configured`
- User id: `test-admin-preview-remove-later`

The password, `BETTER_AUTH_SECRET`, and any setup token are **not** in git, the PR, or this file.

This branch's top-level `ADMIN_EMAILS=admin-test@kaiyue.test` is required because the live non-production trigger is `npx wrangler versions upload`, which does not read the `previews` block. Production host `kaiyue-travel.scalingsmb.workers.dev` still 403s admin/auth routes.

Preview still needs `BETTER_AUTH_SECRET` as a Worker secret (32+ characters). Workers Builds for this repo runs `npx wrangler versions upload`, not `wrangler preview`. Cloudflare preserves secrets from the previous version on each `versions upload`; you do **not** re-add the secret after the first `versions secret put`. `wrangler preview base-config secret put` only applies if the deploy command is switched to `wrangler preview`.

This tooling cannot attach a preview-only secret without writing it onto the production Worker script, so set a **version** secret once and do not `wrangler deploy` / `wrangler secret put`:

```bash
# Creates a new unpublished Worker version with the secret. Later versions upload inherit it.
printf '%s' '<32+ character secret>' | npx wrangler versions secret put BETTER_AUTH_SECRET --name kaiyue-travel
```

Do **not** put `BETTER_AUTH_SECRET` in `wrangler.jsonc`. Production routes ignore better-auth even if the secret exists on the Worker.

Re-seed (does not print the password):

```bash
PREVIEW_ADMIN_EMAIL=admin-test@kaiyue.test \
PREVIEW_ADMIN_PASSWORD='<password>' \
BETTER_AUTH_SECRET='<32+ character secret>' \
node scripts/seed-preview-test-admin.mjs > /tmp/seed-preview-admin.sql

npx wrangler d1 execute kaiyue-travel-staging --remote --config wrangler.jsonc --file /tmp/seed-preview-admin.sql
```

Login URL after a successful `versions upload`: the Cloudflare bot comment on the PR, typically `https://<version>-kaiyue-travel.scalingsmb.workers.dev/login`.  
If Preview is later enabled: `https://<sanitized-branch>-kaiyue-travel.scalingsmb.workers.dev/login`.

## Cloudflare Access setup (Evan)

Create an Access application when you are ready to replace the preview test login. Until then, production admin stays 403.

1. Cloudflare Zero Trust → Access → Applications → Add an application → Self-hosted.
2. Application name: `Kai Yue admin (staging/preview)`.
3. Application domain: the preview hostname, for example  
   `cursor-special-offers-dashboard-d246-kaiyue-travel.scalingsmb.workers.dev`  
   and later `kaiyue-travel.scalingsmb.workers.dev` when production Access is approved.
4. Protect at least: `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`, `/api/v1/admin`, `/api/v1/admin/*`, `/login`, `/setup-admin`, `/api/auth`, `/api/auth/*`.
5. Identity: email OTP or the approved Google/IdP. Policy: allow the operators who should see bookings.
6. Copy the **Application Audience (AUD)** tag and the team domain (`https://<team>.cloudflareaccess.com`).
7. Set Worker vars (not git): `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`. Empty values mean fail-closed 403 on production.
8. After Access works, delete the test user `test-admin-preview-remove-later` / `admin-test@kaiyue.test` from D1 and remove `ADMIN_EMAILS` from the preview vars.

## Migrations

Apply **only** to `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`):

```bash
npx wrangler d1 migrations apply kaiyue-travel-staging --remote --config wrangler.jsonc
```

Do not apply to any other D1 database. Do not run `wrangler deploy`. Do not merge to `main`.

## Cleanup

- Test operator: `admin-test@kaiyue.test` / `test-admin-preview-remove-later`.
- Any booking whose contact name, email, or message contains `TEST` or `admin-test@kaiyue.test`.
- Offer drafts created during preview checks.
- To cancel a TEST booking without deleting the row, use `scripts/cancel-test-booking.sql` against D1 `069aa442` only, or Cancel on `/admin/bookings/:reference`.
