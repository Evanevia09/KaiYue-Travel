# 2026-11-15 — Super-admin user management (source only)

**task_id:** `super-admin-user-management-20261115`  
**Owner follow-up:** 2026-11-15 23:40 Asia/Macau (t199u–t201u); security correction after independent review of frozen `1e62ce9` / head `df35d278`; narrow PATCH/bootstrap follow-up after independent re-review of frozen `927bf1db` / head `4466c586`; write-token CAS follow-up after independent re-review of frozen `94ee1ff4`  
**Branch / PR:** `cursor/host-role-admin-gate-a72c` / [#41](https://github.com/Evanevia09/KaiYue-Travel/pull/41)  
**Base:** `cursor/admin-profile-password-2cad` (not `main`)  
**Status:** implemented / tested / pushed on this PR. **Not** staged, **not** `user_accepted`, **not** `released`.

This increment does not merge, deploy, upload, apply D1, bootstrap, rollback, create real accounts, change DNS/mail/main, or touch production Worker `kaiyue-travel` version `71a66a99` / deployment `f3169afb`. Static review of frozen `4af0a5ca` resolved prior blockers; no new source feature/fix in this closeout. Mika verified previous CI 206 green; that is not acceptance.

## Staging-URL build evidence (operational gate)

Exact command, frozen runtime `4af0a5caf12b06eedaf41ea1f173263b4a56d433`, environment URL `https://staging.kaiyuemacau.com`. No secret env dump.

| Item | Value |
|---|---|
| Raw log | `/opt/cursor/artifacts/kaiyue_4af0a5c_staging_url_build_20261115T170212Z.log` |
| Log SHA256 | `0f8a92260d23ed8d2a2c083e50620c9b2d33c84196cb98ca9902fe0b12f59695` (6588 bytes) |
| Exit | `0` |
| `PUBLIC_SITE_URL` | `https://staging.kaiyuemacau.com` |
| Git HEAD at capture | `f6b758c380284244acecb6caf85a4a1d4a923cc3` (docs-only vs frozen runtime) |
| Runtime tree vs `4af0a5c` | unchanged (`apps` / `migrations` / `packages` / `scripts`) |
| Frozen zip | unchanged SHA256 `4760701f…`; not rebuilt |
| `dist/client` vs zip | 141 files, 0 changed |
| True blocker | none |

`dist/server/entry.mjs` is the Astro server entry. Zip `entry.js` is the prior wrangler `--dry-run` Worker bundle of the same frozen source (`f2ccf867…`). Those paths are not byte-identical by design; client assets matched the zip, so the zip was not replaced.

## Residual CAS semantics

Operator PATCH is **state-CAS** on the observed `(role, enabled, updated_at)` triple. The unique `updated_by` write token owns **this mutation's** audit INSERT and session DELETE so a failed CAS cannot attach to another write at the same clock. It is **not** ABA-proof versioning: a later writer that restores the same triple can make a stale PATCH match. No monotonic version column was added. Last-super `RAISE(ABORT)` triggers remain the last-enabled-super invariant.

## What shipped in source

Exactly two persisted roles: `super_admin` and `staff`. Sidecar table `admin_operator` (`migrations/0009_admin_operator.sql`); Better Auth `"user"` is unchanged (no `user.role` column; `0009_admin_primary_role.sql` still does not exist). `migrations/0010_admin_operator_last_super.sql` installs BEFORE UPDATE/DELETE `RAISE(ABORT)` triggers so the last enabled super_admin cannot be removed even under concurrent count-then-update.

| Surface | Who |
|---|---|
| `/admin/users` UI + Users nav | super_admin only |
| `GET/POST /api/v1/admin/users` | super_admin |
| `PATCH /api/v1/admin/users/:id` | super_admin (role and/or enabled; field-specific CAS) |
| `POST /api/v1/admin/users/:id/password` | super_admin reset |
| Operational dashboard / bookings / inventory / contacts / offers / own profile password | staff and super_admin |

Create always inserts `staff`. Promotion is a PATCH. A third role is 403. Staff cannot read or mutate user-management endpoints and cannot escalate via `POST /api/v1/admin/profile/role`. Role, enable, and password-reset mutations write the operator row/account, audit event, and session delete in one D1 `batch` (fail-closed). Partial PATCH writes only requested columns and compare-and-set on observed `role`/`enabled`/`updated_at`. Audit INSERT and session DELETE are owned by a unique `updated_by` write token (`actorId/uuid`), not `updated_at` clock equality, so a failed CAS cannot audit or revoke another write even when both requests share the same millisecond. A 0-row CAS is 409 with no audit and no session revoke. Password `requireAdmin` checks that the Better Auth `"session"` row still exists after cookie-cache `getSession`, so a revoked cookie cannot authorize, inherit a later role, or revive on re-enable. Hashes/secrets are never returned. No invite email.

Until `admin_operator` has rows, login stays on the env allowlist (`ADMIN_EMAILS`) plus existing `ADMIN_PRIMARY_EMAIL` production-host rules. User-management APIs stay 403. An empty table is not implicit super-admin elevation. Account email is the authorization target, not a hardcoded global superadmin. Credentials already exist; owner password is not requested or changed. Staging-admin min-6 and production min-12, host isolation, and no Access prerequisite are unchanged.

## Independent review findings (verified, then fixed)

Frozen runtime `1e62ce9` / head `df35d278` independently matched the first review input. Frozen runtime `927bf1db` / head `4466c586` independently matched the follow-up: original HIGHs are statically resolved; remaining MEDIUM SET-both and bootstrap skip-regardless were present. Frozen runtime `94ee1ff4` independently matched the next remaining MEDIUM: audit/session DELETE keyed only on `user_id`+`updated_at`, so equal-T concurrent B could make A's 0-row CAS still audit/revoke B, then return 409.

| ID | Finding | Fix |
|---|---|---|
| HIGH1 | `countEnabledSuperAdmins` then a separate UPDATE allowed concurrent demote/disable to remove every enabled super_admin | `0010` BEFORE UPDATE/DELETE `RAISE(ABORT)` plus local sqlite interleaved count-then-update vs trigger regression |
| HIGH2 | Normal `getSession` 60s cookie cache still authorized after D1 session delete; existing tests used `disableCookieCache: true` as the proof | `assertLivePasswordSession` after `getSession`; normal-cookie `requireAdmin` lifecycle tests (promote/demote/disable/re-enable/reset) without cache bypass as the security proof |
| MEDIUM (sequential) | Role update → audit → session-delete (and reset) were sequential, so audit failure skipped revocation | One D1 `batch` for mutation + audit + session delete; MemoryD1 `batch` is BEGIN/COMMIT/ROLLBACK; injected audit-failure tests leave role, password, and sessions unchanged |
| MEDIUM (partial PATCH) | `handlePatchOperator` read old role/enabled then `SET` both; concurrent disable could be undone by a stale promotion writing `enabled=1`; enabled-only PATCH could restore a concurrently demoted role | Field-specific `SET` plus CAS on observed `role`/`enabled`/`updated_at` |
| MEDIUM (CAS clock) | Audit/session DELETE matched only `user_id`+`updated_at`; writeAt is millisecond Date; 0-row CAS checked after the batch. Concurrent A/B same T: B commits `updated_at=T`; A's stale UPDATE is 0 rows but audit/revoke match B's T, then 409 after side effects. Distinct-timestamp tests missed it. | Unique mutation ownership: `updated_by = actorId/uuid`. Audit INSERT and session DELETE `EXISTS` on that token, not clock equality. Failed CAS cannot audit/revoke regardless of timestamp collision. Last-super triggers and D1 batch atomicity unchanged. Equal/frozen-clock interleaving regression added. |
| Bootstrap | Two INSERT statements then CHECK; then `927bf1d` skip-existing-id regardless of owner role/enabled, so wrong owner prestate could INSERT staff before CHECK depending on request boundaries. Review did **not** prove fresh-empty bootstrap failure. Report at `94ee1ff` listed operator-table preflight before migrations 0009/0010. | Leading empty-or-owner-only-enabled-matching-super CHECK; data `INSERT` gated to 0 rows unless that prestate holds. Executor order is source in `scripts/staging-operator-bootstrap-order.json`: identity SELECT (no sidecar table) → migration-list SELECT (`sqlite_master`) → wrangler D1 migrations apply 0009/0010 → operator SELECT `supported_prestate` → entire provision file one invocation. Fresh empty locally succeeds. |

Destructive `DROP TABLE` rollback is not approved and is no longer the script. Last enabled super_admin remains protected during rollback.

## Staging-only bootstrap (not applied)

Target D1: official UAT `kaiyue-travel-staging` `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` (Worker `kaiyue-travel-staging`, account `33ecc75158a1cdd23ba1a62eb70c5103`, R2 `kaiyue-offers-staging`).

**Executor / grouping (source: `scripts/staging-operator-bootstrap-order.json`; local evidence only; do not apply remotely from this increment):**

1. SELECT-only `scripts/preflight-staging-identity.sql`. Abort unless `identity_ok = 1`. This statement does not read the sidecar table and is safe before 0009/0010.
2. SELECT-only `scripts/preflight-staging-migrations.sql` (`sqlite_master` only). If `admin_operator_table` or last-super triggers are 0, apply migrations next.
3. `wrangler d1 migrations apply` for `migrations/0009_admin_operator.sql` then `migrations/0010_admin_operator_last_super.sql`.
4. SELECT-only `scripts/preflight-staging-operators.sql`. Abort unless identity still matches **and** `supported_prestate = 1`. This statement reads `admin_operator` and must not run before step 3.
5. Intended later apply (not authorized from this increment): the **entire** `scripts/provision-staging-operators.sql`. Pinned Wrangler `4.132.0` `d1 execute --file` uses the D1 **import** API (`action: init` + file upload + poll), not the D1 **query** API used by `d1 execute --command`. Do **not** equate `--file` with a verified REST `/query` semicolon-joined body, Worker `D1Database.batch()`, or the locally observed REST CHECK-rollback path. Import-API interruption and grouping atomicity remain UNPROVEN. The data INSERT is gated to 0 rows under unsupported prestate; that SQL gating is not a substitute for an observed import-API transaction. This does not authorize execution.
6. Confirm `SELECT role, enabled FROM admin_operator JOIN "user" ...`.
7. Do **not** apply to production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, trial `06aa844b`, or obsolete `069aa442`.

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
- Equal-timestamp `updated_at` audit match steals a concurrent write; unique `updated_by` write token does not; frozen-clock handler 409 leaves sessions and audit unchanged
- Identity and migration-list prechecks run on sqlite before the sidecar table exists; operator preflight fails without it; bootstrap order JSON is identity → migration-list → migrate 0009/0010 → operator preflight → single-file bootstrap
- Gated provision vs unsafe sequential fixture and vs 927bf1d owner-skip-regardless fixture on local sqlite
- Fresh empty success, replay, wrong owner role, disabled owner, extra-super, interrupted prestate (0 new writes)
- Unprovisioned allowlisted user `GET /api/v1/admin/users` → 403
- Prior host-role, min-6, profile-password, production-host, and invariant regressions

## Official-staging artifact

Local packaging only. Existing runtime source `577012c` / deployed version `19ebb0b4` @100% deployment `4464865f` is **not** replaced by this agent. Packaged overlay vars remain the prior authoritative set (`vars` JSON equal to the `577012c` / `1e62ce9` / `927bf1d` overlay); `keep_vars` false; HTML `run_worker_first` `["/*","!/_astro/*","!/images/*","!/favicon.ico"]`. No `--keep-vars`. No secrets or login passwords. Package of `94ee1ff` (`3ef4665a…`) is superseded and must not be uploaded.

| Item | Value |
|---|---|
| Source SHA | `4af0a5caf12b06eedaf41ea1f173263b4a56d433` |
| Zip | `/opt/cursor/artifacts/kaiyue_host_role_4af0a5c_official_staging.zip` |
| Zip SHA256 | `4760701f12494bcf275218ab7c0537662fa9b4a19a68b5e30dacd8b0e45f82f9` (9998987 bytes) |
| entry.js SHA256 | `f2ccf8673fe9da65cd5d0b6681a5f617b6ac4b2134a6d3a408dcd3611eda0e63` |
| wrangler.jsonc SHA256 | `3cebf4081a9a95270bfb9dd5ed09101a7a508e7965808690cff5a9cf2bb4b615` |
| Overlay | `/opt/cursor/artifacts/kaiyue_host_role_4af0a5c_official_staging.wrangler.jsonc` |
| Ledger dir | `/opt/cursor/artifacts/kaiyue_host_role_4af0a5c_official_staging/` |
| `0009_admin_operator.sql` | `e90ac3cc28ff3efa39286c2b6b9c421d658e2d931b2f8b80e50e17c8916856aa` |
| `0010_admin_operator_last_super.sql` | `8eb9f0a6bd18812232605154bbb64f9ca48db6a629b0e8d728dd941b8d5c3502` |
| `preflight-staging-identity.sql` | `ffb70b696b95a1ebd4d9dd7f306c5470fa00b6d70c325eb540e6f4ebfb2d7fe4` |
| `preflight-staging-migrations.sql` | `077f6f7230fa65c9430cac4e677db427bda6ec213fce7c415b20ccb3ee9162e4` |
| `preflight-staging-operators.sql` | `c76f2c2ab23290f77284f04726fe17fa4166e69fe19ae564f8bbea379a8407a5` |
| `provision-staging-operators.sql` | `883759c93e76e783b6f3deb8d25ef0e98573ed1667855b8ce404b074aaabf25c` |
| `rollback-staging-operators.sql` | `715e3a72b1f930dd9a47cb5d525eb4affae5118cef1f31a7972495b6d552ac77` |
| `staging-operator-bootstrap-order.json` | `14d1ee69aa55f715625556761350e1e735edb055c041f7d60dd6ad6bf7cccb2a` |

Later operator upload (not this agent), from the unzipped folder:

`npx wrangler versions upload --no-bundle --strict --name kaiyue-travel-staging`

Do not upload, `wrangler deploy`, or apply SQL from this increment. Later operator work, if separately authorized, still must not treat Wrangler `4.132.0` `d1 execute --file` as the verified REST `/query` grouping. Do not touch LIVE `71a66a99` / `f3169afb`. Destructive `DROP TABLE` rollback remains unapproved.

## Distinctions

| Claim | This increment (PR #41 source) | Later, outside this increment |
|---|---|---|
| implemented / tested / pushed | yes, PR #41 | CI/CD source is a stacked PR; see `docs/records/2026-11-16-official-staging-cicd.md` |
| staged (Worker uploaded / D1 applied) | no at PR #41 closeout | **Yes** 2026-11-16 07:17 Asia/Macau: version `72e580d0` @100%, deployment `28f8b40b`; `0009`/`0010` applied on D1 `043cd0ff` |
| browser-checked | no | **Partial** sign-in, dashboard, Users, min-6 UI; no mutations; revocation untested; admin `/` cache unresolved. Not all QA pass |
| `user_accepted` | no | no |
| `released` | no | no |
| CI/CD connected | no | **no** (source only; environment/token not created) |
| production changed | no; LIVE must stay `71a66a99` / `f3169afb` | still untouched |

## Blockers / open

- Root admin still served cached marketing despite uploaded `run_worker_first`; cache-purge permission pending PM verification. Do not assume admin-host `/` is live-fixed.
- CI/CD Workers Builds for production remain separate / pending staging credential. Do not enable production builds.
- This agent does not upload or apply SQL. HOLD all upload/deploy/D1/bootstrap/rollback.
- Independent re-review of this write-token fix is still required before any deployment approval. Mika verified previous CI 206 green; that is not acceptance.
- Wrangler `4.132.0` `d1 execute --file` is D1 import API, not query API. Do not execute it from this increment. Do not treat it as proven atomic with REST `/query`.

## Artifact checksums

Frozen zip of runtime `4af0a5c` was not rebuilt. New evidence is the staging-URL build log above. This step did not upload.
