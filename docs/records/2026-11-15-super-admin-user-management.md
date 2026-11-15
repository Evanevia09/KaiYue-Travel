# 2026-11-15 — Super-admin user management (source only)

**task_id:** `super-admin-user-management-20261115`  
**Owner follow-up:** 2026-11-15 23:40 Asia/Macau (t199u–t201u)  
**Branch / PR:** `cursor/host-role-admin-gate-a72c` / [#41](https://github.com/Evanevia09/KaiYue-Travel/pull/41)  
**Base:** `cursor/admin-profile-password-2cad` (not `main`)  
**Status:** implemented / tested / pushed on this PR. **Not** staged, **not** `user_accepted`, **not** `released`.

This increment does not merge, deploy, upload, apply D1, create real accounts, change DNS/mail/main, or touch production Worker `kaiyue-travel` version `71a66a99` / deployment `f3169afb`.

## What shipped in source

Exactly two persisted roles: `super_admin` and `staff`. Sidecar table `admin_operator` (`migrations/0009_admin_operator.sql`); Better Auth `"user"` is unchanged (no `user.role` column; `0009_admin_primary_role.sql` still does not exist).

| Surface | Who |
|---|---|
| `/admin/users` UI + Users nav | super_admin only |
| `GET/POST /api/v1/admin/users` | super_admin |
| `PATCH /api/v1/admin/users/:id` | super_admin (role or enabled) |
| `POST /api/v1/admin/users/:id/password` | super_admin reset |
| Operational dashboard / bookings / inventory / contacts / offers / own profile password | staff and super_admin |

Create always inserts `staff`. Promotion is a PATCH. A third role is 403. Staff cannot read or mutate user-management endpoints and cannot escalate via `POST /api/v1/admin/profile/role`. The last enabled super admin cannot be demoted or disabled. Disable, reset, and privilege change delete that user's D1 `session` rows. Hashes/secrets are never returned. No invite email.

Until `admin_operator` has rows, login stays on the env allowlist (`ADMIN_EMAILS`) plus existing `ADMIN_PRIMARY_EMAIL` production-host rules. User-management APIs stay 403. An empty table is not implicit super-admin elevation. Account email is the authorization target, not a hardcoded global superadmin. Credentials already exist; owner password is not requested or changed. Staging-admin min-6 and production min-12, host-role isolation, and no Access prerequisite are unchanged.

## Staging-only bootstrap (not applied)

Target D1: official UAT `kaiyue-travel-staging` `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` (Worker `kaiyue-travel-staging`, account `33ecc75158a1cdd23ba1a62eb70c5103`, R2 `kaiyue-offers-staging`).

1. Preflight (read-only): confirm `"user".id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'` still has `lower(email) = 'scalingsmb@gmail.com'`. Abort if not.
2. Apply `migrations/0009_admin_operator.sql`.
3. Apply `scripts/provision-staging-operators.sql`. The CHECK guard fails unless that id+email is the only enabled super_admin. Other existing `"user"` rows become staff. No password writes, no mail.
4. Confirm `SELECT role, enabled FROM admin_operator JOIN "user" ...`.
5. Do **not** apply to production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, trial `06aa844b`, or obsolete `069aa442`.

Rollback of this increment on staging D1 only: `scripts/rollback-staging-operators.sql` (drops sidecar tables; Better Auth users/credentials remain).

## Tests

Local synthetic `@example.invalid` fixtures only.

- Unauthenticated user APIs → 401
- Staff list/create/promote → 403; staff profile/dashboard still 200; persisted role `staff`
- Super-admin list/create staff; create with `role: super_admin` → 403; PATCH `admin` → 403
- Roles stored in `admin_operator`
- Last enabled super admin cannot be demoted or disabled
- Promote/disable/reset delete D1 sessions (`disableCookieCache` getSession is null)
- Disabled operator cannot `requireAdmin` even with a leftover cookie
- Reset rejects the old password and does not return hashes
- Unprovisioned allowlisted user `GET /api/v1/admin/users` → 403
- Prior host-role, min-6, profile-password, production-host, and invariant regressions

## Official-staging artifact

Local packaging only. Existing runtime source `577012c` / deployed version `19ebb0b4` @100% deployment `4464865f` is **not** replaced by this agent. Packaged overlay vars remain the prior authoritative set (`wrangler.jsonc` SHA256 matches the `577012c` overlay); `keep_vars` false; HTML `run_worker_first` `["/*","!/_astro/*","!/images/*","!/favicon.ico"]`. No `--keep-vars`. No secrets or login passwords.

| Item | Value |
|---|---|
| Source SHA | `1e62ce9f1e1b301ddda523dfa2ed4809cd71e2e3` |
| Zip | `/opt/cursor/artifacts/kaiyue_host_role_1e62ce9_official_staging.zip` |
| Zip SHA256 | `8dac78db2198a325a0300dcd4f892a1d9685800f95285da40bab2e7e8583d119` (10013272 bytes) |
| entry.js SHA256 | `973ba7cd3cd7c270c883398edf5b43e50d531fad177558472a7be2e9603de94c` |
| wrangler.jsonc SHA256 | `0e481753648f1b03f5b111b1d1c60f70cf2391b235232bc17c1e9d6b54722c2f` |
| Overlay | `/opt/cursor/artifacts/kaiyue_host_role_1e62ce9_official_staging.wrangler.jsonc` |
| Ledger dir | `/opt/cursor/artifacts/kaiyue_host_role_1e62ce9_official_staging/` |
| `0009_admin_operator.sql` | `e90ac3cc28ff3efa39286c2b6b9c421d658e2d931b2f8b80e50e17c8916856aa` |
| `provision-staging-operators.sql` | `fc2e3d20251e41d560d6d332b3cf56ae743d14ccbce246cbdd7a07be76cbc364` |
| `rollback-staging-operators.sql` | `2254e2ba1faef7ade6f7c7df44016b14cedce2879c4a2262d517d3be6949f12c` |

Later operator upload (not this agent), from the unzipped folder:

`npx wrangler versions upload --no-bundle --strict --name kaiyue-travel-staging`

Then apply `migrations/0009_admin_operator.sql` and `scripts/provision-staging-operators.sql` on D1 `043cd0ff` only after the email+id preflight. Do not `wrangler deploy`. Do not touch LIVE `71a66a99` / `f3169afb`.

## Distinctions

| Claim | This increment |
|---|---|
| implemented / tested / pushed | yes, PR #41 |
| staged (Worker uploaded / D1 applied) | no |
| `user_accepted` | no |
| `released` | no |
| production changed | no; LIVE must stay `71a66a99` / `f3169afb` |

## Blockers / open

- Root admin still served cached marketing despite uploaded `run_worker_first`; cache-purge permission pending PM verification. Do not assume admin-host `/` is live-fixed.
- CI/CD Workers Builds for production remain separate / pending staging credential. Do not enable production builds.
- This agent does not upload or apply SQL.

## Artifact checksums (package of `1e62ce9`)

See the table in **Official-staging artifact**. Zip SHA256 `8dac78db2198a325a0300dcd4f892a1d9685800f95285da40bab2e7e8583d119`. This packaging step did not upload.
