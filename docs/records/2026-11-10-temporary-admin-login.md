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

## Source + static parity vs 5 Nov bundles / live (2026-11-10)

Recovered Worker scripts only (no source maps, no `_astro` dump):

| Artifact | sha256 | bytes |
| --- | --- | --- |
| production `entry.js` | `0942309f987408ab474e77683438481f997567c97b4902a72845e25baa9c15d0` | 4181127 |
| staging `entry.js` | `437926967df82fa60a993b0d71fee0d12f38fe34decfbded9562ad1d6bfaf758` | 4181808 |

Compiled vs this branch (admin-auth / gate):

| Item | 5 Nov compiled | This branch |
| --- | --- | --- |
| `ACCESS_ADMIN_HOST` | `admin.kaiyuemacau.com` | same |
| `PRODUCTION_HOSTS` | `kaiyue-travel.scalingsmb.workers.dev`, `kaiyue-travel-staging.kai-yue.workers.dev` | `kaiyuemacau.com`, `www.kaiyuemacau.com`, `kaiyue-travel.scalingsmb.workers.dev` (**staging host removed on purpose**; public apex/www added) |
| `www.kaiyuemacau.com` string | absent | present |
| `isLocalAdminSurface` | absent | present (loopback + development) |
| `TEMP_ADMIN_EXPIRES_AT` / `DEV_ADMIN_BYPASS` / `ADMIN_SETUP_TOKEN` / `sign-up/email` | present | present |
| Full minified `entry.js` | not reconstructed | not claimed |

Live public **files** vs git `apps/web/public` (sha256 MATCH on sampled routes: `/`, `/about`, `/services/airport-transfer`, `/services/local-transfers`, plus staging `/` and `/about`): favicon, hero-home jpg/webp, city-tours + home-hero-family-v2 set, group logo png/webp, mark.svg, wechat-qr.svg, about-fleet-hero, about-operations-feature, airport-transfer hero/feature, local-transfers hero/feature. No DIFF and no LIVE_ONLY image on those pages.

Live **compiled islands** (not in git; not in the 5 Nov `entry.js` dump). Same five `_astro` files on production, www, and staging home:

| path | sha256 | bytes |
| --- | --- | --- |
| `/_astro/BaseLayout.Dq8L4eEk.css` | `d1a703d29e0fdd2b4e8258249d6a0c2a260f9de9c5269c7458b4ee7c7c8280f1` | 61376 |
| `/_astro/BaseLayout.astro_astro_type_script_index_1_lang.gK1lsl9Z.js` | `c2c93f9f6c488559b6b7dddb0eaaea8ce81591ab2139f1b9d319a05442a085c8` | 238617 |
| `/_astro/BookingEmbedded.cFmMjUfb.js` | `58761506be52a91a71ae09dd97c9c72624598cee3d022958066ac9036cdada04` | 1680 |
| `/_astro/BookingSheet.BjhsA3XK.js` | `a374b1e77e5020036afecc34f4857d2057459ea48b8af2c677ef83be8a52113a` | 2410 |
| `/_astro/client.DrPMauyT.js` | `f5821089e31bb9f4b85d7ee275aa494337ea300f070b52230f5049dc270f7601` | 209276 |

**Exact remaining parity blockers (do not promote until accepted):**

1. Source maps were not recoverable, so unpublished 5 Nov Worker source cannot be diffed file-for-file against git.
2. The 5 Nov dump is server `entry.js` only. Live `_astro/*` client/CSS assets were not dumped; a new build will emit new hashed names and could replace live islands even when public images MATCH.
3. Compiled `PRODUCTION_HOSTS` still lists the staging workers.dev host; this branch removes it and adds apex/www. That is an intentional auth fix, not unexplained drift, but it is still a compiled-source difference.
4. Git public files not referenced on home (other service/about images, `logo.svg`, `robots.txt`) were not all fetched; sampled extra routes MATCH where checked.

## GitHub Actions / Workers Builds (2026-11-10)

Head `474f2bff8affcb0805ff2a6de9e45d72c71b3315`: **0** GitHub Actions workflow runs. Check suites: `cursor` queued (0 runs), `firebase-app-hosting` queued, `netlify` queued, `cloudflare-workers-and-pages` **failure**. The only GitHub check is `Workers Builds: kaiyue-travel` (script `kaiyue-travel`, dashboard path `/workers/services/view/kaiyue-travel/production/builds/88bf86f9-0571-4ba0-b64e-486eb220b83a`). That is a **production** version-upload path. It was not retried. CI workflow `on.pull_request` existed unfiltered; a later push should fire `pull_request` synchronize. `workflow_dispatch` added as operator fallback. Do not retry the production Workers Build.

## Verification (this increment)

Recorded in `PROJECT-STATE.md` after local gates. Browser/staging deploy verification is a PM step after merge authorization. Not `user_accepted`. Not `released`.
