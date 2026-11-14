# Post-upload verification — 2026-11-14 13:40 CST (Asia/Macau)

Read-only check of the owner-approved frozen `fa5184c` staging `versions upload`. No activation, DNS, secrets, seed, data, or source changes were made. This finding does not authorize promotion.

## Result: uploaded, not active

A sixth inactive Worker version exists on `kaiyue-travel-staging` in Kai Yue account `33ecc75158a1cdd23ba1a62eb70c5103` only.

- **Authoritative version ID:** `114b62a3-83c9-4cac-b80a-21d0d855717c` (number 6)
- **ID correction:** the brief/transcribed ID `114b62a3-83c9-4cac-b080-21d0d855717c` is a typo (`b080` vs `b80a`). Official CLI `versions view` and Cloudflare MCP GET of the typo ID both returned error **100146** (“The requested Worker version could not be found”). The versions list, MCP GET, and CLI view of `…b80a…` all agree.
- **Created:** 2026-11-14 13:37:17 CST (Asia/Macau); API `created_on` `2026-11-14T05:37:17.377479Z`. Consistent with the ~13:38 CST GUI success screenshot.
- **Annotations:** `workers/message` = `PR26 fa5184ccda2d149c2d4acb8914db315ca8e5b4c4 staging trial`; `workers/triggered_by` = `version_upload`; `metadata.source` = `wrangler`; author `scalingsmb@gmail.com`; `has_preview` = true.
- **Inactive:** the version is **not** in the current staging deployment. Current deployment remains `caeee848-fb0d-4914-a770-2d60996f106e`, created 2026-11-10 22:40:34 CST, **100%** `b53c0353-bfc4-4700-a5c7-725b7167af6e`. Deployment history still has five rows; no new deployment was added.

## Traffic and routes (unchanged)

- **Staging traffic:** 100% `b53c0353-bfc4-4700-a5c7-725b7167af6e` (same deployment as the 13:33 CST preflight).
- **Production (`kaiyue-travel`):** 100% `5b859f36-39c5-43aa-817a-434d56ae8214`, deployment `7c72bf5a-df8b-407c-83d5-774159d10b41`, created 2026-11-13 13:27:13 CST, message “Version 2 illustrative photos”. Untouched.
- **Workers custom domains:** none (`total_count` 0).
- **Zone routes (zone `fb84210cb8175ff4412b444805e1a6a5`):** `www.kaiyuemacau.com/*` and `kaiyuemacau.com/*` both still point at production script `kaiyue-travel`. Staging is not attached to `admin.kaiyuemacau.com`.
- **Staging workers.dev subdomain:** `enabled` true, `previews_enabled` false.

## New version metadata

Official CLI `npx wrangler@4.132.0 versions view 114b62a3-83c9-4cac-b80a-21d0d855717c --name kaiyue-travel-staging --json` (exit 0 at 13:40:20 CST) and Cloudflare MCP GET of the same path agree.

- `resources.script_runtime.assets.raw_run_worker_first` = **true**
- `resources.script_runtime.assets.serve_directly` = **false** (the inverse form; the API object has no separate `run_worker_first` field)
- `base_path` = `/`
- Asset binding `ASSETS` type `assets` is present
- `last_deployed_from` = `wrangler`
- Script `etag` = `b812c444ece4c86da3a847e409436bfdb5ccf4ccff928d141be5e2ac2ac3bf55`
- Handlers: `fetch`
- Compatibility: `2026-09-01`, flags `nodejs_compat`, usage model `standard`
- Inherited/public bindings match the reviewed overlay: D1 `DB` `043cd0ff-a1e6-4b5e-98c1-968c286e0c70`, R2 `OFFERS_BUCKET` `kaiyue-offers-staging`, public vars `ADMIN_EMAILS`, `BOOKING_NOTICE_HOURS`, `BUSINESS_TIMEZONE`, `DEV_ADMIN_BYPASS`, `ENVIRONMENT=preview`, `PUBLIC_SITE_URL`, `TEMP_ADMIN_EXPIRES_AT`, `WHATSAPP_NUMBER`. Secret binding `BETTER_AUTH_SECRET` is present as `secret_text` (name and type only; value not returned and not read).

Applied asset configuration from the ignored metafiles:

- `raw_headers`: `/_astro/*` → `Cache-Control: public, max-age=31536000, immutable`
- `raw_redirects`: `/services/` and `/services` → `/services/airport-transfer` 301

These match the frozen `dist-client` `_headers` and `_redirects` contents.

## Asset count: 136 vs 139

Operator report from the approved GUI upload: **56 uploaded + 80 already uploaded = 136 files**, Total 4089.04 KiB, gzip 821.09 KiB. That matches pinned Wrangler 4.132.0 `syncAssets`, which logs `Success! Uploaded ${numberFilesToUpload} files (${skipped} already uploaded)` where `skipped = Object.keys(manifest).length - numberFilesToUpload` (content-addressed reuse).

The 139 on-disk `dist-client` files minus **three default-ignored metafiles** equals 136 manifest assets.

Wrangler 4.132.0 `createAssetsIgnoreFunction` always ignores, before applying any `.assetsignore` patterns:

- `/.assetsignore` (`CF_ASSETS_IGNORE_FILENAME`)
- `/_redirects` (`REDIRECTS_FILENAME`)
- `/_headers` (`HEADERS_FILENAME`)

Official docs agree these are configuration, not served public assets:

- https://developers.cloudflare.com/workers/static-assets/headers/ — `_headers` “will not itself be served as a static asset”
- https://developers.cloudflare.com/workers/static-assets/redirects/ — `_redirects` “will not itself be served as a static asset”
- https://developers.cloudflare.com/workers/static-assets/ignore-assets/ — `.assetsignore` matches are excluded; the ignore file is also ignored by default

The project `.assetsignore` additionally lists `wrangler.json` and `.dev.vars`; those two files are not present under `dist-client`, so they do not change the count. `139 − 3 = 136`. Headers and redirects appear on the new version as parsed rules, which is independent evidence that those two files were consumed as config rather than uploaded as static assets.

## Text modules

The sanctioned version GET and `versions view` **do not include a `modules` field** (`script` keys are only `etag`, `handlers`, `last_deployed_from`). Worker Text modules therefore cannot be independently enumerated from this readback.

Supporting, but not equivalent, evidence: the same clean-entry-only layout produced **0 additional Text modules** in the 13:33 CST `--strict --dry-run`, and the operator report of the real GUI upload said there was no extra Text-module table. That is consistent with the intended packaging, not a post-upload module inventory.

## Confidence limits

- Asset **names** of the 136 manifest files are not returned by the sanctioned version API; count reconciliation uses official ignore rules, applied headers/redirects, the operator 56+80 line, and Wrangler source, not a live asset listing.
- Text-module absence cannot be proven from version metadata (no `modules` field). No credential files or internal APIs were used to go further.
- `has_preview` is true on the version, while the script subdomain still has `previews_enabled` false. This check did not probe a preview URL.
- No new execution authorization follows from these findings. Production and staging traffic were not changed.

## Evidence locations

- This file and `POST-UPLOAD-VERIFICATION-2026-11-14-1340-CST.sanitized.json` under `/workspace/kaiyue-fa5184c-admin-review/` (original SHA256SUMS / REVIEW.md / overlay were not overwritten).
- Raw CLI outputs (no secret values in the version JSON): `/tmp/kaiyue-postupload-20261114-1339/`
- GUI screenshot referenced by the operator: `/tmp/computer-use/sand-subagent-b65bad25-7cf4-a036-9b40-39cd251a1a2f.5aea20c9-a8e7-4e72-98fb-f3ba20275ab7.webp`
