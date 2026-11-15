# 2026-11-15 — Staff dashboard profile password (source prep only)

**Task:** fold profile change-password into isolated branch `cursor/admin-profile-password-2cad`, stacked on reconciliation PR #38.  
**Status:** `checked` after local lint / typecheck / test / build. **Not** `user_accepted`, **not** merged, **not** deployed, **not** `released`.  
**Does not:** write D1, seed credentials, set Worker secrets, attach DNS, onboard Access, merge `main`, overwrite staging, or publish queue/external messages.

Independent review and staging browser QA remain parent-coordinated. Owner authorized functional staff-dashboard production work and Daniel as main operator; operational steps happen after review.

## Continuity

| Item | Pointer |
|---|---|
| Reconciliation | PR #38 `cursor/main-reconcile-dashboard-2cad` `c8ad22c5c9da05949b985effcbd046a040c1d621` — left intact |
| Notification checkpoint | PR #36 `dd69a47d74a06f1119aca116451a1060fa4413ed` |
| Live-release checkpoint | PR #35 `5aa40dd90db5388883133818e3da5acd4112528a` — never blind-merge |
| Staging 6-char UAT | `61bc5a03` / PR #34 — **never** port to production |
| This branch | `cursor/admin-profile-password-2cad` (from PR #38 HEAD) |

## Preflight: change-password

| Check | Result |
|---|---|
| Feature in prior tree | **Missing.** No profile settings page, no `changePassword` / change-password route, no tests. |
| How it is tested now | `tests/integration/admin-profile.test.ts` (unauthenticated, wrong current password, short password, confirmation mismatch, `userId` escalation 403, success + other-session revoke, public apex 403, DEV_ADMIN_BYPASS cannot change password, Access-configured host 403). `tests/integration/admin-gate.test.ts` public-host 403 matrix unchanged. |

## Production admin gate (source + parent 14:05)

Public hosts stay fail-closed. This branch does **not** add `DEV_ADMIN_BYPASS` on production and does **not** invent Access values.

Source env names (from `apps/web/src/lib/server/env.ts` / `apps/web/src/env.d.ts`, not dashboard nicknames):

| Source name | Live 14:05 (parent, official 33ecc) |
|---|---|
| `ENVIRONMENT` | `production` |
| `DEV_ADMIN_BYPASS` | `false` |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` |
| `ACCESS_TEAM_DOMAIN` | **absent** (do not invent) |
| `ACCESS_AUD` | **absent** (do not invent; not `POLICY_AUD`) |
| D1 | `06cf879d-8fea-4088-8881-7d382e1b8c11` — preserve |
| R2 | `kaiyue-offers-production` — preserve |

`POLICY_AUD` / `TEAM_DOMAIN` are **not** Worker binding names in this repository. Tests assert `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` and reject `POLICY_AUD`.

## Blocked: Cloudflare Access onboarding (production)

| Item | Official 33ecc read-only 14:05 | Implication |
|---|---|---|
| Admin hostname `admin.kaiyuemacau.com` | Unattached: no DNS, no custom domain, no Worker route | Staff host is not reachable yet. Do not attach in this step. |
| Access apps / policies / identity providers | HTTP 403, code `9999`, `access.api.error.not_enabled` | Access product is **not onboarded**. |
| Access org / group read | Missing `access-acct.read` | Cannot list Access policy from this writer. |
| Live Access bindings | No `ACCESS_TEAM_DOMAIN`, no `ACCESS_AUD` | Password JWT Access path cannot run on live. Do **not** invent values to make tests look green in production. |
| Billing / plan | May require billing info / Free plan selection | **Parent/owner decision later.** Not a browser bypass. |

This blocked row is **not** a reason to stop source prep. It **is** a reason not to declare production staff login live.

When Access is later onboarded with real `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`, this branch keeps password routes **disabled** on the dedicated host and keeps public apex/www 403. Password change is then unavailable for Access identities (settings page says so).

Until Access is onboarded, dedicated-host password admin is allowed **only** on `admin.kaiyuemacau.com` and only because both Access source vars are absent. Public production hosts remain 403. Admin hostname still has no DNS — this is source prep, not a live login.

## Identity, schema, Daniel

There is **no RBAC / super-admin column**. Schema is Better Auth 1.7.5 (`migrations/0004_admin_auth.sql`): `user`, `session`, `account`, `verification`. Operator authorization is the `ADMIN_EMAILS` allowlist plus a Better Auth credential row. `/setup-admin` stays development-only.

**Daniel identity (verified record, not a new guess):** owner t156u “daniel@” maps to historical `daniel@kaiyuemacau.com`. Trusted in-repo pointer: `tests/integration/production-overlay.test.ts` forbids that address in the production overlay so it is never baked into git Wrangler/overlay. This branch does **not** add the address to overlay, wrangler, or seed SQL.

**Not done (parent after review, Vault/Secure Form only):**

1. Keep live D1 `06cf879d` and R2 `kaiyue-offers-production`. No photo/contact wipe. Confirm migration `0004` on that D1 before any user row.
2. Set Worker secrets/vars via Vault: `BETTER_AUTH_SECRET` (length ≥ 32), `ADMIN_EMAILS` = the Daniel address above. Do **not** put them in git, overlay, logs, or chat. Do **not** port `ADMIN_STAGING_TEST_PASSWORD_MIN`.
3. Create the Better Auth user for that email with a temporary password **≥ 12 characters**, parent-generated, never `test123`, never committed.
4. Operator then signs in on a **reviewed staff surface** (not public apex) and uses `/admin/settings` to change the password.
5. Attach admin hostname / Access onboarding only after owner decision. Not this PR.

## Auth / CSRF / rollback

| Control | Behavior |
|---|---|
| Public `/admin` `/login` `/api/v1/admin/profile/password` | 403 JSON `Admin access is not configured.` |
| `minPasswordLength` | **12** (`ADMIN_PASSWORD_MIN_LENGTH`). Longer passwords allowed. Policy not lowered. |
| Change password | Own session only. Current password required. Confirmation required. Rejects `userId` / `email` / `id` fields. Better Auth hashes the secret; hashes are not returned. Other sessions revoked; new session cookie forwarded. |
| CSRF | Existing `requireSameOrigin` on admin mutations. |
| DEV_ADMIN_BYPASS | Local only; cannot change password. Not an apex shortcut. |
| Git `wrangler.jsonc` | Unchanged, unsafe, do not upload. Overlay remains production D1/R2, `run_worker_first=false`, no TEMP/Access invented vars. |
| Rollback | Previous live Worker versions (`f3169afb` / `71a66a99` as previously recorded). Do not restore by wiping D1. |

## Verification (this increment)

Raw logs: `docs/records/2026-11-15-admin-profile-password-check-logs.txt`.

Expected: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Not verified here: staging/live browser QA, D1 user row, staff-domain attach, Access onboarding, GitHub Actions, Workers Builds `41386f` (do not retry or cancel).

## Next action

Independent review of this PR (and PR #38). Parent-coordinated staging browser QA. Then parent-only operational provisioning. Do not treat source prep as production staff login.
