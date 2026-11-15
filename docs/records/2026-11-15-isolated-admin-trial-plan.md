# 2026-11-15 — Isolated admin trial resource plan (not approved, not created)

**Status:** plan history preserved. Owner 16:47 Asia/Macau approved **only** new empty D1/R2 plus synthetic noncredential probes. Infra finished 16:53; user result delivered 16:55. Worker still not created. Overlay templates still **DO_NOT_DEPLOY** / UAT **DO_NOT_UPLOAD** until a later substituted overlay is approved. This is **not** upload, activation, `user_accepted`, or `released`.

## Closeout 2026-11-15 16:55 Asia/Macau (docs only)

Evan answered existing widget t164s918 at 16:47 Asia/Macau. Scope used exactly: official account `33ecc75158a1cdd23ba1a62eb70c5103` new empty D1/R2 + synthetic noncredential REST probes. No Worker create/upload/activation, real identity/secret provisioning, app migrations, DNS/Access, mail, paid-plan change, prod/UAT writes, cleanup, or credential generation.

| Resource | Name | ID | Notes |
|---|---|---|---|
| D1 | `kaiyue-travel-admin-trial` | `06aa844b-da6b-4c37-896c-fd13dd265fe6` | created 16:50:38.957; not prod `06cf879d`, not UAT `043cd0ff` |
| R2 | `kaiyue-offers-admin-trial` | `d937f5bc01e448afa679bdbf3769ed50` | empty, private, managed r2.dev `enabled=false` |
| Worker | `kaiyue-travel-admin-trial` | — | **not created** (GET script-settings 404 code 10007) |

Five probes **PASS** on the **observed** intended method only: one REST `POST .../query` with a single `sql` string of semicolon-joined statements. That includes observed earlier DML + guard CREATE rollback when a later CHECK failed (test E), plus positive create, duplicate/noop CHECK refusal, case-variant refusal, and user-only refusal. Precise scope is that REST single-query path on this D1 — **not** a general Cloudflare contract. Mid-request interruption **UNPROVEN**. `wrangler d1 execute --file`, Worker `D1Database.batch()`, and REST `{batch:[{sql},...]}` **UNTESTED**.

Residual trial D1 state left in place (no wipe): `synth_user` 2 / `synth_account` 1, password column marker `SYNTHETIC_NONCREDENTIAL_MARKER_NOT_A_PASSWORD` only. No actual credentials. Runtime freeze `74c30236` unchanged. Metadata r2 zip `4e8011c9` / docs `2a758879` history preserved. Templates/code/config **not** edited in this closeout.

Evidence (parent hashcheck PASS): [`docs/records/2026-11-15-admin-trial-safety-evidence/`](2026-11-15-admin-trial-safety-evidence/REPORT.md) — `REPORT.md` SHA256 `ba1eed6e4d31afd63eee87f1d2e33546813a542bdd2c80d7e99c9f5bed0cc47a`; index `sha256sums.txt` SHA256 `4a487034a2c7aa7e90a2390968ea4a65e8aa79a2688e46e87c11cb2705300c07`.

Still open: secure process credential fill, final actual-ID overlay hash, application-auth browser QA, scoped upload/provisioning authority, Worker upload/activation. No new owner question. No added operational authority.

## Accuracy 2026-11-15 (docs amendment; history `5087d96` not rewritten)

Mika independently verified evidence hashes, JSON `00`–`11`, and the actual owner 16:47 widget answer. No extra operational authority.

Narrow finding: **one** REST `POST /query` with **one** semicolon-joined `sql` string supports CHECK rollback of prior DML + guard CREATE in test E. That supersedes the blanket sequential-autocommit concern **only** for this observed mode. It does **not** validate the provisioner, and it does **not** infer upload or provisioning approval.

Limits that remain:

- Sanitized executor records are **not** independent live readback or raw HTTP.
- Synthetic fixture schema + noncredential marker **differ** from the exact provisioner.
- Fresh-ID refusal is **not** same-file replay idempotency.
- Mid-request interruption, Worker `D1Database.batch()`, REST `{batch:[{sql},...]}`, and `wrangler d1 execute --file` remain **UNPROVEN / UNTESTED**.
- Secure-process fill, final actual-ID overlay hash, and application-auth browser QA remain open.

On any future timeout or error: read target identity and residual state **before** retry. Do **not** clean up fixtures.

## Why the previous staging overlay was unsafe

`docs/records/wrangler.staging-artifact.jsonc` previously named existing protected UAT (`kaiyue-travel-staging`, D1 `043cd0ff`, R2 `kaiyue-offers-staging`) with `keep_vars: true`. Omitted vars would **persist** on upload. Canonical host `kaiyue-travel-staging.kai-yue.workers.dev` is in `PRODUCTION_HOSTS`, so `ENVIRONMENT=preview` would not enable password login there. That file is now a **DO_NOT_UPLOAD** baseline record. Official UAT credentials, data, and config stay untouched.

## Current baselines (do not mutate)

| Surface | Worker | D1 | R2 | Host | Notes |
|---|---|---|---|---|---|
| Production live 14:18 | `kaiyue-travel` versions `f3169afb` / `71a66a99` | `06cf879d-8fea-4088-8881-7d382e1b8c11` | `kaiyue-offers-production` | `kaiyuemacau.com` + unattached `admin.kaiyuemacau.com` | Overlay `wrangler.production-artifact.jsonc`. Public `/admin` `/login` 403. |
| Official UAT | `kaiyue-travel-staging` | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` | `kaiyue-offers-staging` | `kaiyue-travel-staging.kai-yue.workers.dev` (production-protected in this source) | Preserve. Do not upload, overwrite, seed, or loosen 403. |
| Git wrangler | `kaiyue-travel` name in repo | obsolete `069aa442` | n/a | n/a | Never upload. |
| Isolated trial | Worker **does not exist** | `06aa844b-da6b-4c37-896c-fd13dd265fe6` (16:50) | `d937f5bc01e448afa679bdbf3769ed50` empty private | workers.dev not attached (Worker never created) | Owner 16:47 approved D1/R2+probes only. Overlay still sentinel **DO_NOT_DEPLOY**. |

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

Overlay template: `docs/records/wrangler.admin-trial-artifact.jsonc` (`keep_vars: false`, sentinel D1 `00000000-0000-4000-8000-00000000a1a1`). Real D1 ID `06aa844b-da6b-4c37-896c-fd13dd265fe6` is recorded in the 16:55 closeout. **This increment did not substitute the template.** Do not upload while the sentinel remains.

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
