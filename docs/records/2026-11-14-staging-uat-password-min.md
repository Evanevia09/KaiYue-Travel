# 2026-11-14 — staging UAT six-character password minimum

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**As-of:** 2026-11-14 22:54 CST (Asia/Macau) owner request  
**Branch:** `cursor/temporary-admin-login-763f` (PR #26 into `staging`)  
**runtimeSourceSHA:** `6b62da09fba7de4e88d418750fde22a71a915a20`  
**Live staging:** still fa5184c / `114b62a3-83c9-4cac-b80a-21d0d855717c` @100%. This package is **unpublished**. Do not upload until Mika review.

Statuses are recorded separately. This task is **not** complete.

| Gate | Status |
| --- | --- |
| Implementation | done (`6b62da09fba7de4e88d418750fde22a71a915a20`) |
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

| Item | Value |
| --- | --- |
| runtimeSourceSHA | `6b62da09fba7de4e88d418750fde22a71a915a20` |
| Staging zip | `artifacts/kaiyue-staging-complete-6b62da0.zip` |
| Staging zip sha256 | `641d725d063c2db37f2aa9dae335fdad8a23ef30e83de24eed0c1df58fa58572` |
| Staging zip bytes | 10979636 |
| `entry.js` sha256 | `bc839f5bd0afa400839663a54fc89a930e5984decf74aac91e79bf6ab5decb3d` |
| Ledger files | 136 |
| Overlay | `docs/records/wrangler.staging-artifact.jsonc` |
| Overlay sha256 | `b754e2fabc3693e3d89e27f5c966442d1e1ceecad1914277a40fb7547794720b` |
| Provisioner zip | `artifacts/kaiyue-provision-admin-local.zip` |
| Provisioner zip sha256 | `451cbb7de9d3123b1901ba28af3fdbcec370d622ee39e145eef1b69303521b51` |
| Provisioner zip bytes | 5348 |
| Production zip | **not rebuilt**; fa5184c production package remains unuploaded |

Do not reuse overlay sha256 `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6` or fa5184c zip `b5b0be97…` with this runtime.

## Parent next

1. Mika source + overlay review.
2. Staging versions-upload of the **new** zip with the **new** overlay (`run_worker_first: true`, clean entry dir, external `--assets`). `--keep-vars` for `BETTER_AUTH_SECRET`.
3. Activate only after review.
4. Seed synthetic UAT with hasher (`ADMIN_SEED_STAGING_TEST=1` or vault loopback with that mode). Apply SQL to staging D1 `043cd0ff-…` only.
5. Computer-use UAT. Production untouched.

```text
npx wrangler@4.132.0 versions upload ./entry.js \
  --config ./wrangler.staging-artifact.jsonc \
  --no-bundle \
  --assets /absolute/path/to/6b62da0/dist-client \
  --name kaiyue-travel-staging \
  --keep-vars \
  --strict \
  --message "PR26 6b62da09fba7de4e88d418750fde22a71a915a20 staging UAT 6-min"
```
