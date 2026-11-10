# 2026-11-10 — Temporary allowlisted admin login

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**Statuses:** implementation `probe_complete` for unpublished-bundle reconstruction of admin-gate; local tests establish this increment’s checks only. Not `user_accepted`. Not `released`.

## Starting point

- Git `main` `608c4f53038cdbab02ff4fd74d1eb03057f79824` (older than the 5 Nov unpublished Worker).
- Staging branch `3fb823629c1412007af40f40b32a4183b739e08b` (behind main; not the missing 5 Nov source).
- Open GitHub PRs: none.
- Live production https://kaiyuemacau.com `/login` 403 JSON gate.
- Live staging https://kaiyue-travel-staging.kai-yue.workers.dev `/login` 403 JSON gate after 10 Nov settings-only upload.

## Recovered compiled evidence

| Artifact | sha256 |
| --- | --- |
| production `entry.js` | `0942309f987408ab474e77683438481f997567c97b4902a72845e25baa9c15d0` |
| staging `entry.js` | `437926967df82fa60a993b0d71fee0d12f38fe34decfbded9562ad1d6bfaf758` |
| shared admin-gate chunk | `bd6e3a86019c680cd011d8f3d1767d758af0049822505ee1d3f15cfabd595dcd` |

Compiled gate listed `PRODUCTION_HOSTS = ["kaiyue-travel.scalingsmb.workers.dev", "kaiyue-travel-staging.kai-yue.workers.dev"]` and `ACCESS_ADMIN_HOST = "admin.kaiyuemacau.com"`. `isPreviewRuntime` returned false for those hosts before reading `ENVIRONMENT=preview`. Source maps were not recoverable. Static assets were not dumped. Full script parity is not claimed.

## Design tradeoffs

- Reconstruct Access-host behaviour from the compiled Worker so a later Access cutover does not need another undocumented JS fork.
- Keep password admin off `admin.kaiyuemacau.com`.
- Require allowlist **and** future expiry for every non-local password login, including staging. Missing expiry is fail-closed, not open preview.
- Prepare production by the same code path: production `/login` stays 403 until `ADMIN_EMAILS` + future `TEMP_ADMIN_EXPIRES_AT` are set and Access is unset. Access vars disable password on every non-local surface (not only production hosts).
- Signup / `DEV_ADMIN_BYPASS` require a loopback host plus a development/local label. `ENVIRONMENT=development` on a public host is not enough.
- Do not use public signup, public development, or a hostname-only bypass.

## Source + static parity vs 5 Nov / live (2026-11-10, branch build)

Machine dump: `artifacts/parity-nov5/manifest.json`. Rebuild + crawl: `pnpm build && node scripts/compare-live-parity.mjs`. Browser-UA crawl of 36 public paths × production / www / staging (108 HTML). Full Worker `entry.js` byte equality is **not** claimed (hashes differ; source maps unavailable).

### Public client islands — proven byte match

Every HTML-referenced `/_astro/*` file is the same set on production, www, and staging except `/login` (403 JSON, no islands). Nested static imports from those islands were fetched from production. Dist hashes and sha256 match live (filename hash equality here is content equality, not the success criterion).

| live `/_astro` | sha256 | verdict |
| --- | --- | --- |
| `BaseLayout.Dq8L4eEk.css` | `d1a703d2…` | BYTE_AND_NAME_MATCH |
| `BaseLayout.astro_…gK1lsl9Z.js` | `c2c93f9f…` | BYTE_AND_NAME_MATCH |
| `BookingEmbedded.cFmMjUfb.js` | `58761506…` | BYTE_AND_NAME_MATCH |
| `BookingSheet.BjhsA3XK.js` | `a374b1e7…` | BYTE_AND_NAME_MATCH |
| `BookingForm.BY2srzpk.js` | `aaa1bf1f…` | BYTE_AND_NAME_MATCH (nested) |
| `BookingLauncher.BqoyMjDS.js` | `1585a5ec…` | BYTE_AND_NAME_MATCH (asset present; public HTML currently uses `showMobileBook={false}`) |
| `ContactForm.CJmZZAL8.js` | `86c66973…` | BYTE_AND_NAME_MATCH (about/contact/B2B) |
| `client.DrPMauyT.js` | `f5821089…` | BYTE_AND_NAME_MATCH |
| `store.BKJ62xil.js` / `i18n.CluPyr_6.js` / `src.BLL3_vvi.js` | match | BYTE_AND_NAME_MATCH (nested) |
| `react.Bi21MRdE.js` / `react-dom.Zo7SlITr.js` / `jsx-runtime.myd_k2E3.js` / `rolldown-runtime.C_o-9qvY.js` | match | BYTE_AND_NAME_MATCH (nested) |
| `auth-client.B2D_TZZE.js` / `status.CrrMiddk.js` | match | BYTE_AND_NAME_MATCH (present on live asset store; not HTML-referenced on public routes) |

No live-only public JS/CSS. No content-diff public islands. Sampled `/images` on earlier routes still MATCH git `apps/web/public`.

Admin-only dist islands are **not** on live public HTML. `LoginForm.DI7HqLqN.js` 404s on production (expected: `/login` is 403 today; this branch changes that module). `api._aekQyCR.js` (admin fetch helper) 404s on production.

### Server `entry.js` module boundaries vs this build

Recovered production `entry.js` sha256 `0942309f…` (4181127 bytes); staging `43792696…` (4181808). Comments name `apps/web/dist/server/chunks/*`. Hash suffixes differ after a new bundle (expected). Logical families present in both: `admin-gate`, `auth`, `login`, `setup-admin`, `admin-session`, admin UI panels, booking/contact routers, special-offers, i18n, kysely/D1 dialects.

| Difference | Kind | Public behaviour? |
| --- | --- | --- |
| `PRODUCTION_HOSTS` compiled = scalingsmb + staging workers.dev; branch = apex, www, scalingsmb (**staging host removed**) | intentional auth | staging `/login` can leave the 403 gate once this Worker is uploaded to staging with existing allowlist/expiry |
| `isLocalAdminSurface` / `emailSignupAllowed` / `accessTakesOver` | intentional auth | signup/bypass stay loopback; Access vars disable password on every non-local host |
| `passwordAdminAllowed` requires allowlist + future `TEMP_ADMIN_EXPIRES_AT` | intentional auth | production `/login` stays 403 until PM sets those vars after staging QA (capability is **user-approved**; implementation remains fail-closed) |
| `enforceAdminSignInRateLimit` (rate-limit chunk) | intentional auth | `/api/auth` sign-in only |
| `LoginForm` minLength 16 + 403/429/expired copy | intentional auth | only after `/login` HTML is served |
| `env_*` helpers (`noticeHours`) folded into `admin_*`; `db.ts` and `static-image-collection` split out | bundler graph | no public island change; `noticeHours` still present |
| Catch-all `_.._*` / `_id__*` hash names | bundler | same Astro routes |

Unexplained public client/server behaviour: **none identified**. Full compiled Worker equality is still not proven (maps missing; server chunk hashes differ). Staging this branch for browser QA is reversible relative to public `_astro` bytes.

### Login-only git delta vs `origin/main` `608c4f5`

24 product/test/config files, `+988/−122` (auth/wrangler/provision/tests). Not a public UI rewrite. Staging merge added already-promoted docs so the PR is mergeable into `staging`.

## GitHub Actions / Workers Builds (2026-11-10)

PR CI run [`42858489938`](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/42858489938) on `fce3a66`: **success**, 2026-11-10 16:49–16:50 UTC (00:49–00:50 Asia/Macau). Job `check`: typecheck 0 errors, **131/131** tests, lint, build. No retry or `workflow_dispatch` needed. Later heads will queue a new `pull_request` synchronize run; do not dispatch from this agent.

Cloudflare **Workers Builds: kaiyue-travel** auto-ran on this PR and **failed closed** (`c78b97ba-0566-48c9-a6db-d892dc6c6670`). That path is a **production** version upload. **Do not retry.** Production Worker version is unchanged. Any later upload is `--env staging` only after PM approval.

## Verification (this increment)

Recorded in `PROJECT-STATE.md` after local gates. Browser/staging deploy verification is a PM step after merge authorization. Not `user_accepted`. Not `released`.
