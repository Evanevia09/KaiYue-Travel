# 2026-11-16 — Staging cache + production-readiness source

**task_id:** `kaiyue-production-readiness-20261116`  
**Branch / PR:** `cursor/staging-cache-readiness-a72c` targeting `official-staging` (not `main`, not PR #42)  
**Owner 17:05:** fix the cache issue and make staging production-ready before main/live. No main/live authority.

## SHA distinction

| SHA | Role |
|---|---|
| `2a270e599e1f596aa6e383607ba1429fdb9b6f09` | Reviewed + deployed official-staging CD. Live Worker version `3e027a63` @100% / `6cb6b664`. |
| `bc533c7a24fb3ad746ba9dc9c206bd777e31af86` | PR #42 docs closeout. Not deployed. Preserved as parent of this branch. |
| `38301a23a34962e3fc255a274ef7fc4cfeb84d22` | Prior PR #44 head. Independent review HOLD (B1–B3). Not promoted. |
| This branch | Source candidate only. Not pushed to `official-staging`/`main`. Not activated. |

`main` remains `037b93ad`. Production Worker `71a66a99` / `f3169afb` untouched.

## Root symptom (parent 17:07–17:09, not cache-assumption)

Sanitized ops report: `docs/records/2026-11-16-staging-cache-readiness/REPORT-20261116-1709.md` SHA256 `e324bae0bfb3636aaf4d71ddad3546dfe8b6fff0ec7517aad8400e8fe606c580`.

- admin-staging `/` and `/index.html` 200 `cf-cache-status: HIT`, `Cache-Control: public, max-age=0, must-revalidate`, body SHA `9831b439a1ed…` (31145 bytes) **byte-identical** to public staging `/` and workers.dev `/`.
- Unique query strings and client `no-cache` still HIT. **No true origin miss.** Cannot prove the Worker already returns the correct admin root.
- No zone Cache Rules / Page Rules. workers.dev HIT as well → Workers/asset-edge, not a hostname zone rule.
- Live metadata still `raw_run_worker_first` `/*` except `/_astro/*`, `/images/*`, favicon. `/login` uncached 200 sign-in; `/admin` 302 `/login`. Public and workers.dev `/login` `/admin` 403 `no-store`. Host isolation of those paths passes.
- No purge. Purge remains a parent-granted op.

## Root mechanism (corrected; boolean Worker-first is not durable)

`@astrojs/cloudflare` 14.3.2 `handle` still does `matchStaticAsset` → `app.match` → `fallbackToAssets` (any non-404 `ASSETS.fetch`) **before** `app.render` / Astro middleware. Homepage remains prerendered (`output: "static"`, no `prerender: false` on `index.astro`). Boolean `run_worker_first: true` only forces the request into that Worker; it does not reorder adapter dispatch. Middleware host gates and `no-store` / `Vary: Host` therefore never see dedicated-admin `/` or `/index.html` when prerendered `index.html` is present.

HIT evidence shows the live symptom; it does not prove an origin miss, and it is not the B1 basis. The B1 basis is that dispatch order plus the prerendered root.

## Source fix (not purge-only)

1. Overlay `assets.run_worker_first: true` (boolean) remains required so the platform does not serve assets before the Worker. The historical path array stays **insufficient** and is still rejected by the candidate gate.
2. After `astro build`, `apps/web/scripts/wrap-worker-entry.mjs` replaces overlay `main` (`dist/server/entry.mjs`) with `createWorkerFetch` wrapping the generated Astro entry. Dedicated-admin `/` and `/index.html` (and other non-passthrough marketing paths) redirect or 403 **before** adapter `ASSETS.fetch`. Public marketing `/` and hashed `/_astro/` / `/images/` / favicon still pass through.
3. Dedicated-admin HTML/redirects keep `Cache-Control: private, no-store`, CDN no-store, `Vary: Host`.
4. HTTP smoke resolves `Location` against the expected admin origin and requires that origin + exact `/login` plus an actual 3xx redirect status. External hosts, `//host/login`, `/wrong/login`, and non-redirect statuses fail.
5. Notifications send only when `PUBLIC_SITE_URL` is `https://kaiyuemacau.com` or `https://www.kaiyuemacau.com`. Missing, blank, malformed, `http:`, staging hosts, and workers.dev aliases skip even with a dummy Resend key/sender/recipient. No real Resend calls in tests.

## `ENVIRONMENT=production` on staging — kept

Config fact, **not** the `/` root cause (host isolation of `/login` and `/admin` already works). Intention: `isDevelopment` false so `/setup-admin` and signup stay closed; live gates stay on; password floor is **host-role**, not `ENVIRONMENT` (an ENVIRONMENT gate would loosen production). `productionDedicatedHostRequiresPrimary` still requires host `admin.kaiyuemacau.com`, so staging admin is not forced onto `ADMIN_PRIMARY_EMAIL`.

Email isolation therefore **must not** key off `ENVIRONMENT`. Fail-closed is the inverse of explicit production site identity, not a two-host allow-skip list.

## Tests done vs untested

**Done (local):** lint; typecheck 0 errors (6 existing hints); `pnpm test` 259; overlay guard; staging-URL production build emitted `/index.html` and wrapped `dist/server/entry.mjs` with `createWorkerFetch` before `astro.fetch`. Coverage includes: adapter dispatch order still asset-before-render; ungated adapter returns marketing for admin `/` and `/index.html` when that asset exists; wrapped entry redirects those paths and preserves public HTML + hashed assets; notification-level dummy-key negatives for missing/malformed/staging workers.dev with no `Resend` construct; smoke negatives for external/wrong-path/non-redirect Locations.

**Not done / parent:** live cache-miss of admin `/` after this SHA is promoted; authorized purge of admin `/` and `/index.html`; authenticated staff UAT (session, revocation, Users, profile password); real inbox delivery; production admin attach; D1 query; merge to `main`.

## Remaining blockers (not this writer)

- Parent: Mika re-review of this corrected head, then exact reviewed SHA to `official-staging`, then granted purge if HIT remains, then browser QA of admin `/` on a miss or with the new no-store policy.
- Parent: test identities for full auth UAT.
- Parent: Resend test inbox only if delivery is later authorized. Do not revoke original/v2 tokens.
- Operator bootstrap / live D1 schema remain out-of-band (CD still must not query D1).
- Customer create-time email is still staff-only in source; not invented here.

Not `user_accepted`. Not production `released`.
