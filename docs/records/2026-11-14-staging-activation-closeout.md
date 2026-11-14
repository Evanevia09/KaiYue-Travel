# 2026-11-14 — staging fa5184c activation closeout (docs only)

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**As-of:** 2026-11-14 14:13 CST (Asia/Macau)  
**Branch:** `cursor/temporary-admin-login-763f` (PR #26 into `staging`)  
**This writer:** docs-only. No runtime rebuild, merge, secrets, DNS, D1, seed, production, or GitHub staging CD.

Statuses are recorded separately. This task is **not** complete.

| Gate | Status | Evidence |
| --- | --- | --- |
| Implementation | done | runtimeSourceSHA `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4` |
| Upload | done | 2026-11-14 13:37 CST GUI + pinned Wrangler 4.132.0 `--strict` on interactive TTY; version `114b62a3-83c9-4cac-b80a-21d0d855717c` (v6). Typo `…b080…` is **not** a valid version (API 100146). |
| Activated | done | Owner t112u 14:04 CST. Mika technical review 14:06 CST **conditional PASS** (parent-stated). `versions deploy` `114b62a3-…@100%` 14:08:57 CST. Deployment `32931ef9-0e11-4c5b-9f5a-5649d7aaf747`. Staging **100% v6**. |
| Unauthenticated QA | partial | Parent browser report 14:13 CST on https://kaiyue-travel-staging.kai-yue.workers.dev (below). This writer did not re-run the browser. |
| Authenticated dashboard QA | **BLOCKED** | Daniel credentials absent. No seed / vault write. |
| `user_accepted` | no | Staging link delivered; not whole-task acceptance. |
| `released` | no | Production unchanged. `admin.kaiyuemacau.com` not attached. |

## Current serving (2026-11-14 14:09 CST readback)

Account `33ecc75158a1cdd23ba1a62eb70c5103` only.

| Surface | Current 100% | Deployment | Notes |
| --- | --- | --- | --- |
| Staging `kaiyue-travel-staging` | `114b62a3-83c9-4cac-b80a-21d0d855717c` (v6, fa5184c) | `32931ef9-0e11-4c5b-9f5a-5649d7aaf747` | `raw_run_worker_first=true`, `serve_directly=false`. D1 `043cd0ff-…`, R2 `kaiyue-offers-staging`. Secret name `BETTER_AUTH_SECRET` present (value not read). |
| Staging rollback (not used) | `b53c0353-bfc4-4700-a5c7-725b7167af6e` | was `caeee848-fb0d-4914-a770-2d60996f106e` | Prior 100% until 14:08:57 CST. |
| Production `kaiyue-travel` | `5b859f36-39c5-43aa-817a-434d56ae8214` | `7c72bf5a-df8b-407c-83d5-774159d10b41` | Owner “Version 2 illustrative photos”, 2026-11-13 13:27:13 CST. **Unchanged by this task.** Historical 2026-11-12 pointer `74ebe1fc-…` is no longer current production. |
| Custom domains | 0 | — | Apex/www still route to production `kaiyue-travel`. `admin.kaiyuemacau.com` **not** attached. Admin-host redirect/noindex **not** verified. |

`TEMP_ADMIN_EXPIRES_AT` remains `2026-11-24T15:59:59+08:00`. No seeds/secrets/data writes.

## Frozen packages (bytes unchanged; no new runtime package)

| Item | Hash |
| --- | --- |
| Staging zip | `b5b0be97da9189c5da5dccf88e8a29d95ed4841a724cbaa84dc249ceb26a2bf5` |
| Staging `entry.js` | `646f7dc771d6fb0088498c5002763c083d841668e8a263242b5b726c025120d9` |
| Overlay `wrangler.staging-artifact.jsonc` | `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6` |
| Script etag (uploaded version) | `b812c444ece4c86da3a847e409436bfdb5ccf4ccff928d141be5e2ac2ac3bf55` |
| Assets | 139 on-disk `dist-client` minus 3 ignored metafiles (`.assetsignore`, `_redirects`, `_headers`) = **136** manifest assets. No remote asset/module enumeration. |

## Packaging (current guidance; unpack-in-place is stale)

2026-11-12 unpack-so-`entry.js`-and-`dist-client`-share-cwd instructions are **stale**. That layout lets `--no-bundle` collect marketing HTML/SQL/txt as Worker **Text modules** (71 extras in the 2026-11-14 11:57 CST dry-run).

**Current (documentation only, already used for the uploaded version):** clean directory containing only `entry.js` + overlay. Point `--assets` at frozen `dist-client` **outside** that base_dir. Keep overlay hash `11ead30e…` (do not edit overlay to set `find_additional_modules`). Interactive TTY is required to keep `--strict` when `last_deployed_from=api`.

```text
npx wrangler@4.132.0 versions upload ./entry.js \
  --config ./wrangler.staging-artifact.jsonc \
  --no-bundle \
  --assets /absolute/path/to/frozen/dist-client \
  --name kaiyue-travel-staging \
  --keep-vars \
  --strict \
  --message "PR26 fa5184ccda2d149c2d4acb8914db315ca8e5b4c4 staging trial"
```

Do not run this from a source-writer agent. Activation used `versions deploy 114b62a3-83c9-4cac-b80a-21d0d855717c@100%` with explicit account/config, not `wrangler deploy`.

## Parent unauthenticated browser QA (2026-11-14 14:13 CST)

URL: https://kaiyue-travel-staging.kai-yue.workers.dev  
Parent report only. This writer did not drive the browser.

- `/login` renders desktop + 400×985; DevTools 0 errors/issues; 14 network requests 200.
- `/admin` 302 `/login`; `/api/v1/admin/summary` 401.
- `/`, `/index.html` public marketing 200 (correct for workers.dev preview, not the admin host).
- `/about`, `/about/index.html`, `/pt`, `/zh-Hant`, `/robots.txt`, `/services/city-tours` 200.
- Login **meta** `noindex, nofollow`. Do **not** claim `X-Robots-Tag` was observed.
- `robots.txt` disallows admin / booking confirmation / api.
- No login submitted. No writes.

Authenticated dashboard QA **BLOCKED**. Admin-host routing/noindex **not** verified.

## Queued, not started

Owner approved future GitHub auto-deploy to staging **after** dashboard verification. Still queued. Do **not** implement now. Production still needs separate approval. Do not retry production Workers Builds.

## Operator evidence (sanitized; not execution scripts)

| File | sha256 |
| --- | --- |
| `docs/records/2026-11-14-strict-conflict-investigation.md` | `477afb5ee9f1efbb0637096526b12ca707317f7ebd6aaab64a1e47ab10f0808d` |
| `docs/records/2026-11-14-post-upload-verification.md` | `99563c0fb18d21357942894e3d1cc128f69edf14bfcae33a48fcb8c4e0d461e7` |
| `docs/records/2026-11-14-staging-activation.md` | `6bf5e8a69f6e0b1d0be426e0b37ec7d9da26bc474b3a64e7edd3f23aaf6e9444` |

Published git at this closeout (fetched, not merged): `origin/main` `037b93ad704ce4ed45d0148ad22a7a05cf030a81`; `origin/staging` `b38ad506f417edde73827f87737ef2b66fe7366b`. Open PR #32 (`cursor/public-photos-v2`) is separate. This branch HEAD before this docs commit: `5ca8cf0922ebed938cdcaa1a0e62bda6e747e520`.
