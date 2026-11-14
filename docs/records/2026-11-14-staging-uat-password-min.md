# 2026-11-14 — staging UAT six-character password minimum

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**As-of:** 2026-11-14 22:54 CST (Asia/Macau) owner request  
**Branch:** `cursor/temporary-admin-login-763f` (PR #26 into `staging`)  
**Live staging:** still fa5184c / `114b62a3-83c9-4cac-b80a-21d0d855717c` @100%. This package is **unpublished**. Do not upload until Mika review.

Statuses are recorded separately. This task is **not** complete.

| Gate | Status |
| --- | --- |
| Implementation | done (this increment; SOURCE-SHA filled after freeze) |
| Upload | **not done** |
| Activated | **not done** (live remains fa5184c) |
| Unauthenticated QA | partial (parent 14:13 CST on live fa5184c) |
| Authenticated dashboard QA | **BLOCKED** |
| `user_accepted` / `released` | no |

## Policy

- Default admin password minimum remains **16**.
- **6** only when Worker var `ADMIN_STAGING_TEST_PASSWORD_MIN=6` **and** host is `kaiyue-travel-staging.kai-yue.workers.dev`.
- Production `ENVIRONMENT`, apex/www/legacy, and `admin.kaiyuemacau.com` stay **16** even if the flag is set or Host is spoofed.
- Hasher default 16. Isolated seed mode: `ADMIN_SEED_STAGING_TEST=1` (env route still supported).
- Git `ADMIN_EMAILS` remains `daniel@kaiyuemacau.com`. Overlay planned allowlist: Daniel + `uat-admin-20261114@kaiyue.test`. Do not commandeer Daniel.
- `TEMP_ADMIN_EXPIRES_AT` remains `2026-11-24T15:59:59+08:00`. D1 `043cd0ff-…` / R2 `kaiyue-offers-staging`.
- No public signup, `DEV_ADMIN_BYPASS`, Access/CORS/session/expiry weakening, seed, DNS, production deploy, or Workers Builds retry.

## Artifact hashes

Filled in the freeze commit after `node scripts/build-complete-ledger.mjs --env staging` and `node scripts/build-provision-artifact.mjs`.

Do not reuse overlay sha256 `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6` or fa5184c zip `b5b0be97…` with this runtime.

## Parent next

1. Mika source + overlay review.
2. Staging versions-upload of the **new** zip with the **new** overlay (`run_worker_first: true`, clean entry dir, external `--assets`). `--keep-vars` for `BETTER_AUTH_SECRET`.
3. Activate only after review.
4. Seed synthetic UAT with hasher (`ADMIN_SEED_STAGING_TEST=1` or vault loopback with that mode). Apply SQL to staging D1 `043cd0ff-…` only.
5. Computer-use UAT. Production untouched.
