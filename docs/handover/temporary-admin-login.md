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
2. Hash without exposing a listener when `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are already in the PM process environment (vault cannot shell-export; a masked Cursor secret request may populate the env). Standalone zip: `ADMIN_SEED_EMAIL=… ADMIN_SEED_PASSWORD=… node provision-admin.mjs > seed-admin.sql`. With a checkout, the same env on `node scripts/provision-admin-local.mjs` or `node scripts/seed-preview-test-admin.mjs`. **Do not tunnel, proxy, or change the browser to reach 127.0.0.1.** Default `node provision-admin.mjs` with those env vars unset still binds 127.0.0.1 only. Hasher is Better Auth 1.7.5 scrypt. Nothing logs the password. **This rebuilds the standalone zip** so env hashing works without HTTP; previous zip bytes are superseded. `.prettierignore` still skips the generated dump.
3. Fill email + password from the vault browser extension. Submit. The page hashes locally and downloads SQL. The process does not log the password.
4. Confirm the SQL file has no raw password (hash only) and uses `WHERE NOT EXISTS` on email (safe to re-apply).
5. Apply that SQL to the **intended** D1 only:
   - Staging: `kaiyue-travel-staging` (`043cd0ff-a1e6-4b5e-98c1-968c286e0c70`)
   - Production: do not apply unless a later authorized production promotion says so (`06cf879d-8fea-4088-8881-7d382e1b8c11`)
6. Delete the downloaded SQL. Stop the local listener.

`scripts/seed-preview-test-admin.mjs` still exists for operators who already hold a password in a process they control. It is **not** a vault export path. It no longer requires `BETTER_AUTH_SECRET`.

After Access is live: let `TEMP_ADMIN_EXPIRES_AT` pass or delete that var, delete the Better Auth user/account rows, and keep Access JWT verification.

Staging Worker already has `ADMIN_EMAILS` and `TEMP_ADMIN_EXPIRES_AT=2026-11-24T15:59:59+08:00`. Do not rotate those in this increment. Production password **capability is approved** (user t73/t74) but stays fail-closed until PM deliberately sets production `ADMIN_EMAILS` + future `TEMP_ADMIN_EXPIRES_AT` after staging verification. Do not treat that as missing authorization of the feature.

## Staging packages

- Additive 14-file jwt + `keep_assets` remains **unsafe**. Do not send it.
- **PROPOSED (not approved):** complete-ledger staging trial. Zip `artifacts/kaiyue-staging-complete-5dab462.zip` (sha256 `d10a3d7f117fcae626eeffa9b928781b082e1a7afae61c08bab54d29549ce923`). Built at **runtimeSourceSHA** `5dab46281ce84b5b5974a28bdb9f94513c670644`. `entry.js` sha256 `4e21131158d4a69516eccf60ee05bbf65a274ec2fbfc11c1a91ef631932e4654`. 136-file complete manifest. HTML is the new staged version. Same Worker/D1; rollback = previous version + assets. Mika assessing. No executor writes. See `docs/records/2026-11-10-staging-complete-ledger-proposal.md`.
- Connector must use the **assets-upload-session JWT** (not the account token) on `POST /workers/assets/upload`. If it cannot switch `Authorization`, that is a capability gap — do not paste credentials.

GitHub Actions [`42864265892`](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/42864265892) succeeded on `5dab462`. Provisioner zip unchanged; env-only, do not start the server. Do not retry production Workers Builds.

## Authorized staging upload (PM only, after Mika)

Independent review is OK for a staging-only trial. Complete-ledger PUT is **proposed**, not approved. Wrangler fallback after approval:

```text
PUBLIC_SITE_URL=https://kaiyue-travel-staging.kai-yue.workers.dev pnpm --filter @kaiyue/web build
node scripts/require-wrangler-env.mjs --env staging
npx wrangler versions upload --env staging --name kaiyue-travel-staging
```

Production temporary-login **capability is already approved** (t73/t74). Configure production vars only after staging persists. Do not retry the GitHub check `Workers Builds: kaiyue-travel` (that path is `/workers/services/view/kaiyue-travel/production/builds/…`). Never `wrangler deploy` from an agent.
