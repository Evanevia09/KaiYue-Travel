# 2026-11-10 — Temporary allowlisted admin login

**task_id:** `kai-yue-temporary-admin-login-20261110`  
**Statuses:** implementation `probe_complete` for unpublished-bundle reconstruction of admin-gate; local tests establish this increment’s checks only. Not `user_accepted`. Not `released`.

## Starting point

- Git `main` `608c4f53038cdbab02ff4fd74d1eb03057f79824` (older than the 5 Nov unpublished Worker).
- Staging branch `3fb823629c1412007af40f40b32a4183b739e08b` (behind main; not the missing 5 Nov source).
- Open GitHub PRs: none.
- Live production https://kaiyuemacau.com `/login` 403 JSON gate.
- Live staging https://kaiyue-travel-staging.kai-yue.workers.dev `/login` 403 JSON gate after 10 Nov settings-only upload.

## Recovered compiled evidence

| Artifact | sha256 |
| --- | --- |
| production `entry.js` | `0942309f987408ab474e77683438481f997567c97b4902a72845e25baa9c15d0` |
| staging `entry.js` | `437926967df82fa60a993b0d71fee0d12f38fe34decfbded9562ad1d6bfaf758` |
| shared admin-gate chunk | `bd6e3a86019c680cd011d8f3d1767d758af0049822505ee1d3f15cfabd595dcd` |

Compiled gate listed `PRODUCTION_HOSTS = ["kaiyue-travel.scalingsmb.workers.dev", "kaiyue-travel-staging.kai-yue.workers.dev"]` and `ACCESS_ADMIN_HOST = "admin.kaiyuemacau.com"`. `isPreviewRuntime` returned false for those hosts before reading `ENVIRONMENT=preview`. Source maps were not recoverable. Static assets were not dumped. Full script parity is not claimed.

## Design tradeoffs

- Reconstruct Access-host behaviour from the compiled Worker so a later Access cutover does not need another undocumented JS fork.
- Keep password admin off `admin.kaiyuemacau.com`.
- Require allowlist **and** future expiry for every non-local password login, including staging. Missing expiry is fail-closed, not open preview.
- Prepare production by the same code path: production `/login` stays 403 until `ADMIN_EMAILS` + future `TEMP_ADMIN_EXPIRES_AT` are set and Access is unset. Configuring Access turns password admin off.
- Do not use `ENVIRONMENT=preview`, `DEV_ADMIN_BYPASS`, public signup, or a broad hostname allowlist as a shortcut on production public hosts.

## Verification (this increment)

Recorded in `PROJECT-STATE.md` after local gates. Browser/staging deploy verification is a PM step after merge authorization.
