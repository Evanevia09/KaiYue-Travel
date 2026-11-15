# 2026-11-15 — Staff dashboard profile password + Mika corrections (source prep only)

**Task:** stacked PR #39 on PR #38. Mika review of frozen `c8ad22c5` → `6dcbc44d` is corrected in a new SHA on the same writer/branch.  
**Status:** source prep. **Not** `user_accepted`, **not** merged, **not** deployed, **not** `released`.  
**Does not:** write D1, seed credentials, set Worker secrets, attach DNS, onboard Access, merge `main`, overwrite staging, send email, or make Paid Cloudflare changes.

Independent review and staging browser QA remain parent-coordinated. Owner authorized functional staff-dashboard production work and Daniel as the main operator; operational steps happen after review.

## Continuity

| Item | Pointer |
|---|---|
| Reconciliation | PR #38 `cursor/main-reconcile-dashboard-2cad` `c8ad22c5c9da05949b985effcbd046a040c1d621` — **never trial or merge alone** |
| Reviewed PR #39 SHA (Mika input) | `6dcbc44dec0d5ccfcbc812db6d4161b7dd522577` — superseded |
| Correction SHA (this increment) | `0e09ffe6d20cf812fa7548fc9da73aaf2fbba986` |
| Notification checkpoint | PR #36 `dd69a47d74a06f1119aca116451a1060fa4413ed` |
| Live-release checkpoint | PR #35 `5aa40dd90db5388883133818e3da5acd4112528a` — never blind-merge |
| Staging 6-char UAT | `61bc5a03` / PR #34 — **never** port to production |
| Live Worker 14:18 | unchanged `f3169afb` / inactive `71a66a99` |
| This branch | `cursor/admin-profile-password-2cad` (from PR #38 HEAD) |

## (1) PR #38 must not be trialed alone

PR #38 restores the live Access-only dedicated-host gate (`passwordAdminAllowed` false on `admin.kaiyuemacau.com` whenever that host is used as an Access surface). That is the **unwanted** gate. Owner Nov 12: remove the extra Access requirement; keep Better Auth/D1.

**Combined PR #39** restores owner password login when Access vars are **both absent**. Public apex/www stay 403. 41 photos stay.

Do **not** wait on Cloudflare Access onboarding. Access not enabled on 33ecc is an observation, not a production blocker. Parent 14:03–14:06 Access-blocker framing is discarded.

## (2) Access config is both-or-nothing

`accessConfigured` is true only when **both** `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are non-empty. Domain-only or AUD-only is `partial` and fails closed (no password login, no Access JWT). Both absent is the valid normal password path. Both configured is the valid Access path. This does **not** enable Access as a requirement.

## (3) Session revocation guarantee

Better Auth `session.cookieCache.maxAge` is **60 seconds**. Password change calls `revokeOtherSessions: true` and forwards **all** `Set-Cookie` values.

| Surface | Guarantee |
|---|---|
| D1 `session` rows for other devices | Deleted immediately |
| Current browser jar from the change-password response | Continues |
| Other complete cookie jars | Rejected when cookie cache is bypassed (`disableCookieCache`) |
| Other devices with a signed cache cookie | May remain valid **up to 60 seconds** |

Do not claim immediate other-device logout.

## (4) Production dedicated-host tests

Positive login + password change now run as `ENVIRONMENT=production` on `https://admin.kaiyuemacau.com`, not only localhost. Coverage also includes signup denial, cross-origin denial, unallowlisted identity, DEV_ADMIN_BYPASS non-bypass, public apex 403, and expired UAT timestamp ignored on this host. Production password policy stays min 12. `ADMIN_STAGING_TEST_PASSWORD_MIN=6` and `TEMP_ADMIN_EXPIRES_AT=2026-11-24` are not inherited.

## (5) Primary operator — not an allowlist label

Owner asked for Daniel as main admin. Review correctly found **no RBAC / super-admin** in the frozen SHA. This increment adds a minimal server-enforced primary:

- Worker var `ADMIN_PRIMARY_EMAIL` (Vault, not overlay, not git).
- Additive `migrations/0009_admin_primary_role.sql` (`user.role` default `staff`). **Not applied.**
- Production dedicated host: only the env-named primary email may password-login. Staff / other allowlisted users are 403.
- `POST /api/v1/admin/profile/role` is always 403. Password-change cannot set `role`.
- Persisted `primary` is ignored unless env names that same email (default-deny escalation).
- UI says “Primary operator”, not Super Admin.

### Provisioning check (parent 14:18 production D1 read, no writes, no hashes)

| Check | Result |
|---|---|
| D1 | `06cf879d-8fea-4088-8881-7d382e1b8c11` `kaiyue-travel-production` |
| Exact and case-insensitive `daniel@kaiyuemacau.com` user count | **0** |
| Associated credential account count | **0** |
| `user.email` UNIQUE | yes — do not insert a case variant |
| `user` columns | id, name, email, emailVerified, image, createdAt, updatedAt |
| role column / role table | **absent** (17 tables) |
| Decision | **CREATE**, not password reset |

### Supported secret-safe CREATE path (parent after review)

Approved path is the existing Better Auth hasher used by `scripts/seed-preview-test-admin.mjs`, **not** that preview seeder itself (obsolete D1 `069aa442`, `INSERT OR REPLACE`, 16-char preview policy, prints SQL including hash). Browser `/setup-admin` and `/api/auth/sign-up/email` stay development-only; loopback against live D1 is not a production fill path. **No new public admin-create endpoint.**

Exact parent steps, no secrets in this packet:

1. Generate a temporary password in Vault (length ≥ 12). Do not commit it.
2. Apply additive `0009` to production D1 **after** reviewed code is on the Worker that understands a missing column.
3. `PRIMARY_ADMIN_EMAIL` / `PRIMARY_ADMIN_PASSWORD` / `BETTER_AUTH_SECRET` in the local shell only.
4. `node scripts/provision-primary-admin.mjs --write-sql --out <0600 file>` then `--stamp-role` after 0009. Stdout omits password and hash. Script does not call wrangler.
5. Parent applies the SQL file with `wrangler d1 execute` against `06cf879d` only.
6. Vault Worker vars: `BETTER_AUTH_SECRET` (≥32), `ADMIN_EMAILS` and `ADMIN_PRIMARY_EMAIL` = the verified Daniel address. Omit `ADMIN_STAGING_TEST_PASSWORD_MIN` and `TEMP_ADMIN_EXPIRES_AT`.
7. Operator signs in on `admin.kaiyuemacau.com` and changes the password at `/admin/settings`.

Rejected: remote public signup, `/setup-admin` on production, inventing Access values, porting UAT 6-char / Nov 24 expiry, untargeted `UPDATE user SET role='primary'`.

## (6) Overlays — not git wrangler

| Overlay | Worker | D1 | R2 | Assets |
|---|---|---|---|---|
| `docs/records/wrangler.production-artifact.jsonc` | `kaiyue-travel` | `06cf879d` | `kaiyue-offers-production` | `run_worker_first=false` |
| `docs/records/wrangler.staging-artifact.jsonc` | `kaiyue-travel-staging` | official `043cd0ff` | `kaiyue-offers-staging` | `run_worker_first=true` |

Neither overlay encodes allowlist, primary email, secrets, Access, 6-char, or Nov 24 expiry. Git `wrangler.jsonc` stays unsafe (obsolete `069aa442`) and must not be uploaded.

## Auth / CSRF / rollback (preserved)

| Control | Behavior |
|---|---|
| Public `/admin` `/login` `/api/v1/admin/*` | 403 JSON `Admin access is not configured.` |
| `minPasswordLength` | **12** |
| CSRF | `requireSameOrigin` on admin mutations; dedicated host origin is not the public site origin |
| DEV_ADMIN_BYPASS | Local only; not an apex or dedicated-host shortcut |
| Rollback | Previous live Worker versions (`f3169afb` / `71a66a99` as of 14:18). Do not restore by wiping D1. |

## Verification (this increment)

Raw logs: `docs/records/2026-11-15-admin-profile-password-check-logs.txt`  
SHA256: `361bce51b5e610f9610abaff3994630d2d42e4f9b15c5ae0e5a9095c9cae27a9`

Local: `pnpm lint` clean; `pnpm typecheck` 0 errors (3 existing hints); `pnpm test` **163/163** across **32** files; `pnpm build` complete.

Prior official Actions job `https://github.com/Evanevia09/KaiYue-Travel/actions/runs/43684217704/job/132721152605` reviewed `6dcbc44d` (146 tests / 29 files) and is **not** release approval. Re-review **`0e09ffe6d20cf812fa7548fc9da73aaf2fbba986`**.

Not verified here: staging/live browser QA, D1 apply of `0009`, Vault CREATE, staff-domain attach, Access onboarding, GitHub Actions on this SHA, Workers Builds `41386f` (do not retry or cancel).

## Next action

Parent independent review of the **new** SHA (not `6dcbc44d` / not `c8ad22c5` alone), then staging QA on the isolated staging overlay, then parent-only Vault CREATE. Do not treat source prep as production staff login.
