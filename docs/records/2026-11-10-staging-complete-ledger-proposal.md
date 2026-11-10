# 2026-11-10 — Staging complete-ledger trial is PROPOSED, not approved

**task_id:** `kai-yue-temporary-admin-login-20261110`  
Mika is assessing a **staging-only** full rebuilt asset ledger + Worker on `kaiyue-travel-staging` / D1 `043cd0ff-a1e6-4b5e-98c1-968c286e0c70`. Awaiting her decision. **No executor writes.** Not production. Not `user_accepted`. Not `released`. Rollback is the existing previous Worker version including its assets.

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
