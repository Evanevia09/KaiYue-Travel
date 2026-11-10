# Temporary allowlisted admin password login

**Task:** `kai-yue-temporary-admin-login-20261110`  
**Status:** implementation on a task branch; not merged, not deployed, not `user_accepted`, not `released`.  
**Hosts:** production https://kaiyuemacau.com ; staging https://kaiyue-travel-staging.kai-yue.workers.dev

## What changed

- Reconstructed unpublished 5 Nov 2026 admin-gate behaviour from compiled Worker evidence: `ACCESS_ADMIN_HOST=admin.kaiyuemacau.com`, password routes split from `/admin` APIs, Access logout on that host, no `/login` redirect there.
- Removed `kaiyue-travel-staging.kai-yue.workers.dev` from production hosts. That listing was why staging `/login` returned 403 JSON (`Admin access is not configured.`, `requestId: gate`) even with `ENVIRONMENT=preview`, allowlist, and `BETTER_AUTH_SECRET`.
- Temporary password login is explicit: non-local requires `ADMIN_EMAILS` and a future `TEMP_ADMIN_EXPIRES_AT`. Signup and `DEV_ADMIN_BYPASS` stay local-only. Production public hosts stay fail-closed until those vars are set and Access is unset. Configuring Access disables password admin.

## Parity limits

- Source maps were not recoverable. Static Worker assets were not dumped.
- Admin-auth/gate, Access host, and site URL/bindings were reconciled from compiled `entry.js` plus live bindings. Full Worker-bundle parity with the 5 Nov script is **not** claimed.
- Recovered hashes (do not treat as a deploy artifact in git): production `entry.js` sha256 `0942309f987408ab474e77683438481f997567c97b4902a72845e25baa9c15d0`; staging `entry.js` sha256 `437926967df82fa60a993b0d71fee0d12f38fe34decfbded9562ad1d6bfaf758`. Admin-gate chunk sha256 `bd6e3a86019c680cd011d8f3d1767d758af0049822505ee1d3f15cfabd595dcd`.

## Do not

- Merge or deploy from an agent. Do not `wrangler deploy`.
- Mutate live staging `ADMIN_EMAILS` or `TEMP_ADMIN_EXPIRES_AT`.
- Bind D1 `069aa442-30c9-4454-ab3a-26eb372b3a1f`.
- Enable public development, public signup, or `DEV_ADMIN_BYPASS` on staging/production.
- Print or commit a password or `BETTER_AUTH_SECRET`.
- Contact the client or treat CI green as code review or production acceptance.

## Provisioning (PM / vault)

Credential generation stays in the vault. The Worker secret name `BETTER_AUTH_SECRET` already exists on staging and must not be logged.

1. Generate a password (≥16) in the vault. Keep `BETTER_AUTH_SECRET` in the vault. Do not paste either into chat, git, CI logs, or screenshots.
2. From a trusted shell, export only from the vault into the environment (no `echo`, no `set -x`):
   - `ADMIN_SEED_EMAIL` — allowlisted operator
   - `ADMIN_SEED_PASSWORD`
   - `BETTER_AUTH_SECRET` — the same value already on the target Worker
   - optional `ADMIN_SEED_NAME`
3. Run `node scripts/seed-preview-test-admin.mjs > /tmp/seed-admin.sql`. The script writes SQL only. Confirm the SQL file does not contain the raw password.
4. Apply that SQL to the **intended** D1 only:
   - Staging: `kaiyue-travel-staging` (`043cd0ff-a1e6-4b5e-98c1-968c286e0c70`)
   - Production: do not apply unless a later authorized production promotion says so (`06cf879d-8fea-4088-8881-7d382e1b8c11`)
5. Wipe the env vars and the SQL file when done. Do not commit them.
6. After Access is live: let `TEMP_ADMIN_EXPIRES_AT` pass or delete that var, delete the Better Auth user/account rows, and keep Access JWT verification.

Staging Worker already has `ADMIN_EMAILS` and `TEMP_ADMIN_EXPIRES_AT=2026-11-24T15:59:59+08:00`. Do not rotate those in this increment. Production currently has neither, so `/login` stays 403 until a separately authorized production change.

## Authorized staging upload (PM only)

After review and tests on this branch:

```text
pnpm build
npx wrangler versions upload --env staging --name kaiyue-travel-staging
```

Use `CLOUDFLARE_ENV=staging` if the dashboard build cannot pass `--env`. Never upload the top-level production config onto the staging Worker. Never `wrangler deploy` from an agent. Promote to production only after staging sign-in is verified and Access remains the planned long-term gate.
