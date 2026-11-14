# 2026-11-12 — admin.kaiyuemacau.com complete ledgers (source freeze)

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**Current runtimeSourceSHA:** `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4` (unchanged; do not rebuild)  
**Superseded packages:** `8f41369c1ec8caf1f1aac20e40205a1dab955110` and 5dab462. Box artifacts gitignored. No secrets.

**Current serving (2026-11-14 14:09 CST Asia/Macau):** staging 100% version `114b62a3-83c9-4cac-b80a-21d0d855717c` (v6) on deployment `32931ef9-0e11-4c5b-9f5a-5649d7aaf747`. Closeout: `docs/records/2026-11-14-staging-activation-closeout.md`. Not `user_accepted`. Not `released`. Authenticated QA **BLOCKED**. `admin.kaiyuemacau.com` not attached.

Dated history (do not treat as current traffic):

- **2026-11-12 rereview:** `docs/records/2026-11-12-fa5184c-independent-rereview.md` sha256 `312796895b693dbdc2b4b627b8bda8734943137fad0b13f87a3297fcf94f9e17`. Auth fixes + 145 CI on `8251acf`. Staging upload granted only with overlay. OAuth then pending.
- **2026-11-12 14:23 CST GET:** staging still 100% `b53c0353-bfc4-4700-a5c7-725b7167af6e`; production then `74ebe1fc-135d-4a97-b297-e2d1d2748fa0`.
- **2026-11-13:** production became owner photo version `5b859f36-39c5-43aa-817a-434d56ae8214` (not this task).
- **2026-11-14 13:37 CST:** frozen zip uploaded (GUI + 4.132.0 `--strict` TTY). Version `114b62a3-…b80a…`. Typo `…b080…` invalid.
- **2026-11-14 14:04–14:08 CST:** owner activate; Mika conditional PASS; `versions deploy` `@100%`.

## Deployment inputs (two files; overlay is authoritative)

A staging versions-upload uses **both**:

1. Frozen runtime ZIP bytes (Worker `entry.js` + `dist-client`). Do not rebuild.
2. Separate operator config `docs/records/wrangler.staging-artifact.jsonc` sha256 `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6`.

The overlay is the upload config. The wrangler file **inside** the ZIP omits `assets.run_worker_first` and is **not** the staging upload config. Do not upload the frozen in-ZIP wrangler.jsonc.

**Stale (2026-11-12):** unpack the zip so `entry.js` and `dist-client` share the working-directory root. That layout pulls marketing HTML into the Worker as Text modules.

**Current packaging (docs only; already used 2026-11-14):** clean directory with only `entry.js` + overlay. Point `--assets` at frozen `dist-client` outside that base_dir. Interactive TTY required to keep `--strict` when `last_deployed_from=api`.

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

No `--secrets-file`. No `wrangler deploy`. No production upload. Do not rerun from a source-writer agent.

## Frozen packages (bytes unchanged)

Account `33ecc75158a1cdd23ba1a62eb70c5103`. Zone `fb84210cb8175ff4412b444805e1a6a5`. compatibility_date **2026-09-01** + `nodejs_compat`.

| Item | Staging | Production package (not uploaded) |
| --- | --- | --- |
| Zip | `artifacts/kaiyue-staging-complete-fa5184c.zip` | `artifacts/kaiyue-production-complete-fa5184c.zip` |
| Zip sha256 | `b5b0be97da9189c5da5dccf88e8a29d95ed4841a724cbaa84dc249ceb26a2bf5` | `6bb3489ea8218477c5950bd8779baf25b09e288582123bcde5df957e6490af69` |
| Zip bytes | 10979371 | 10978222 |
| `entry.js` sha256 | `646f7dc771d6fb0088498c5002763c083d841668e8a263242b5b726c025120d9` | `633b224c7098a58d98b3dbce3af7f27eed4f0f65d4cfff8826b9da3d6d2dee8f` |
| Ledger files | 136 | 136 |
| Script | `kaiyue-travel-staging` | `kaiyue-travel` |
| Canonical | `https://kaiyue-travel-staging.kai-yue.workers.dev` | `https://kaiyuemacau.com` |
| D1 | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` | `06cf879d-8fea-4088-8881-7d382e1b8c11` |
| R2 | `kaiyue-offers-staging` | `kaiyue-offers-production` |
| Live secrets (names only) | `BETTER_AUTH_SECRET` | unchanged by this task |
| **Current 100% (2026-11-14)** | `114b62a3-83c9-4cac-b80a-21d0d855717c` | `5b859f36-39c5-43aa-817a-434d56ae8214` (owner photos 2026-11-13; not this task) |
| Rollback version | `b53c0353-bfc4-4700-a5c7-725b7167af6e` | n/a for this task (do not roll production) |
| Upload config | overlay `run_worker_first: true` (authoritative) | production fa5184c zip **not** uploaded |

Assets on the uploaded staging version: 139 disk files minus 3 ignored metafiles = 136 manifest assets. `raw_run_worker_first=true` / `serve_directly=false`. No remote asset/module enumeration.

## ASSETS / Worker-first (no runtime change)

Inspected frozen staging `entry.js` `handle()` (no rebuild):

- `run_worker_first: true` invokes the Worker before asset-first HTML. Official: [Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).
- Static bytes are served with `env.ASSETS.fetch(...)` (`matchStaticAsset`, `fallbackToAssets`, image passthrough, error pages). That binding hits the asset store, not the Worker fetch handler, so it does not recurse.
- On **workers.dev preview**, `/` and marketing HTML are public 200 (parent 2026-11-14 14:13 CST). Admin-host redirect/noindex apply only when `admin.kaiyuemacau.com` is attached; that hostname is **not** attached, so that routing is **not** verified.
- Residual, not rebuilt: exact English `*/index.html` keys in `manifest.assets` skip Astro middleware if requested as that pathname. Parent report: `/` and `/index.html` both 200 marketing on workers.dev.

Production fa5184c package remains unuploaded. A later production step needs its own reviewed overlay, staging dashboard verification, and separate authorization. Do not retry production Workers Builds. GitHub staging CD is queued after dashboard verification; do not implement now.
