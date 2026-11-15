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
| Mika rereview freeze | `0e09ffe6d20cf812fa7548fc9da73aaf2fbba986` / docs `9de0a9ae1ca33f72206589e990c02bebf60698b0` |
| This increment | `74c30236a03583675f39d1a97b79c19a60d58da5` |
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

Other-session tests now advance the signed cookie-cache clock past 60s (`Date.now()`), not only `disableCookieCache`.

## (5) Primary operator — env config, not DB RBAC

Owner asked for Daniel as main admin, not a UI label. Authority is `ADMIN_PRIMARY_EMAIL` + `ADMIN_EMAILS` (password path). `requireAdmin` applies that check to **password sessions and Access JWTs**. A second Access identity cannot use the dedicated host.

**No `0009` role migration.** 14:18 had no role column. A persisted `user.role` would be unused metadata and would pretend D1 enforces a single primary. Account creation still persists Better Auth `user` + `account` rows from `0004`. Profile “Primary operator” is derived from env match.

`POST /api/v1/admin/profile/role` stays 403. Password-change cannot set `role`.

### Provisioning check (parent 14:18 snapshot — re-read before apply)

| Check | Result |
|---|---|
| D1 | `06cf879d-8fea-4088-8881-7d382e1b8c11` `kaiyue-travel-production` |
| Exact and case-insensitive `daniel@kaiyuemacau.com` user count | **0** at 14:18 |
| Associated credential account count | **0** at 14:18 |
| `user.email` UNIQUE | yes — do not insert a case variant |
| `user` columns | id, name, email, emailVerified, image, createdAt, updatedAt |
| role column | **absent** — do not add one |
| Decision at 14:18 | **CREATE**, not password reset. Re-run `--preflight` immediately before apply. |

### Supported CREATE path (parent after package review)

Vault **cannot** export a generated login password into the local CLI or write Worker bindings. A later native user-secret request may put a **user-provided** password in `PRIMARY_ADMIN_PASSWORD` for this process only. Parent configures Worker secrets after the package route is validated. **No** public provisioner, credential collector, or browser loopback.

1. `--preflight` against live `06cf879d` (bounded counts only).
2. `scripts/provision-primary-admin.mjs --write-sql --out <new path>` — exclusive `wx` 0600, refuses existing files/symlinks, CHECK(ok = 1) postcondition (SQLite/D1 RAISE() is trigger-only). Does not call wrangler.
3. D1 `batch()` is transactional; `wrangler d1 execute --file` is sequential auto-commit. Interruption can leave a user without a credential; CREATE then **refuses**. Do not INSERT OR REPLACE or wipe.
4. Operator signs in on `admin.kaiyuemacau.com` and changes password.

Rejected: remote public signup, `/setup-admin`, `seed-preview-test-admin.mjs`, claiming “Vault sets” Worker vars from this writer.

## (6) Overlays and isolated trial plan

| File | Meaning |
|---|---|
| `docs/records/wrangler.production-artifact.jsonc` | Production upload overlay: `kaiyue-travel` / `06cf879d` / `kaiyue-offers-production` / `run_worker_first=false` |
| `docs/records/wrangler.staging-artifact.jsonc` | **DO_NOT_UPLOAD** official UAT baseline (`043cd0ff`). `keep_vars: true` is why omitted vars would persist. Host is production-protected. |
| `docs/records/wrangler.admin-trial-artifact.jsonc` | Unapproved isolated trial template: new Worker `kaiyue-travel-admin-trial`, sentinel D1, `keep_vars: false`, host `kaiyue-travel-admin-trial.kai-yue.workers.dev` (not in `PRODUCTION_HOSTS`). Fake operator `admin-trial@kaiyue.test`. |

Full plan + rollback: `docs/records/2026-11-15-isolated-admin-trial-plan.md`. Not created. Not approved. No paid-plan activation. Do not overwrite UAT.

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
SHA256: `79ada0887ae11cfe562d1981de247100d0c725afe8a2a2b1e6776916bcf8749d`

Local: `pnpm lint` clean; `pnpm typecheck` 0 errors (3 existing hints); `pnpm test` **165/165** across **32** files; `pnpm build` complete.

Mika verified the previous **163** local checks on `0e09ffe` / `9de0a9ae`. That is **not** staging or provisioner sign-off. Re-review **`74c30236a03583675f39d1a97b79c19a60d58da5`** (full HEAD on `cursor/admin-profile-password-2cad`).

| Artifact | SHA256 |
|---|---|
| `package.json` | `468a148b0fd397598b030fbd92f611ff76c90b283525ce5bbb1e7da4b6715eff` |
| `pnpm-lock.yaml` | `77534ea2b09a906a921384449803426de91a2c14ef101c1bbb6bd8a0a672403b` |
| `docs/records/wrangler.production-artifact.jsonc` | `6ef1b9de6915159bc3018bf98930b4cb0e465c9bbd65aa0a05d3ff47fbd45bdf` |
| `docs/records/wrangler.staging-artifact.jsonc` (DO_NOT_UPLOAD UAT) | `a00913877e3579a7c2521bf58c9965664ddd2d2ace9083290114c10ac89683ab` |
| `docs/records/wrangler.admin-trial-artifact.jsonc` (unapproved plan) | `160c40c8541181abbd35d0ea370e2ed266c37ee6e944036fcdb7b9cff9294a9f` |
| git `wrangler.jsonc` (unsafe; do not upload) | `2899600fd7501fb48b94dde1ed6e223bcf65809e99814bb83af0ba4204ce1386` |
| `scripts/provision-primary-admin.mjs` | `8aa1fdd567de712823cfc5e6efd03661eb43077e2a67114c7bce62e110a7fec0` |
| `docs/records/2026-11-15-isolated-admin-trial-plan.md` | `68e65baa5341f9c129359babfd5900126fb85c9361bcbf1a2b9e74189ce505de` |

Isolated resource plan + rollback/current baselines: `docs/records/2026-11-15-isolated-admin-trial-plan.md`. Owner 16:47 Asia/Macau approved **only** new empty D1/R2 + synthetic probes (Mika independently verified hashes, JSON `00`–`11`, and that answer). D1 `06aa844b-da6b-4c37-896c-fd13dd265fe6` and R2 `d937f5bc01e448afa679bdbf3769ed50` now exist; Worker still **not** created. Overlay templates remain **DO_NOT_DEPLOY** / UAT **DO_NOT_UPLOAD** until a substituted overlay is approved. Observed REST single `/query` CHECK rollback (test E) supersedes blanket sequential-autocommit **only** in that mode. Provisioner not fully validated; upload/provisioning not inferred. Evidence: `docs/records/2026-11-15-admin-trial-safety-evidence/`.

Not verified here: staging/dedicated-host browser QA, secret fill, final bindings, staff-domain attach, Access onboarding, GitHub Actions on the new SHA, Workers Builds `41386f` (do not retry or cancel).

## Prep package (runtime freeze intact)

Built from isolated worktree at `74c3023`. Original artifacts `/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_*` are immutable (zip `483686e1`, record `f78d5856`). Metadata r2 prefix `kaiyue_admin_prep_74c3023_metadata_r2_` corrects catalogs/config only. Record: `docs/records/2026-11-15-admin-prep-package.md`.

- Original production zip SHA256 `483686e17141a24b12561169aaa51a0a9a7ccd91cba0e47703eb128f1fd24175` (entry + 41 photos, D1 `06cf879d`, R2 production, `run_worker_first=false`).
- r2 production zip SHA256 `4e8011c9a76fe936253a0197b8fc700ef4faaaee37bffd4f36ff6a46fd77e18c` (same entry/photos; DEPLOYMENT-CONFIG + operator plan only).
- Dedicated host intended Better Auth password path when both Access vars are absent; public 403; host not attached/live. Live rollback target `71a66a99`@100% / `f3169afb` (repeat readback before apply).
- Trial overlay TEMPLATE labeled **DO_NOT_DEPLOY** (sentinel not substituted). Official UAT **DO_NOT_UPLOAD**. Account now has empty trial D1 `06aa844b` / R2 `d937f5bc`; that is **not** overlay approval or Worker upload.
- Standalone CREATE CLI SHA256 `e7f104973dcdaa16d2fb201d90eeea1abae48c78f5328589fd348f44e32a1e2d` (unchanged).
- Overlay `keep_vars` omissions are not final bindings approval. No DNS, Worker create, secret seed, or upload.

## Next action

Ops hold. Secure-process fill, final actual-ID overlay hash, application-auth browser QA, and scoped upload/provisioning authority remain open. Repeat official 33ecc version readback before any apply. Do not upload while templates still carry the uncreated D1 sentinel. Future timeout/error: target/state readback before retry; no fixture cleanup.
