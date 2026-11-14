# Temporary allowlisted admin password login

**Task:** `kai-yue-temporary-admin-login-20261110`  
**Status (2026-11-14 15:07 UTC):** live staging still fa5184c 100% v6. New unpublished runtime `6b62da09` implements staging-only 6-character password min for synthetic UAT `uat-admin-20261114@kaiyue.test`. Test evidence on that SHA is **self-run** (152/152), not GitHub Actions. Authenticated QA **BLOCKED** until parent review + upload + seed. Not `user_accepted`. Not `released`. Closeout of live traffic: `docs/records/2026-11-14-staging-activation-closeout.md`. New package: `docs/records/2026-11-14-staging-uat-password-min.md`. Self-run logs: `docs/records/2026-11-14-6b62da09-self-run-ci/`.  
**Hosts:** production https://kaiyuemacau.com ; intended dashboard https://admin.kaiyuemacau.com (**not attached**); staging https://kaiyue-travel-staging.kai-yue.workers.dev  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/26 into `staging`

## What changed

- Reconstructed unpublished 5 Nov 2026 admin-gate behaviour from compiled Worker evidence: `ACCESS_ADMIN_HOST=admin.kaiyuemacau.com`, password routes split from `/admin` APIs, Access logout on that host, no `/login` redirect there.
- Removed `kaiyue-travel-staging.kai-yue.workers.dev` from production hosts. That listing was why staging `/login` returned 403 JSON (`Admin access is not configured.`, `requestId: gate`) even with `ENVIRONMENT=preview`, allowlist, and `BETTER_AUTH_SECRET`.
- Temporary password login is explicit: non-local requires `ADMIN_EMAILS` and a future `TEMP_ADMIN_EXPIRES_AT`. Signup and `DEV_ADMIN_BYPASS` stay **loopback** local-only (`localhost` / `127.0.0.1` + `ENVIRONMENT=development`). `ENVIRONMENT=development` + setup token on a public/staging/Access/unknown host still 404s signup.
- Access vars (`ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`) disable password admin on every non-local surface, including staging/preview. `/admin` then requires Access JWT; `/login` and `/api/auth` stay 403.
- `admin.kaiyuemacau.com` is the password dashboard while Access is unset (allowlist + expiry). Configured Access vars still take over (JWT, password 403). Apex public paths stay on `kaiyuemacau.com`. `/` on the admin host lands `/admin` or `/login`. Marketing/locale HTML on that host redirects to `/login`. Admin-host auth trusted origins are the admin origin only.
- Production public hosts (apex, www, legacy workers.dev) stay password-403 even when allowlist and expiry are set. Temporary password is the admin host, staging/preview, and loopback only.
- Root `wrangler.jsonc` top-level is **not** a live target (`kaiyue-travel-env-required`). Live Workers are `env.staging` and `env.production`. `previews` uses placeholder D1/R2 and does not bind staging.

## Parity limits

See `docs/records/2026-11-10-temporary-admin-login.md` and `artifacts/parity-nov5/manifest.json`. Public `/_astro` islands used on live routes (home, services, contact/about/B2B, nested booking/contact graph) **byte-match** this branch’s dist, including hashed names. Server `entry.js` is not byte-identical; remaining differences are the intentional admin-gate/auth/login set plus bundler chunk splits. Full Worker equality is not claimed. Staging this branch for browser QA should not replace unpublished public islands.

## Do not

- Merge or deploy from an agent. Do not `wrangler deploy`.
- Mutate live staging `ADMIN_EMAILS` or `TEMP_ADMIN_EXPIRES_AT` from this writer. The regenerated overlay’s planned Daniel + synthetic allowlist is operator review, not a live write.
- Lower production or `admin.kaiyuemacau.com` password minimum. Six is staging workers.dev + explicit flag only.
- Bind D1 `069aa442-30c9-4454-ab3a-26eb372b3a1f`.
- Enable public development, public signup, or `DEV_ADMIN_BYPASS` on staging/production.
- Print or commit a password or `BETTER_AUTH_SECRET`. Do not invent a dummy signing secret for hashing.
- Retry Cloudflare Workers Builds for production Worker `kaiyue-travel` from this PR.
- Contact the client or treat CI green as code review or production acceptance.

## Provisioning (PM / vault)

Vault can generate a password and fill a browser password field. It cannot shell-export that password. `hashPassword` is scrypt and **does not read `BETTER_AUTH_SECRET`**. Do not export the Worker signing secret to hash. Staging already has `BETTER_AUTH_SECRET` as a Worker secret for cookies.

Viable path (no public signup, no development mode on a public host):

1. Generate a password in the vault. Staging UAT may be 6 characters with `ADMIN_SEED_STAGING_TEST=1`. Default hasher minimum remains 16. Do not paste it into chat, git, CI logs, or screenshots.
2. Hash without exposing a listener when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are already in the PM process environment (vault cannot shell-export). Staging UAT six-character mode: `ADMIN_SEED_STAGING_TEST=1 ADMIN_SEED_EMAIL=… ADMIN_SEED_PASSWORD=… node provision-admin.mjs > seed-admin.sql`. Default without that flag still requires ≥16. With a checkout, the same env on `node scripts/provision-admin-local.mjs` or `node scripts/seed-preview-test-admin.mjs`. **Do not tunnel, proxy, or change the browser to reach 127.0.0.1.** Hasher is Better Auth 1.7.5 scrypt. Nothing logs the password.
3. Fill email + password from the vault browser extension. Submit. The page hashes locally and downloads SQL. The process does not log the password.
4. Confirm the SQL file has no raw password (hash only) and uses `WHERE NOT EXISTS` on email (safe to re-apply).
5. Apply that SQL to the **intended** D1 only:
   - Staging: `kaiyue-travel-staging` (`043cd0ff-a1e6-4b5e-98c1-968c286e0c70`)
   - Production: do not apply unless a later authorized production promotion says so (`06cf879d-8fea-4088-8881-7d382e1b8c11`)
6. Delete the downloaded SQL. Stop the local listener.

`scripts/seed-preview-test-admin.mjs` still exists for operators who already hold a password in a process they control. It is **not** a vault export path. It no longer requires `BETTER_AUTH_SECRET`.

After Access is live: let `TEMP_ADMIN_EXPIRES_AT` pass or delete that var, delete the Better Auth user/account rows, and keep Access JWT verification.

Staging Worker already has `ADMIN_EMAILS` and `TEMP_ADMIN_EXPIRES_AT=2026-11-24T15:59:59+08:00` (GET evidence 2026-11-11; wrangler `env.staging` matches). Verified still future at 2026-11-12 13:07 Asia/Macau (~291 h remaining). Do not rotate those in this increment. Production public `/login` stays 403 even after PM sets allowlist/expiry; the live dashboard host is `admin.kaiyuemacau.com`. Do not treat t81u as this agent uploading.

## Staging packages

- Additive 14-file jwt + `keep_assets` remains **unsafe**. Do not send it.
- **Live serving (do not treat as this increment’s upload inputs):** runtimeSourceSHA `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4`. Staging zip sha256 `b5b0be97da9189c5da5dccf88e8a29d95ed4841a724cbaa84dc249ceb26a2bf5`. Overlay sha256 `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6`. Production zip sha256 `6bb3489ea8218477c5950bd8779baf25b09e288582123bcde5df957e6490af69` was **not** uploaded.
- **New unpublished package:** runtimeSourceSHA `6b62da09fba7de4e88d418750fde22a71a915a20`. Staging zip sha256 `641d725d063c2db37f2aa9dae335fdad8a23ef30e83de24eed0c1df58fa58572`. Overlay sha256 `b754e2fabc3693e3d89e27f5c966442d1e1ceecad1914277a40fb7547794720b`. Provisioner zip sha256 `451cbb7de9d3123b1901ba28af3fdbcec370d622ee39e145eef1b69303521b51`. See `docs/records/2026-11-14-staging-uat-password-min.md`. Do **not** upload fa5184c overlay `11ead30e…` with this runtime.
- **Current staging (2026-11-14 14:08:57 CST):** 100% `114b62a3-83c9-4cac-b80a-21d0d855717c` (v6), deployment `32931ef9-0e11-4c5b-9f5a-5649d7aaf747`, `raw_run_worker_first=true`. Rollback target `b53c0353-bfc4-4700-a5c7-725b7167af6e`. Production 100% owner photos `5b859f36-39c5-43aa-817a-434d56ae8214` (2026-11-13; not this task). Custom domains 0; `admin.kaiyuemacau.com` not attached.
- **Rollback provenance (GET 2026-11-11 01:34:24 Asia/Macau, historical):** then-current 100% version `b53c0353-bfc4-4700-a5c7-725b7167af6e`, deployment `caeee848-fb0d-4914-a770-2d60996f106e`. Evidence `docs/records/2026-11-11-staging-rollback-evidence.sanitized.json` sha256 `39a4e00e4acab704d5f7b4dca5b0b31cf50eb5ee5a69956a8241ed25eb10edab`. Plan `docs/records/2026-11-11-staging-rollback-plan.md`. That GET is **not** the 2026-11-14 traffic picture.
- Connector must use the **assets-upload-session JWT** (not the account token) on `POST /workers/assets/upload`. If it cannot switch `Authorization`, that is a capability gap — do not paste credentials.

GitHub Actions [`42866722740`](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/42866722740) on head `c8c129b` **success** (job `check`, 136/136 tests). That is the test CI. Cloudflare check [`Workers Builds: kaiyue-travel`](https://github.com/Evanevia09/KaiYue-Travel/runs/130007335350) on the same SHA **failure**, build `bf4a1c0a-977a-4365-8e38-9e4e6f147c85`, script `kaiyue-travel` / production, details [dashboard](https://dash.cloudflare.com/41386f432b6fa180fe84f51e709b729b/workers/services/view/kaiyue-travel/production/builds/bf4a1c0a-977a-4365-8e38-9e4e6f147c85). GitHub check `output.text` and annotations are empty. Local reproduce of the official default deploy command (`npx wrangler deploy` with no `--env`) uses placeholder Worker `kaiyue-travel-env-required` / D1 `00000000-0000-4000-8000-000000000001` / `ENVIRONMENT=unspecified`; wrangler 4.132.0 warns that no target env was specified. Do not rename top-level wrangler to green that check. Staging-only dashboard fields: `docs/08-delivery-and-operations.md`. GitHub Actions [`42864265892`](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/42864265892) succeeded on `5dab462`. Provisioner zip unchanged; env-only, do not start the server. Do not retry production Workers Builds.

## Independent verifier — current vs historical (source writer does not run)

**Done (2026-11-14):** frozen fa5184c uploaded (GUI + Wrangler 4.132.0 `--strict` on a real TTY; owner-approved script-API warning). Clean entry-only dir + external `--assets` (unpack-in-place is stale). Activated with `114b62a3-83c9-4cac-b80a-21d0d855717c@100%`. Account `33ecc75158a1cdd23ba1a62eb70c5103`. Do not mutate `ADMIN_EMAILS`, `TEMP_ADMIN_EXPIRES_AT`, `BETTER_AUTH_SECRET`, or Access vars.

**Current packaging if a later versions-upload is separately authorized** (do not run now). Do **not** unzip the complete zip so `entry.js` and `dist-client` share cwd (unpack-in-place is stale). Clean dir = `entry.js` + overlay only; `--assets` points at frozen `dist-client` outside that directory:

```text
npx wrangler@4.132.0 versions upload ./entry.js \
  --config ./wrangler.staging-artifact.jsonc \
  --no-bundle \
  --assets /absolute/path/to/frozen/dist-client \
  --name kaiyue-travel-staging \
  --keep-vars \
  --strict
```

**Rollback staging (not performed):** restore `b53c0353-bfc4-4700-a5c7-725b7167af6e` at 100%. Not a D1/R2 mutate.

**Production:** not approved for this task. Live production 100% is owner photo version `5b859f36-39c5-43aa-817a-434d56ae8214` (2026-11-13). Historical 2026-11-12 pointer `74ebe1fc-…` is obsolete as “current production.” Do not upload this branch’s production zip, attach the admin hostname, seed, or retry Workers Builds.

**Queued:** GitHub staging CD after dashboard verification. Do not implement now.

Seed remains **blocked**: Daniel credentials absent; env-only provisioner zip `a5195c7f…` is not a vault export; do not start loopback; do not send passwords here.
