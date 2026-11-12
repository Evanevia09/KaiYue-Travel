# 2026-11-10 — Staging complete-ledger trial is PROPOSED, not approved

**task_id:** `kai-yue-temporary-admin-login-20261110`  
Evan t81u (2026-11-12 13:05 Asia/Macau) asked to get it live after t79 unknown-static explanation. That authorizes **pursuing** this package onto staging then production dashboard. Independent infrastructure verifier executes Cloudflare writes. This source writer still does **not** upload. PM staging UI/console/security before production vars. Not `user_accepted`. Not `released`.

Complete-ledger zip / runtimeSourceSHA `5dab46281ce84b5b5974a28bdb9f94513c670644` hashes below are **unchanged**. This docs increment only records rollback provenance that was missing from the hashed proposal.

Additive 14-file `assets.jwt` + `keep_assets` remains **unsafe**. This proposal is a **normal complete** replacement ledger from this branch (HTML included as an intentionally new staged version). Unknown live-only files are a residual risk to assess, not an automatic prohibition.

## Pointers (PM return)

| Item | Value |
| --- | --- |
| runtimeSourceSHA (built) | `5dab46281ce84b5b5974a28bdb9f94513c670644` |
| GitHub Actions | [`42864265892`](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/42864265892) **success** (`check`) on that SHA |
| Box zip | `artifacts/kaiyue-staging-complete-5dab462.zip` |
| Zip sha256 | `d10a3d7f117fcae626eeffa9b928781b082e1a7afae61c08bab54d29549ce923` (10984197 bytes) |
| Manifest sha256 | `ee98d3395de8682f133f26db793b183e1fe45a378745406096c8df9ca6db2bb5` (`assets-upload-session.manifest.json`) |
| `entry.js` sha256 | `4e21131158d4a69516eccf60ee05bbf65a274ec2fbfc11c1a91ef631932e4654` (4185645 bytes, MIME `application/javascript+module`, `main_module` exact name `entry.js`) |
| Ledger | 136 files, 11603025 bytes; 60 HTML (all staging URL); 31 `/_astro`; skipped `_headers` / `_redirects` / `.assetsignore` |
| Provisioner zip | **unchanged** `a5195c7f597bd95e0851f6b675bd299dd76aee8c6f8fa66357d805e6b85afa3a` (env-only; do not start the server) |

Do **not** send keep_assets. Do **not** send a 14-file jwt. Connector must be able to set `Authorization: Bearer <assets-upload-session JWT>` on `POST /workers/assets/upload?base64=true` (account token is not accepted there). See `OPERATOR-API-PLAN.txt` in the zip.

Do not retry production Workers Builds. Do not send passwords or Cloudflare secrets to the agent.

## Rollback provenance (GET verified vs POST untested)

Independent sanitized CF GET snapshot **2026-11-11 01:34:24 Asia/Macau** (`2026-11-10T17:34:24Z`). GET only. Production unchanged.

| Item | Value |
| --- | --- |
| Evidence JSON | `docs/records/2026-11-11-staging-rollback-evidence.sanitized.json` sha256 `39a4e00e4acab704d5f7b4dca5b0b31cf50eb5ee5a69956a8241ed25eb10edab` |
| Plan | `docs/records/2026-11-11-staging-rollback-plan.md` sha256 `a38b71d968ad6581567fce0ba6850b117c2d4d2d126c352c9ca35152c166f315` |
| Checksums | `docs/records/2026-11-11-staging-rollback.SHA256SUMS` |
| Script | `kaiyue-travel-staging` (not `kaiyue-travel`) |
| Current 100% version | `b53c0353-bfc4-4700-a5c7-725b7167af6e` (version 5 of 5; **this is the current deployment**, not an idle prior version) |
| Current deployment | `caeee848-fb0d-4914-a770-2d60996f106e` |
| D1 / R2 | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` / `kaiyue-offers-staging` (verified isolated) |
| Assets | `ASSETS` binding + version `script_runtime.assets` present (`serve_directly=true`). **No** file inventory or content hashes in these GET APIs. Residual unknown completeness remains. |

**Verified metadata** is the snapshot above. **Expected untested behavior:** after a future trial upload, `POST /accounts/{account_id}/workers/scripts/kaiyue-travel-staging/deployments` with `strategy: percentage` and `versions: [{ "version_id": "b53c0353-bfc4-4700-a5c7-725b7167af6e", "percentage": 100 }]` is documented to restore that **already uploaded** version’s script **and attached assets** to traffic. Not executed. Not a D1/R2 mutate. A POST now would only re-record the same 100% version (not tested). Do not call this on production.
