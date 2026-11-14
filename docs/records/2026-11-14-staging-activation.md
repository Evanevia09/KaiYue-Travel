# Staging activation — 2026-11-14 14:09 CST (Asia/Macau)

Owner authorization: Evan t112u at 14:04 CST (Asia/Macau), “activate the staging for testing.” Scope is staging traffic only. Production, admin-domain attach, seed, secrets, D1 writes, CD, and Builds were not changed. Rollback was not performed.

## Command (executed)

Fresh preflight at 14:08:40–14:08:54 CST found no drift: only Kai Yue account `33ecc75158a1cdd23ba1a62eb70c5103`; staging 100% `b53c0353-bfc4-4700-a5c7-725b7167af6e`; production 100% `5b859f36-39c5-43aa-817a-434d56ae8214`; custom domains 0; version `114b62a3-83c9-4cac-b80a-21d0d855717c` still had `raw_run_worker_first=true`. Overlay hash unchanged: `11ead30e9c3afa33e333027eb2850a40b50c815792e3e225458584d98d9c0bb6`.

Pinned Wrangler 4.132.0 `versions deploy --help` and official docs confirm the positional form `[<version-id>@<percentage>..]`:

- https://developers.cloudflare.com/workers/wrangler/commands/workers/#versions-deploy
- https://developers.cloudflare.com/workers/versions-and-deployments/deployment-management/

CLI source: `acceptPromptDefaults = args.yes || optionalVersionTraffic.size + tagTraffic.size > 0`. Providing the explicit `VERSION@100%` positional accepts those prompt defaults without a TTY and without `--yes`. Wrangler `--yes` / `--env` / `--secrets-file` were not passed. (`npx --yes` only skips the npm install prompt.)

```bash
cd /tmp
export CLOUDFLARE_ACCOUNT_ID=33ecc75158a1cdd23ba1a62eb70c5103
npx --yes wrangler@4.132.0 versions deploy \
  114b62a3-83c9-4cac-b80a-21d0d855717c@100% \
  --name kaiyue-travel-staging \
  --config /workspace/kaiyue-fa5184c-admin-review/wrangler.staging-artifact.jsonc
```

Ran 14:08:55–14:08:57 CST, exit 0. CLI: `SUCCESS Deployed kaiyue-travel-staging version 114b62a3-83c9-4cac-b80a-21d0d855717c at 100% (0.55 sec)`. “No non-versioned settings to sync. Skipping...” Deployment message skipped (empty default).

## Readback (14:09:04 CST)

CLI `deployments status` / `versions view` and Cloudflare MCP GET agree.

- **Staging now 100%** `114b62a3-83c9-4cac-b80a-21d0d855717c` (v6, frozen fa5184c). New deployment `32931ef9-0e11-4c5b-9f5a-5649d7aaf747`, source wrangler, created 2026-11-14 14:08:57 CST (`2026-11-14T06:08:57.19652Z`), triggered_by `deployment`.
- Active version metadata unchanged: `raw_run_worker_first=true`, `serve_directly=false`, etag `b812c444ece4c86da3a847e409436bfdb5ccf4ccff928d141be5e2ac2ac3bf55`, isolated D1 `043cd0ff-a1e6-4b5e-98c1-968c286e0c70`, R2 `kaiyue-offers-staging`, `ENVIRONMENT=preview`, `DEV_ADMIN_BYPASS=false`. Secret name `BETTER_AUTH_SECRET` present as `secret_text` (value not returned, not read).
- **Production unchanged:** 100% `5b859f36-39c5-43aa-817a-434d56ae8214` on deployment `7c72bf5a-df8b-407c-83d5-774159d10b41` (2026-11-13 13:27:13 CST, “Version 2 illustrative photos”).
- **Domains / routes unchanged:** custom domains 0; `www.kaiyuemacau.com/*` and `kaiyuemacau.com/*` still point at production script `kaiyue-travel`. Staging workers.dev enabled, previews disabled. `admin.kaiyuemacau.com` is not attached.
- **Rollback target (not used):** previous staging deployment `caeee848-fb0d-4914-a770-2d60996f106e` / version `b53c0353-bfc4-4700-a5c7-725b7167af6e`. Rollback remains a separate action.

## Minimal HTTP checks (14:09:20 CST)

Test URL from official account metadata, not a saved alias: `GET /accounts/…/workers/subdomain` returned `kai-yue`, script name `kaiyue-travel-staging`, workers.dev enabled. Base: https://kaiyue-travel-staging.kai-yue.workers.dev

GET only, redirects not followed, no login/POST/seed/credentials.

| Path | Status | Result |
| --- | --- | --- |
| `/login` | 200 `text/html` (7421 bytes) | Login page available. Title “Admin sign in · Kai Yue”. Meta robots `noindex, nofollow`. CF-RAY `a5a3d8c81952d657-IAD`. |
| `/admin` | 302, `Location: /login`, empty body | Unauthenticated request redirected to login. CF-RAY `a5a3d8ca5fab1779-IAD`. |
| `/api/v1/admin/summary` | 401 `application/json` | `{"error":{"code":"UNAUTHORIZED","message":"Admin authentication is required.","requestId":"req_21b4e5cd0f8a46ba84ae"}}`. `Cache-Control: private, no-store, no-cache, must-revalidate`; also `x-frame-options: DENY`, `x-content-type-options: nosniff`. CF-RAY `a5a3d8d07d4b1779-IAD`. |

Authenticated QA is still blocked (no Daniel password / no credentials created). Official docs note deployment changes can take a few seconds to reach every location; these checks hit IAD shortly after the deploy.

This report does not authorize seed, credential creation, hostname attach, production changes, or rollback. Parent may proceed with browser QA on the workers.dev URL.
