# 2026-11-15 — Isolated admin trial resource plan (not approved, not created)

**Status:** plan only. Parent requests Mika staging approval of this exact resource set before any provision. This writer does **not** create Worker, D1, R2, DNS, routes, or paid-plan resources. This is **not** a trial approval.

## Why the previous staging overlay was unsafe

`docs/records/wrangler.staging-artifact.jsonc` previously named existing protected UAT (`kaiyue-travel-staging`, D1 `043cd0ff`, R2 `kaiyue-offers-staging`) with `keep_vars: true`. Omitted vars would **persist** on upload. Canonical host `kaiyue-travel-staging.kai-yue.workers.dev` is in `PRODUCTION_HOSTS`, so `ENVIRONMENT=preview` would not enable password login there. That file is now a **DO_NOT_UPLOAD** baseline record. Official UAT credentials, data, and config stay untouched.

## Current baselines (do not mutate)

| Surface | Worker | D1 | R2 | Host | Notes |
|---|---|---|---|---|---|
| Production live 14:18 | `kaiyue-travel` versions `f3169afb` / `71a66a99` | `06cf879d-8fea-4088-8881-7d382e1b8c11` | `kaiyue-offers-production` | `kaiyuemacau.com` + unattached `admin.kaiyuemacau.com` | Overlay `wrangler.production-artifact.jsonc`. Public `/admin` `/login` 403. |
| Official UAT | `kaiyue-travel-staging` | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` | `kaiyue-offers-staging` | `kaiyue-travel-staging.kai-yue.workers.dev` (production-protected in this source) | Preserve. Do not upload, overwrite, seed, or loosen 403. |
| Git wrangler | `kaiyue-travel` name in repo | obsolete `069aa442` | n/a | n/a | Never upload. |
| Isolated trial | **does not exist** | **does not exist** | **does not exist** | planned workers.dev below | Create only after Mika approval. |

## Proposed trial resources (parent creates after approval)

Account `33ecc75158a1cdd23ba1a62eb70c5103` only. No paid-plan activation. If the account cannot create another free D1/R2/Worker, stop.

| Resource | Exact name | Binding / hostname | Empty? |
|---|---|---|---|
| Worker | `kaiyue-travel-admin-trial` | new Worker, not `kaiyue-travel` / `kaiyue-travel-staging` | yes |
| D1 | `kaiyue-travel-admin-trial` | `DB` — ID filled after `wrangler d1 create` | yes, then migrations `0001`–`0008` only |
| R2 | `kaiyue-offers-admin-trial` | `OFFERS_BUCKET` | yes |
| Hostname | `kaiyue-travel-admin-trial.kai-yue.workers.dev` | `PUBLIC_SITE_URL` | workers.dev default for that Worker |

Compatible hostname rules in this source:

- Must **not** be `admin.kaiyuemacau.com` (production dedicated host).
- Must **not** be `kaiyue-travel.scalingsmb.workers.dev` or `kaiyue-travel-staging.kai-yue.workers.dev` (`PRODUCTION_HOSTS`, fail-closed 403).
- `ENVIRONMENT=preview` on the trial workers.dev host is what allows Better Auth password login (`isPreviewRuntime`).
- Do not add the trial host to `PRODUCTION_HOSTS`.

Overlay template: `docs/records/wrangler.admin-trial-artifact.jsonc` (`keep_vars: false`, sentinel D1 `00000000-0000-4000-8000-00000000a1a1`). Replace the sentinel only after parent records the real D1 ID. Do not upload while the sentinel remains.

## Trial fixture (self-contained, not Daniel)

- Operator email: `admin-trial@kaiyue.test` only.
- Never `daniel@kaiyuemacau.com`.
- Empty D1 + migrations `0001`–`0008`. **No** `0009` role column.
- Better Auth user + credential CREATE via `scripts/provision-primary-admin.mjs --env trial` after a fresh `--preflight` against the **trial** D1.
- Worker vars (parent, after package route validated; not git, not overlay): `BETTER_AUTH_SECRET`, `ADMIN_EMAILS=admin-trial@kaiyue.test`, `ADMIN_PRIMARY_EMAIL=admin-trial@kaiyue.test`. Omit Access vars, 6-char min, Nov 24 expiry, `DEV_ADMIN_BYPASS`.
- Password: user-provided into the local process if a native secret request is used later. Vault cannot export a generated password into the CLI or write Worker bindings.

## Rollback

- Delete or disable only the trial Worker version. Do not roll production or UAT forward/back from trial.
- Leave D1 `043cd0ff` and `06cf879d` untouched.
- Trial D1/R2 may be dropped after the trial; that is not a UAT restore.

## Not included

DNS/custom domain, Cloudflare Access, Paid plan, public signup, `/setup-admin`, overwriting UAT, loosening apex/www 403, creating resources in this increment.
