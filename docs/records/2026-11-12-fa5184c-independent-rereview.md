# Independent security rereview — runtime fa5184cc (focused fixes after 8f41369)

**Runtime SHA:** `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4` (parent `491826de0188b6b16b1fecb6a099bee8d349a791`)  
**Docs / PR 26 head:** `8251acf6472dcf4bc94e83706527bc9c2a55aae1` (freeze-hash docs only)  
**Review time:** 2026-11-12 14:23–14:26 CST (Asia/Macau)  
**Method:** remote source at fa5184cc, not writer claims. Frozen zips hashed on the box. Fresh 33ecc GET only. No repo checkout, no DNS/Access/deploy/upload/promote/domain/D1 writes, no credential or OAuth file reads, no Official Uploader login, no production Workers Builds retry. Prior 8f41369 and 5dab462 artifacts are superseded as final QA packages.

**CI (confirmed on GitHub, not only local):** Actions run https://github.com/Evanevia09/KaiYue-Travel/actions/runs/43167279190 — job https://github.com/Evanevia09/KaiYue-Travel/actions/runs/43167279190/job/131011979267 `check` success on `8251acf` (completed 2026-11-12 14:20:03 CST Asia/Macau). Steps: lint, typecheck, test, build all green. Vitest: **25 files, 145 passed** (matches writer 145; up from 142 on 8f41369 / run 43165048656). `admin-gate.test.ts` 19 tests, `admin-session.test.ts` 2 tests, all passed in that log.  
`Workers Builds: kaiyue-travel` failed on the same head (https://github.com/Evanevia09/KaiYue-Travel/runs/131012171239; details_url still `dash.cloudflare.com/41386f432b6fa180fe84f51e709b729b/...`). **Not retried.** Green packet is not a security review. GET `/accounts` still returns only Kai Yue `33ecc…` (`total_count` 1); 41386f is not a deploy fallback.

**Artifacts (box, hashes match stated freeze; not deployed):**

- Staging `01M776J5A1EMFGAY7N73Y21M57.zip` — 10979371 bytes, sha256 `b5b0be97da9189c5da5dccf88e8a29d95ed4841a724cbaa84dc249ceb26a2bf5`. `SOURCE-SHA.txt` = `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4`. Root `entry.js` 4187172 bytes, sha256 `646f7dc771d6fb0088498c5002763c083d841668e8a263242b5b726c025120d9`. Packaged `wrangler.jsonc`: name `kaiyue-travel-staging`, `main` `./entry.js`, compat `2026-09-01` + `nodejs_compat`, assets `./dist-client` binding `ASSETS` (**no `run_worker_first`**), D1 `043cd0ff-a1e6-4b5e-98c1-968c286e0c70`, R2 `kaiyue-offers-staging`. Vars include `ADMIN_EMAILS=daniel@kaiyuemacau.com`, `TEMP_ADMIN_EXPIRES_AT=2026-11-24T15:59:59+08:00`, `PUBLIC_SITE_URL=https://kaiyue-travel-staging.kai-yue.workers.dev`, `DEV_ADMIN_BYPASS=false`. No secret in the zip. `dist-client` 139 files: 31 `/_astro/*`, 41 `/images/*`, `/favicon.ico`, plus 66 non-dashboard files (root `index.html`, locale trees, services, robots, sitemaps, `_redirects`, `_headers`).
- Production `01M776J5A1Q3XKJRFBVJJTW2B0.zip` — 10978222 bytes, sha256 `6bb3489ea8218477c5950bd8779baf25b09e288582123bcde5df957e6490af69`. Same `SOURCE-SHA`. Root `entry.js` 4186501 bytes, sha256 `633b224c7098a58d98b3dbce3af7f27eed4f0f65d4cfff8826b9da3d6d2dee8f`. Fail-closed package: no allowlist, no expiry, no `BETTER_AUTH_SECRET`. Script `kaiyue-travel`, D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, R2 `kaiyue-offers-production`, `PUBLIC_SITE_URL=https://kaiyuemacau.com`. Also no `run_worker_first`.

Blob compare vs superseded 8f41369: `auth.ts`, `router.ts`, `[...all].ts`, `login.astro`, `setup-admin.astro`, repo `wrangler.jsonc` **unchanged**. Changed: `admin-gate.ts` (`passwordAdminAllowed` + dashboard path helpers), `middleware.ts` (marketing redirect + host-wide noindex), `admin-session.ts` (`adminAuthTrustedOrigins`), and tests.

**Current serving (GET 2026-11-12 14:23:27 CST Asia/Macau), unchanged:** snapshot `serving-snapshot.sanitized.json`. Apex + www routes → production `kaiyue-travel`. No Worker custom domains. No DNS for `admin` or `staff`. Staging 100% version `b53c0353-bfc4-4700-a5c7-725b7167af6e` (deployment `caeee848-…`, 2026-11-10 22:40:34 CST Asia/Macau); secret name `BETTER_AUTH_SECRET` present; allowlist + expiry present and match the staging zip. Production 100% version `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` (deployment `f28d63c0-…`, 2026-11-05 17:38:49 CST Asia/Macau); **no** auth secret, allowlist, or expiry. Bindings in both zips match these live IDs.

Official Uploader OAuth remains unsigned-in; secureform still awaits the user. Not touched. No wrangler dry-run (would need auth files).

## Claim check (implementation, not reports)

1. **Apex / www / legacy stay 403 despite vars — CONFIRMED.** `passwordAdminAllowed` now returns false for `isProductionHost` even when allowlist + expiry are set (`admin-gate.ts` 173–175). Test “keeps production public hosts password-closed even when allowlist and expiry are set” covers `https://kaiyuemacau.com`, `https://www.kaiyuemacau.com`, and `https://kaiyue-travel.scalingsmb.workers.dev` for `/login` and `/admin`, plus `handleApi` 403 on apex `/api/v1/admin/summary`. This **inverts** the 8f41369 test that treated public-host password as a capability. High Finding 1 from the 8f41369 review is **fixed in source**.

2. **Admin-only production password — CONFIRMED.** After the production-host close, `isAccessAdminHost` (`admin.kaiyuemacau.com`) returns true (176–178). Staging / preview / loopback still allowed (179) when Access is unset. Access configured still disables password off-loopback (164–166). Signup / `DEV_ADMIN_BYPASS` remain local-only (unchanged).

3. **Dedicated admin trustedOrigin is the request origin only — CONFIRMED.** `adminAuthTrustedOrigins` does not add `PUBLIC_SITE_URL` when the request is on the admin host (`admin-session.ts` 27–29). Test expects `[accessOrigin]` and not `productionOrigin`. Staging workers.dev still may include `PUBLIC_SITE_URL` (same origin as that host).

4. **Admin-host mutation POSTs reject apex/www Origin — CONFIRMED.** `requireSameOrigin` unchanged vs 8f41369 (already skipped `PUBLIC_SITE_URL` on the admin host). New test “rejects apex and www Origins on admin-host mutation POSTs” asserts throw for those Origins and no throw for the admin Origin. `/api/admin` and `/api/v1/admin` still call `requireSameOrigin` then `requireAdmin`. Missing `Origin` still fail-open (Low residual; modern browsers send Origin on these POSTs).

5. **Marketing / locale redirects to `/login`, noindex entire host, dashboard API/assets preserved, apex root unchanged — SOURCE YES; PACKAGED ROUTING INCOMPLETE unless `run_worker_first` is set.** Middleware on the admin host: `/` → `/admin` if session or Access takeover else `/login`; non-`isAdminDashboardPath` → `/login`. Dashboard paths include `/`, `/login`, `/admin`, `/api/auth`, `/api/v1/admin`, `/_astro/*`, `/images/*`, `/favicon.ico`. Marketing/locale (`/about`, `/pt`, `/zh-Hant`, `/services/…`) are excluded (tested as path classification). Host-wide `x-robots-tag: noindex, nofollow` and `cache-control: no-store` when `isAccessAdminHost` or path starts with `/admin`. `assertLiveAdminSurface` still does not gate apex `/` (tested).  
   **Gap:** tests do not exercise asset-first serving. Frozen `wrangler.jsonc` omits `assets.run_worker_first` (official default **false**). `dist-client` contains prerendered `index.html` and 64 locale/marketing HTML files. With that default, a Custom Domain still serves matching static files **without invoking the Worker**, so middleware redirects and noindex would **not** run for those paths. `https://admin.kaiyuemacau.com/` would show the public homepage instead of `/login` or `/admin`. Direct `/login` and `/admin` are SSR (`prerender` false; not in `dist-client`) and would still hit the Worker.

## Login / dashboard flow regressions

No **source** regression found that would break a real authenticated flow on `/login`, `/api/auth/sign-in/email`, `/admin`, `/api/v1/admin/*`, or dashboard static assets, **if the Worker handles the request**. Inventory: login/dashboard assets in the staging zip live only under `/_astro/`, `/images/`, and `/favicon.ico` (the allowlist). `/api/*` is skipped by the HTML gate and still goes through auth + same-origin checks.

Routing residual that **does** affect the intended admin-host entry: without `run_worker_first: true`, the hostname root is a public `index.html` and marketing trees stay visible. That is not a break of a bookmarked `/login` or an already-authenticated `/admin` session, but it is a failure of the claimed root → `/login` behavior and of host isolation. Operator config below adds the flag as a required documented delta vs the frozen wrangler file.

Low only (not flow-breaking): `cache-control: no-store` on hashed `/_astro/*` when the Worker runs; missing Origin fail-open; staging `*.workers.dev` remains a password-capable preview surface (intentional, not a `PRODUCTION_HOSTS` member).

## Verdict (independently scoped)

**Staging — approve a scoped versions-upload trial, with one required config delta.** Source fixes for 8f41369 Finding 1 (public hosts stay password-closed) and the Finding 2 trusted-origin residual are actually implemented and covered by the 145 CI tests. Use only account `33ecc75158a1cdd23ba1a62eb70c5103`, script `kaiyue-travel-staging`, frozen staging zip above, `--no-bundle --keep-vars --strict`, and `wrangler.staging-artifact.jsonc` in this directory (adds `assets.run_worker_first: true` so middleware actually runs). `versions upload` only — it must not change traffic. Do not `wrangler deploy`. Do not attach `admin.kaiyuemacau.com` until that version is promoted **and** the flag is present on the version. Rollback remains `b53c0353-bfc4-4700-a5c7-725b7167af6e`. Mika signoff and operator device OAuth are still gates. Do not attach to production or use staff.

**Production — not approved.** Source is now correctly admin-host-only for password, and the production zip + live production settings are still fail-closed (no secret/allowlist/expiry). Do not upload, set vars/secrets, attach the admin hostname, or retry Builds. Apex/www stay on `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` at 100%. A later production step, after staging QA and a separate authorization, would still need secret + allowlist + expiry, the same `run_worker_first` flag, versions upload then version-specific promote, then a domain PUT to `kaiyue-travel` (not a change to apex/www routes).

## Remaining gates

1. Operator completes official `wrangler@4.132.0 login --device` (unsigned now; do not start it here).  
2. Mika signoff.  
3. Staging `versions upload` of this zip with the operator config (including `run_worker_first: true`).  
4. Version-specific `versions deploy --percentage 100` of the new id only.  
5. Then PUT `admin.kaiyuemacau.com` → `kaiyue-travel-staging`, zone `fb84210cb8175ff4412b444805e1a6a5`, `previews_enabled: false`. Do not pre-create a CNAME.  
6. Staging QA of `/` → `/login`, marketing/locale → `/login`, noindex, `/login` + `/admin` + APIs + `/_astro`/`/images`/`favicon`.  
7. Production remains a later, separately authorized step. No Builds retry.

Exact operator upload command is in `STAGING-COMMANDS.sh`. No mutation was performed in this review.
