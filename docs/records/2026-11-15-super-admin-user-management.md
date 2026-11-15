# 2026-11-15 — Super-admin user management (source only)

**task_id:** `super-admin-user-management-20261115`  
**Owner follow-up:** 2026-11-15 23:40 Asia/Macau (t199u–t201u); security correction after independent review of frozen `1e62ce9` / head `df35d278`; narrow PATCH/bootstrap follow-up after independent re-review of frozen `927bf1db` / head `4466c586`  
**Branch / PR:** `cursor/host-role-admin-gate-a72c` / [#41](https://github.com/Evanevia09/KaiYue-Travel/pull/41)  
**Base:** `cursor/admin-profile-password-2cad` (not `main`)  
**Status:** implemented / tested / pushed on this PR. **Not** staged, **not** `user_accepted`, **not** `released`.

This increment does not merge, deploy, upload, apply D1, bootstrap, rollback, create real accounts, change DNS/mail/main, or touch production Worker `kaiyue-travel` version `71a66a99` / deployment `f3169afb`. Mika verified the previous report and CI 192 green; that is not approval. Independent re-review of this narrow fix is still required. Mika review path `/workspace/kaiyue-pr41-readonly/REVIEW.md` was not present on this VM; findings in the owner message were independently verified against frozen source and then fixed.

## What shipped in source

Exactly two persisted roles: `super_admin` and `staff`. Sidecar table `admin_operator` (`migrations/0009_admin_operator.sql`); Better Auth `"user"` is unchanged (no `user.role` column; `0009_admin_primary_role.sql` still does not exist). `migrations/0010_admin_operator_last_super.sql` installs BEFORE UPDATE/DELETE `RAISE(ABORT)` triggers so the last enabled super_admin cannot be removed even under concurrent count-then-update.

| Surface | Who |
|---|---|
| `/admin/users` UI + Users nav | super_admin only |
| `GET/POST /api/v1/admin/users` | super_admin |
| `PATCH /api/v1/admin/users/:id` | super_admin (role and/or enabled; field-specific CAS) |
| `POST /api/v1/admin/users/:id/password` | super_admin reset |
| Operational dashboard / bookings / inventory / contacts / offers / own profile password | staff and super_admin |

Create always inserts `staff`. Promotion is a PATCH. A third role is 403. Staff cannot read or mutate user-management endpoints and cannot escalate via `POST /api/v1/admin/profile/role`. Role, enable, and password-reset mutations write the operator row/account, audit event, and session delete in one D1 `batch` (fail-closed). Partial PATCH writes only requested columns and compare-and-set on observed `role`/`enabled`/`updated_at`; a 0-row CAS is 409 with no audit and no session revoke. Password `requireAdmin` checks that the Better Auth `"session"` row still exists after cookie-cache `getSession`, so a revoked cookie cannot authorize, inherit a later role, or revive on re-enable. Hashes/secrets are never returned. No invite email.

Until `admin_operator` has rows, login stays on the env allowlist (`ADMIN_EMAILS`) plus existing `ADMIN_PRIMARY_EMAIL` production-host rules. User-management APIs stay 403. An empty table is not implicit super-admin elevation. Account email is the authorization target, not a hardcoded global superadmin. Credentials already exist; owner password is not requested or changed. Staging-admin min-6 and production min-12, host isolation, and no Access prerequisite are unchanged.

## Independent review findings (verified, then fixed)

Frozen runtime `1e62ce9` / head `df35d278` independently matched the first review input. Frozen runtime `927bf1db` / head `4466c586` independently matched the follow-up: original HIGHs are statically resolved; remaining MEDIUM and bootstrap skip-regardless were present.

| ID | Finding | Fix |
|---|---|---|
| HIGH1 | `countEnabledSuperAdmins` then a separate UPDATE allowed concurrent demote/disable to remove every enabled super_admin | `0010` BEFORE UPDATE/DELETE `RAISE(ABORT)` plus local sqlite interleaved count-then-update vs trigger regression |
| HIGH2 | Normal `getSession` 60s cookie cache still authorized after D1 session delete; existing tests used `disableCookieCache: true` as the proof | `assertLivePasswordSession` after `getSession`; normal-cookie `requireAdmin` lifecycle tests (promote/demote/disable/re-enable/reset) without cache bypass as the security proof |
| MEDIUM (sequential) | Role update → audit → session-delete (and reset) were sequential, so audit failure skipped revocation | One D1 `batch` for mutation + audit + session delete; MemoryD1 `batch` is BEGIN/COMMIT/ROLLBACK; injected audit-failure tests leave role, password, and sessions unchanged |
| MEDIUM (partial PATCH) | `handlePatchOperator` read old role/enabled then `SET` both; concurrent disable could be undone by a stale promotion writing `enabled=1`; enabled-only PATCH could restore a concurrently demoted role | Field-specific `SET` plus CAS on observed `role`/`enabled`/`updated_at`; audit INSERT and session DELETE gated with `EXISTS (updated_at = :now)`; 0-row CAS → 409 CONFLICT, no audit, no revoke |
| Bootstrap | Two INSERT statements then CHECK; then `927bf1d` skip-existing-id regardless of owner role/enabled, so wrong owner prestate could INSERT staff before CHECK depending on request boundaries. Review did **not** prove fresh-empty bootstrap failure | Leading empty-or-owner-only-enabled-matching-super CHECK; data `INSERT` itself gated to 0 rows unless that prestate holds; SELECT-only preflight now includes `operator_count`, owner role/enabled, `enabled_super_count`, `supported_prestate`. Fresh empty is the intended first apply and locally succeeds |

Destructive `DROP TABLE` rollback is not approved and is no longer the script. Last enabled super_admin remains protected during rollback.

## Staging-only bootstrap (not applied)

Target D1: official UAT `kaiyue-travel-staging` `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` (Worker `kaiyue-travel-staging`, account `33ecc75158a1cdd23ba1a62eb70c5103`, R2 `kaiyue-offers-staging`).

**Executor / grouping recommendation (local sequential-exec evidence only; do not apply remotely from this increment):**

1. Run SELECT-only `scripts/preflight-staging-operators.sql`. Abort unless `user_id` still maps to `scalingsmb@gmail.com` **and** `supported_prestate = 1` (empty `admin_operator`, or that owner is already the only enabled matching `super_admin`).
2. Apply `migrations/0009_admin_operator.sql`.
3. Apply `migrations/0010_admin_operator_last_super.sql`.
4. Apply the **entire** `scripts/provision-staging-operators.sql` as one `wrangler d1 execute --file` (or one REST `sql` body) so the leading prestate CHECK is not skipped. Do not claim a trailing CHECK rolls back a prior committed INSERT; the data INSERT is gated to 0 rows under unsupported prestate. Interrupted / binding batch / wrangler execute remain UNPROVEN remotely.
5. Confirm `SELECT role, enabled FROM admin_operator JOIN "user" ...`.
6. Do **not** apply to production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, trial `06aa844b`, or obsolete `069aa442`.

Rollback of bootstrap rows on staging D1 only: `scripts/rollback-staging-operators.sql` (DELETE bootstrap staff, then bootstrap super_admin only if another enabled super_admin exists). Does not DROP tables or audit. Better Auth users/credentials remain.

Local synthetic evidence (not remote):

| Prestate | Gated provision (this increment) | Historical 927bf1d skip-regardless fixture |
|---|---|---|
| Fresh empty | succeeds; owner only enabled super + other users staff | n/a (review did **not** prove fresh-empty failure) |
| Replay of complete valid state | 0 new writes; trailing CHECK passes | n/a |
| Wrong existing owner role (`staff`) | leading CHECK fails; 0 new writes | INSERT staff for other users, then CHECK fails (2 staff) |
| Disabled owner super | leading CHECK fails; existing disabled row unchanged | n/a |
| Extra enabled super | leading CHECK fails; both supers remain | n/a |
| Interrupted (staff present, owner missing) | leading CHECK fails; 0 new writes | n/a |
| Wrong owner email + empty table | INSERT 0 rows; trailing CHECK fails | n/a |
| Legacy two-INSERT fixture + wrong email | n/a | 1 staff, 0 supers after CHECK |

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
- Naive SET-both undoes concurrent disable / restores demoted role; field-specific CAS does not; handler role-only does not flip enabled; enabled-only does not restore role; stale CAS → 409 without audit or revoke
- Gated provision vs unsafe sequential fixture and vs 927bf1d owner-skip-regardless fixture on local sqlite
- Fresh empty success, replay, wrong owner role, disabled owner, extra-super, interrupted prestate (0 new writes)
- Unprovisioned allowlisted user `GET /api/v1/admin/users` → 403
- Prior host-role, min-6, profile-password, production-host, and invariant regressions

## Official-staging artifact

Local packaging only. Existing runtime source `577012c` / deployed version `19ebb0b4` @100% deployment `4464865f` is **not** replaced by this agent. Packaged overlay vars remain the prior authoritative set (`vars` JSON equal to the `577012c` / `1e62ce9` / `927bf1d` overlay); `keep_vars` false; HTML `run_worker_first` `["/*","!/_astro/*","!/images/*","!/favicon.ico"]`. No `--keep-vars`. No secrets or login passwords. Package of `927bf1d` (`78c6942f…`) is superseded and must not be uploaded.

| Item | Value |
|---|---|
| Source SHA | `94ee1ff448cd6246550508a6e36f1c20fa20c8c1` |
| Zip | `/opt/cursor/artifacts/kaiyue_host_role_94ee1ff_official_staging.zip` |
| Zip SHA256 | `3ef4665a6decf6e5d3577974f6ad8647d27d2a6d5f74829373bc9418f8715f06` (9996674 bytes) |
| entry.js SHA256 | `70a849d75faf017e42ddba9b4d60ec44814d8c21ad70d37c6e8b1263ce938290` |
| wrangler.jsonc SHA256 | `a65d67c22e8276db9ad8847ce3064c1cb08206e1d80e740d6a3493f27bb1557f` |
| Overlay | `/opt/cursor/artifacts/kaiyue_host_role_94ee1ff_official_staging.wrangler.jsonc` |
| Ledger dir | `/opt/cursor/artifacts/kaiyue_host_role_94ee1ff_official_staging/` |
| `0009_admin_operator.sql` | `e90ac3cc28ff3efa39286c2b6b9c421d658e2d931b2f8b80e50e17c8916856aa` |
| `0010_admin_operator_last_super.sql` | `8eb9f0a6bd18812232605154bbb64f9ca48db6a629b0e8d728dd941b8d5c3502` |
| `preflight-staging-operators.sql` | `608d84b523deb891f08a9ace5ad2f2fa08d177be837abbdeedd9de6f5fa42698` |
| `provision-staging-operators.sql` | `703baa52d477fe586595bd118130678e54b62eab423c9baa3429b57f28134009` |
| `rollback-staging-operators.sql` | `715e3a72b1f930dd9a47cb5d525eb4affae5118cef1f31a7972495b6d552ac77` |

Later operator upload (not this agent), from the unzipped folder:

`npx wrangler versions upload --no-bundle --strict --name kaiyue-travel-staging`

Then apply `0009`, `0010`, SELECT-only preflight (abort unless identity matches and `supported_prestate=1`), then the entire `scripts/provision-staging-operators.sql` on D1 `043cd0ff` only. Do not `wrangler deploy`. Do not touch LIVE `71a66a99` / `f3169afb`.

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
- This agent does not upload or apply SQL. HOLD all upload/deploy/D1/bootstrap/rollback.
- Independent re-review of this narrow fix is still required before any deployment approval. Mika verified the previous report and CI 192 green; that is not approval.

## Artifact checksums

See the table in **Official-staging artifact**. Zip SHA256 `3ef4665a6decf6e5d3577974f6ad8647d27d2a6d5f74829373bc9418f8715f06`. This packaging step did not upload. Package of `927bf1d` (`78c6942f…`) is superseded.
