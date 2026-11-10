# Temporary allowlisted admin password login

**Task:** `kai-yue-temporary-admin-login-20261110`  
**Status:** implementation on a task branch; not merged, not deployed, not `user_accepted`, not `released`.  
**Hosts:** production https://kaiyuemacau.com ; staging https://kaiyue-travel-staging.kai-yue.workers.dev  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/26 into `staging`

## What changed

- Reconstructed unpublished 5 Nov 2026 admin-gate behaviour from compiled Worker evidence: `ACCESS_ADMIN_HOST=admin.kaiyuemacau.com`, password routes split from `/admin` APIs, Access logout on that host, no `/login` redirect there.
- Removed `kaiyue-travel-staging.kai-yue.workers.dev` from production hosts. That listing was why staging `/login` returned 403 JSON (`Admin access is not configured.`, `requestId: gate`) even with `ENVIRONMENT=preview`, allowlist, and `BETTER_AUTH_SECRET`.
- Temporary password login is explicit: non-local requires `ADMIN_EMAILS` and a future `TEMP_ADMIN_EXPIRES_AT`. Signup and `DEV_ADMIN_BYPASS` stay **loopback** local-only (`localhost` / `127.0.0.1` + `ENVIRONMENT=development`). `ENVIRONMENT=development` + setup token on a public/staging/Access/unknown host still 404s signup.
- Access vars (`ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`) disable password admin on every non-local surface, including staging/preview. `/admin` then requires Access JWT; `/login` and `/api/auth` stay 403.
- Production public hosts stay fail-closed until allowlist + future expiry are set **and** Access is unset.
- Root `wrangler.jsonc` top-level is **not** a live target (`kaiyue-travel-env-required`). Live Workers are `env.staging` and `env.production`. `previews` uses placeholder D1/R2 and does not bind staging.

## Parity limits

See `docs/records/2026-11-10-temporary-admin-login.md` and `artifacts/parity-nov5/manifest.json`. Public `/_astro` islands used on live routes (home, services, contact/about/B2B, nested booking/contact graph) **byte-match** this branch’s dist, including hashed names. Server `entry.js` is not byte-identical; remaining differences are the intentional admin-gate/auth/login set plus bundler chunk splits. Full Worker equality is not claimed. Staging this branch for browser QA should not replace unpublished public islands.

## Do not

- Merge or deploy from an agent. Do not `wrangler deploy`.
- Mutate live staging `ADMIN_EMAILS` or `TEMP_ADMIN_EXPIRES_AT`.
- Bind D1 `069aa442-30c9-4454-ab3a-26eb372b3a1f`.
- Enable public development, public signup, or `DEV_ADMIN_BYPASS` on staging/production.
- Print or commit a password or `BETTER_AUTH_SECRET`. Do not invent a dummy signing secret for hashing.
- Retry Cloudflare Workers Builds for production Worker `kaiyue-travel` from this PR.
- Contact the client or treat CI green as code review or production acceptance.

## Provisioning (PM / vault)

Vault can generate a password and fill a browser password field. It cannot shell-export that password. `hashPassword` is scrypt and **does not read `BETTER_AUTH_SECRET`**. Do not export the Worker signing secret to hash. Staging already has `BETTER_AUTH_SECRET` as a Worker secret for cookies.

Viable path (no public signup, no development mode on a public host):

1. Generate a password (≥16) in the vault. Do not paste it into chat, git, CI logs, or screenshots.
2. On a trusted machine **without a repo checkout**, copy `artifacts/kaiyue-provision-admin-local.zip` (also `/opt/cursor/artifacts/kaiyue-provision-admin-local.zip`). `unzip` and `node provision-admin.mjs`. With a checkout, `node scripts/provision-admin-local.mjs` is the same server. Open `http://127.0.0.1:8789/`. The listener binds `127.0.0.1` only (Host/Origin allowlist, CSRF cookie, CSP/`X-Frame-Options`, 8 KiB body cap). Hasher is bundled Better Auth 1.7.5 `password.node.mjs` scrypt (N=16384 r=16 p=1 dkLen=64) — the same export the Worker uses. No secrets and no generated passwords in the zip. **PM already started this independently reviewed server; do not rebuild or reformat that zip.** `.prettierignore` skips the generated dump so CI cannot rewrite it.
3. Fill email + password from the vault browser extension. Submit. The page hashes locally and downloads SQL. The process does not log the password.
4. Confirm the SQL file has no raw password (hash only) and uses `WHERE NOT EXISTS` on email (safe to re-apply).
5. Apply that SQL to the **intended** D1 only:
   - Staging: `kaiyue-travel-staging` (`043cd0ff-a1e6-4b5e-98c1-968c286e0c70`)
   - Production: do not apply unless a later authorized production promotion says so (`06cf879d-8fea-4088-8881-7d382e1b8c11`)
6. Delete the downloaded SQL. Stop the local listener.

`scripts/seed-preview-test-admin.mjs` still exists for operators who already hold a password in a process they control. It is **not** a vault export path. It no longer requires `BETTER_AUTH_SECRET`.

After Access is live: let `TEMP_ADMIN_EXPIRES_AT` pass or delete that var, delete the Better Auth user/account rows, and keep Access JWT verification.

Staging Worker already has `ADMIN_EMAILS` and `TEMP_ADMIN_EXPIRES_AT=2026-11-24T15:59:59+08:00`. Do not rotate those in this increment. Production password **capability is approved** (user t73/t74) but stays fail-closed until PM deliberately sets production `ADMIN_EMAILS` + future `TEMP_ADMIN_EXPIRES_AT` after staging verification. Do not treat that as missing authorization of the feature.

## Staging Worker package (box copy)

`artifacts/kaiyue-staging-worker-68f751b.zip` (also `/opt/cursor/artifacts/kaiyue-staging-worker-68f751b.zip`). Built at `68f751be9e79171198020e7a157f295bff5db1ee` with wrangler `--dry-run --env staging` (no network).

- **main_module exact name:** `entry.js`
- MIME: `application/javascript+module`
- `entry.js` sha256: `28cb9f0a561d79732c4922ddd50489a19134c501b1b0134e52ad75585195cca7` (4185645 bytes)
- Report inside the zip: `FINAL-REPORT.md`

`keep_assets:true` **does not install new hashed files**. 17 public `/_astro` islands byte-match live and can be kept. **14 files 404 on live staging and production** and must be uploaded first, including:

- `/_astro/LoginForm.DI7HqLqN.js` (login island)
- `/_astro/AdminLocaleSwitch.AW9mvxVt.js`
- `/_astro/admin-i18n.BqNzmZPb.js`
- `/_astro/api._aekQyCR.js` (admin fetch helper; 404 on live today)
- remaining admin panels / `SignOutButton` / `SetupForm` listed in `new-assets-required/NEW_ASSETS.json`

Login graph reuse of live files: `auth-client.B2D_TZZE.js`, `react.Bi21MRdE.js`, `jsx-runtime.myd_k2E3.js` already MATCH. Do not upload rebuilt HTML.

Safe sequence for the sanctioned connector (not this agent): assets-upload-session for those 14 → `workers/assets/upload?base64=true` → PUT script with `keep_assets:true` **and** `assets.jwt`, `keep_bindings:["secret_text"]`. PUT deploys immediately. Do not `wrangler deploy` / `versions upload` from an agent. Do not retry production Workers Builds.

## Authorized staging upload (PM only)

Independent review is OK for a staging-only trial of `68f751b`. After GitHub Actions is green on the latest head and staging browser QA. Prefer the connector PUT above so public assets stay. Wrangler remains an operator fallback with an explicit env:

```text
pnpm build
node scripts/require-wrangler-env.mjs --env staging
npx wrangler versions upload --env staging --name kaiyue-travel-staging
```

Production temporary-login **capability is already approved** (t73/t74). Configure production vars only after staging persists. Do not retry the GitHub check `Workers Builds: kaiyue-travel` (that path is `/workers/services/view/kaiyue-travel/production/builds/…`). Never `wrangler deploy` from an agent.
