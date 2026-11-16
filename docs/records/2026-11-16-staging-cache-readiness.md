# 2026-11-16 — Staging cache + production-readiness source

**task_id:** `kaiyue-production-readiness-20261116`  
**Branch / PR:** `cursor/staging-cache-readiness-a72c` targeting `official-staging` (not `main`, not PR #42)  
**Owner 17:05:** fix the cache issue and make staging production-ready before main/live. No main/live authority.

## SHA distinction

| SHA | Role |
|---|---|
| `2a270e599e1f596aa6e383607ba1429fdb9b6f09` | Reviewed + deployed official-staging CD. Live Worker version `3e027a63` @100% / `6cb6b664`. |
| `bc533c7a24fb3ad746ba9dc9c206bd777e31af86` | PR #42 docs closeout. Not deployed. Preserved as parent of this branch. |
| This branch | Source candidate only. Not pushed to `official-staging`/`main`. Not activated. |

`main` remains `037b93ad`. Production Worker `71a66a99` / `f3169afb` untouched.

## Root symptom (parent 17:07–17:09, not cache-assumption)

Sanitized ops report: `docs/records/2026-11-16-staging-cache-readiness/REPORT-20261116-1709.md` SHA256 `e324bae0bfb3636aaf4d71ddad3546dfe8b6fff0ec7517aad8400e8fe606c580`.

- admin-staging `/` and `/index.html` 200 `cf-cache-status: HIT`, `Cache-Control: public, max-age=0, must-revalidate`, body SHA `9831b439a1ed…` (31145 bytes) **byte-identical** to public staging `/` and workers.dev `/`.
- Unique query strings and client `no-cache` still HIT. **No true origin miss.** Cannot prove the Worker already returns the correct admin root.
- No zone Cache Rules / Page Rules. workers.dev HIT as well → Workers/asset-edge, not a hostname zone rule.
- Live metadata still `raw_run_worker_first` `/*` except `/_astro/*`, `/images/*`, favicon. `/login` uncached 200 sign-in; `/admin` 302 `/login`. Public and workers.dev `/login` `/admin` 403 `no-store`. Host isolation of those paths passes.
- No purge. Purge remains a parent-granted op.

## Source fix (not purge-only)

1. Overlay `assets.run_worker_first: true` (boolean). The path array remains **insufficient**: it is what is live on `2a270e59` and still served host-agnostic cached `index.html`. Candidate gate now **rejects** that array.
2. Dedicated-admin HTML/redirects get `Cache-Control: private, no-store`, CDN no-store, `Vary: Host`. Marketing HTML that does go through the Worker gets `Vary: Host` so admin and public cannot share a host-agnostic object.
3. HTTP smoke now asserts admin-staging `/` is a login redirect and is not marketing HTML. That assertion is local-proven against fixtures; it will fail CD until this SHA is promoted **and** a parent purge (if stale HIT remains).

## `ENVIRONMENT=production` on staging — kept

Config fact, **not** the `/` root cause (host isolation of `/login` and `/admin` already works). Intention: `isDevelopment` false so `/setup-admin` and signup stay closed; live gates stay on; password floor is **host-role**, not `ENVIRONMENT` (an ENVIRONMENT gate would loosen production). `productionDedicatedHostRequiresPrimary` still requires host `admin.kaiyuemacau.com`, so staging admin is not forced onto `ADMIN_PRIMARY_EMAIL`.

Email isolation therefore **must not** key off `ENVIRONMENT`. Staging notifications now fail closed when `PUBLIC_SITE_URL` is `staging.kaiyuemacau.com` or `admin-staging.kaiyuemacau.com`, even if a Worker `RESEND_API_KEY` remains. Contact create now passes `replyTo` when an email is present (still skipped on staging).

## Tests done vs untested

**Done (local):** lint; typecheck 0 errors (existing hints); `pnpm test` 251; staging-URL production build. New coverage: Worker-first boolean + reject historical array; admin-root smoke contract; host isolation cache headers; staging mail skip despite `ENVIRONMENT=production` + dummy key.

**Not done / parent:** live cache-miss of admin `/` after this SHA is promoted; authorized purge of admin `/` and `/index.html`; authenticated staff UAT (session, revocation, Users, profile password); real inbox delivery; production admin attach; D1 query; merge to `main`.

## Remaining blockers (not this writer)

- Parent: Mika review, then exact reviewed SHA to `official-staging`, then granted purge if HIT remains, then browser QA of admin `/` on a miss or with the new no-store policy.
- Parent: test identities for full auth UAT.
- Parent: Resend test inbox only if delivery is later authorized. Do not revoke original/v2 tokens.
- Operator bootstrap / live D1 schema remain out-of-band (CD still must not query D1).
- Customer create-time email is still staff-only in source; not invented here.

Not `user_accepted`. Not production `released`.
