# 2026-11-12 — admin.kaiyuemacau.com complete ledgers (source freeze)

**Current runtimeSourceSHA:** `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4` (unchanged; do not rebuild)  
**Superseded packages:** `8f41369c1ec8caf1f1aac20e40205a1dab955110` and 5dab462. Box artifacts gitignored. No secrets.

**Independent rereview (2026-11-12):** file `docs/records/2026-11-12-fa5184c-independent-rereview.md` sha256 `312796895b693dbdc2b4b627b8bda8734943137fad0b13f87a3297fcf94f9e17`. Auth fixes confirmed. GitHub Actions `check` 145/145 on `8251acf6472dcf4bc94e83706527bc9c2a55aae1` (run 43167279190). Staging versions-upload is granted **only** with the reviewed overlay. Production is **not** approved. Parent signoff + operator OAuth still pending. This checkpoint does not upload, DNS, seed, merge, or retry production Workers Builds.

## Deployment inputs (two files; overlay is authoritative)

A staging versions-upload uses **both**:

1. Frozen runtime ZIP bytes (Worker `entry.js` + `dist-client`). Do not rebuild.
2. Separate operator config `docs/records/wrangler.staging-artifact.jsonc` sha256 `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6`.

The overlay is the upload config. The wrangler file **inside** the ZIP omits `assets.run_worker_first` (platform default false) and is **not** the staging upload config. Copy the overlay next to the unpacked ZIP and pass it as `--config`. Do not upload the frozen in-ZIP wrangler.jsonc if the admin hostname will be attached to that version.

Required overlay delta: `assets.run_worker_first: true` so admin-host middleware actually runs for `/` and marketing/locale HTML. Also pins account `33ecc75158a1cdd23ba1a62eb70c5103`, `no_bundle` / `keep_vars`, `workers_dev: true`, `preview_urls: false`. Secrets omitted; `--keep-vars` keeps live `BETTER_AUTH_SECRET`.

```text
npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel-staging --config wrangler.staging-artifact.jsonc
```

No `--secrets-file`. No `wrangler deploy`. No production upload.

## Frozen packages (bytes unchanged)

Account `33ecc75158a1cdd23ba1a62eb70c5103`. Zone `fb84210cb8175ff4412b444805e1a6a5`. compatibility_date **2026-09-01** + `nodejs_compat`.

| Item | Staging | Production |
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
| Live secrets (names only) | `BETTER_AUTH_SECRET` | none |
| Rollback version | `b53c0353-bfc4-4700-a5c7-725b7167af6e` | `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` |
| Upload config | **overlay** `wrangler.staging-artifact.jsonc` (`run_worker_first: true`) | **not approved**; needs its own reviewed overlay after staging verification |

## ASSETS / Worker-first (no runtime change)

Inspected frozen staging `entry.js` `handle()` (no rebuild):

- `run_worker_first: true` invokes the Worker before asset-first HTML. Official: [Worker script routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).
- Static bytes are served with `env.ASSETS.fetch(...)` (`matchStaticAsset`, `fallbackToAssets`, image passthrough, error pages). That binding hits the asset store, not the Worker fetch handler, so it does not recurse.
- Browser `/`, `/about`, `/pt`, `/zh-Hant` are **not** exact `manifest.assets` keys, so they reach Astro middleware (admin-host redirect + noindex).
- Dashboard `/_astro/*`, `/images/*`, `/favicon.ico` match the assets set and delegate to `ASSETS` without middleware. Intended; no recursion.
- Residual, not rebuilt: exact English `*/index.html` keys in `manifest.assets` (including `/index.html`) skip Astro middleware if requested as that pathname. Ordinary `/` and locale trees still hit middleware. `/robots.txt` on the admin host would also skip noindex. Not a High CSRF issue; `requireSameOrigin` unchanged.

No Worker source defect found that requires changing `fa5184c` bytes.

Production package remains fail-closed (no allowlist/expiry in wrangler; live has no `BETTER_AUTH_SECRET`). A later production step needs its own reviewed overlay (same `run_worker_first` flag), staging verification, and separate authorization. Do not retry production Workers Builds. Not `user_accepted`. Not `released`.
