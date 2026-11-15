# 2026-11-15 — Super-admin user management (source only)

**task_id:** `super-admin-user-management-20261115`  
**Owner follow-up:** 2026-11-15 23:40 Asia/Macau (t199u–t201u); security correction after independent review of frozen `1e62ce9` / head `df35d278`  
**Branch / PR:** `cursor/host-role-admin-gate-a72c` / [#41](https://github.com/Evanevia09/KaiYue-Travel/pull/41)  
**Base:** `cursor/admin-profile-password-2cad` (not `main`)  
**Status:** implemented / tested / pushed on this PR. **Not** staged, **not** `user_accepted`, **not** `released`.

This increment does not merge, deploy, upload, apply D1, bootstrap, rollback, create real accounts, change DNS/mail/main, or touch production Worker `kaiyue-travel` version `71a66a99` / deployment `f3169afb`. Mika review path `/workspace/kaiyue-pr41-readonly/REVIEW.md` was not present on this VM; findings in the owner message were independently verified against frozen source and then fixed.

## What shipped in source

Exactly two persisted roles: `super_admin` and `staff`. Sidecar table `admin_operator` (`migrations/0009_admin_operator.sql`); Better Auth `"user"` is unchanged (no `user.role` column; `0009_admin_primary_role.sql` still does not exist). `migrations/0010_admin_operator_last_super.sql` installs BEFORE UPDATE/DELETE `RAISE(ABORT)` triggers so the last enabled super_admin cannot be removed even under concurrent count-then-update.

| Surface | Who |
|---|---|
| `/admin/users` UI + Users nav | super_admin only |
| `GET/POST /api/v1/admin/users` | super_admin |
| `PATCH /api/v1/admin/users/:id` | super_admin (role or enabled) |
| `POST /api/v1/admin/users/:id/password` | super_admin reset |
| Operational dashboard / bookings / inventory / contacts / offers / own profile password | staff and super_admin |

Create always inserts `staff`. Promotion is a PATCH. A third role is 403. Staff cannot read or mutate user-management endpoints and cannot escalate via `POST /api/v1/admin/profile/role`. Role, enable, and password-reset mutations write the operator row/account, audit event, and session delete in one D1 `batch` (fail-closed). Password `requireAdmin` checks that the Better Auth `"session"` row still exists after cookie-cache `getSession`, so a revoked cookie cannot authorize, inherit a later role, or revive on re-enable. Hashes/secrets are never returned. No invite email.

Until `admin_operator` has rows, login stays on the env allowlist (`ADMIN_EMAILS`) plus existing `ADMIN_PRIMARY_EMAIL` production-host rules. User-management APIs stay 403. An empty table is not implicit super-admin elevation. Account email is the authorization target, not a hardcoded global superadmin. Credentials already exist; owner password is not requested or changed. Staging-admin min-6 and production min-12, host isolation, and no Access prerequisite are unchanged.

## Independent review findings (verified, then fixed)

Frozen runtime `1e62ce9` / head `df35d278` independently matched the review input:

| ID | Finding | Fix |
|---|---|---|
| HIGH1 | `countEnabledSuperAdmins` then a separate UPDATE allowed concurrent demote/disable to remove every enabled super_admin | `0010` BEFORE UPDATE/DELETE `RAISE(ABORT)` plus local sqlite interleaved count-then-update vs trigger regression |
| HIGH2 | Normal `getSession` 60s cookie cache still authorized after D1 session delete; existing tests used `disableCookieCache: true` as the proof | `assertLivePasswordSession` after `getSession`; normal-cookie `requireAdmin` lifecycle tests (promote/demote/disable/re-enable/reset) without cache bypass as the security proof |
| MEDIUM | Role update → audit → session-delete (and reset) were sequential, so audit failure skipped revocation | One D1 `batch` for mutation + audit + session delete; MemoryD1 `batch` is BEGIN/COMMIT/ROLLBACK; injected audit-failure tests leave role, password, and sessions unchanged |
| Bootstrap | Two INSERT statements then CHECK; absence of BEGIN is not proof of REST partial commit | Local sequential-exec of the frozen two-INSERT script leaves staff after CHECK failure; gated one `INSERT…SELECT` inserts 0 rows on email mismatch. SELECT-only preflight. Non-destructive rollback (no DROP of sidecar/audit). No remote DML |

Destructive `DROP TABLE` rollback is not approved and is no longer the script. Last enabled super_admin remains protected during rollback.

## Staging-only bootstrap (not applied)

Target D1: official UAT `kaiyue-travel-staging` `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` (Worker `kaiyue-travel-staging`, account `33ecc75158a1cdd23ba1a62eb70c5103`, R2 `kaiyue-offers-staging`).

1. Preflight (read-only): `scripts/preflight-staging-operators.sql`. Confirm `"user".id = 'f0af3b28-7b2c-47d5-b619-9239a29c41f9'` still has `lower(email) = 'scalingsmb@gmail.com'`. Abort if not.
2. Apply `migrations/0009_admin_operator.sql`.
3. Apply `migrations/0010_admin_operator_last_super.sql`.
4. Apply `scripts/provision-staging-operators.sql`. One gated `INSERT…SELECT`; the CHECK guard fails unless that id+email is the only enabled super_admin. Other existing `"user"` rows become staff only when the owner row matches. No password writes, no mail.
5. Confirm `SELECT role, enabled FROM admin_operator JOIN "user" ...`.
6. Do **not** apply to production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, trial `06aa844b`, or obsolete `069aa442`.

Rollback of bootstrap rows on staging D1 only: `scripts/rollback-staging-operators.sql` (DELETE bootstrap staff, then bootstrap super_admin only if another enabled super_admin exists). Does not DROP tables or audit. Better Auth users/credentials remain.

Local synthetic evidence (not remote): sequential auto-commit of the frozen two-INSERT fixture left 1 staff and 0 supers after CHECK failure; the gated script left 0 operator rows after the same CHECK failure.

## Tests

Local synthetic `@example.invalid` fixtures only.

- Unauthenticated user APIs → 401
- Staff list/create/promote → 403; staff profile/dashboard still 200; persisted role `staff`
- Super-admin list/create staff; create with `role: super_admin` → 403; PATCH `admin` → 403
- Roles stored in `admin_operator`
- Last enabled super admin cannot be demoted or disabled
- Interleaved count-then-update without the trigger removes every super; with `0010` the second write aborts and one super remains
- Promote/disable/reset delete D1 sessions; `requireAdmin` with the **normal** cookie (cookie cache enabled, no `disableCookieCache` bypass) is 401
- Pre-promotion cookies cannot inherit the new role; re-enable cannot revive a deleted session cookie; reset cookies 401 until a new sign-in
- Injected `operator_audit_events` failure rolls back role change and password reset (sessions and hashes unchanged)
- Gated provision vs unsafe sequential fixture on local sqlite
- Unprovisioned allowlisted user `GET /api/v1/admin/users` → 403
- Prior host-role, min-6, profile-password, production-host, and invariant regressions

## Official-staging artifact

Local packaging only. Existing runtime source `577012c` / deployed version `19ebb0b4` @100% deployment `4464865f` is **not** replaced by this agent. Packaged overlay vars remain the prior authoritative set (`vars` JSON equal to the `577012c` / `1e62ce9` overlay); `keep_vars` false; HTML `run_worker_first` `["/*","!/_astro/*","!/images/*","!/favicon.ico"]`. No `--keep-vars`. No secrets or login passwords.

| Item | Value |
|---|---|
| Source SHA | `927bf1db9496e2ec2cd6358621f92cf0adb551a7` |
| Zip | `/opt/cursor/artifacts/kaiyue_host_role_927bf1d_official_staging.zip` |
| Zip SHA256 | `78c6942f20a129d9bcb2a4e4443fcab35e0c97ca18aa44263f03e5dc31c07e80` (10015931 bytes) |
| entry.js SHA256 | `ab2ecb19481181fcd97f157ac47c2512c4e04567c2121a0a112ea98bce410e8f` |
| wrangler.jsonc SHA256 | `750e901b27b3372042a3477a804f8291b354d1516c4f00c2ae81b30710b585a5` |
| Overlay | `/opt/cursor/artifacts/kaiyue_host_role_927bf1d_official_staging.wrangler.jsonc` |
| Ledger dir | `/opt/cursor/artifacts/kaiyue_host_role_927bf1d_official_staging/` |
| `0009_admin_operator.sql` | `e90ac3cc28ff3efa39286c2b6b9c421d658e2d931b2f8b80e50e17c8916856aa` |
| `0010_admin_operator_last_super.sql` | `8eb9f0a6bd18812232605154bbb64f9ca48db6a629b0e8d728dd941b8d5c3502` |
| `preflight-staging-operators.sql` | `3d326647e3466c31262820037a1585fb1da07a6a3023b286efbfb3ba761566de` |
| `provision-staging-operators.sql` | `46a3c5c01b5f66584e2c4ff68723cca9b323c06099160b27d2e2455014cd3338` |
| `rollback-staging-operators.sql` | `715e3a72b1f930dd9a47cb5d525eb4affae5118cef1f31a7972495b6d552ac77` |

Superseded package of `1e62ce9` (`8dac78db…`) must not be uploaded.

Later operator upload (not this agent), from the unzipped folder:

`npx wrangler versions upload --no-bundle --strict --name kaiyue-travel-staging`

Then apply `0009`, `0010`, and `scripts/provision-staging-operators.sql` on D1 `043cd0ff` only after the email+id preflight. Do not `wrangler deploy`. Do not touch LIVE `71a66a99` / `f3169afb`.

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
- Independent re-review of this correction is still required before any deployment approval.

## Artifact checksums (package of `927bf1d`)

See the table in **Official-staging artifact**. Zip SHA256 `78c6942f20a129d9bcb2a4e4443fcab35e0c97ca18aa44263f03e5dc31c07e80`. This packaging step did not upload.
