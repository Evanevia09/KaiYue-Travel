# 2026-11-16 — Official staging CI/CD source (not connected)

**task_id:** `official-staging-cicd-20261116`  
**Owner:** 2026-11-16 07:05 Asia/Macau complete CI/CD after frozen staging activation; 07:17 ops activation; later browser QA; Worker-token docs confirmation  
**Branch / PR:** `cursor/official-staging-cicd-a72c` stacked on PR #41 head `6180543`  
**Base:** `cursor/host-role-admin-gate-a72c` (not `main`, not `staging`, not `official-staging`)  
**Status:** implemented / tested / pushed as workflow-only source. **CI/CD is not connected.** `official-staging` was not pushed. Production automation remains fail-closed and unconnected. Not `user_accepted`. Not `released`.

This increment does not merge, does not push `official-staging` or `main`, does not create GitHub environments or Cloudflare tokens, does not read secrets, does not change Workers Builds, DNS, email, or Access, and does not touch production Worker `kaiyue-travel` version `71a66a99-0605-401f-9997-e6d3c3e9561b` / deployment `f3169afb-ccb7-4c52-9fde-b043cd15854d`.

## Separate states (do not collapse)

| State | Status |
|---|---|
| Staged | **Yes**, ops 2026-11-16 07:17 Asia/Macau. Worker `kaiyue-travel-staging` version `72e580d0-aeb1-4766-935a-0cb9a27631a4` @100%, deployment `28f8b40b-0ffa-45aa-ba82-601f9e429e0f`. Frozen runtime `4af0a5c`. Production untouched. |
| Browser-checked | **Partial.** Sign-in succeeded. Desktop and mobile dashboard plus Users list verified for owner super-admin and UAT staff. Profile / password min-6 UI verified. No app JS errors. **No mutations.** Staff-session revocation **untested** (no second credentials). Admin-host `/` cached marketing **unresolved**; cache-purge grant still pending. **Not all QA pass.** Not accepted. |
| CI/CD connected | **No.** Source and guards only. GitHub environment **`staging`** (allowed branch `official-staging`, **no** required reviewer — automatic after green checks) is PM UI follow-up. No Cloudflare token exists yet. Do not report connected. |

## What this source does

Automatic official-staging Worker activation after green checks **only** on git branch `official-staging` (not obsolete git branch `staging`, not `main`). GitHub Environment name is **`staging`**, with allowed branch pattern `official-staging` and **no** required reviewer / per-run manual approval (owner asked auto after green checks).

1. `checks` — lint, typecheck, tests, staging-URL build, overlay guard, schema **contract**, Wrangler 4.132.0 dry-run. No Cloudflare token.
2. `upload` — `wrangler versions upload --strict --config deploy/official-staging/wrangler.jsonc`. Creates an inactive version. Not traffic.
3. `verify` — uploaded-version binding/target check, Worker secret **names** only (`BETTER_AUTH_SECRET`), schema contract again.
4. `activate` — `wrangler versions deploy VERSION@100% -y` on `kaiyue-travel-staging`.
5. `smoke` — public `https://staging.kaiyuemacau.com` 200, public `/login` 403, `https://admin-staging.kaiyuemacau.com/login` 200 Admin sign-in. Admin-host `/` is **not** asserted.

`workflow_dispatch` or any ref other than `refs/heads/official-staging` fails closed (`refuse-other-refs`). Concurrency does not cancel an in-flight activation.

## Schema safety without D1 query

Cloudflare docs (2026-09-15):

- [Grant teammates and agents access to specific Workers](https://developers.cloudflare.com/changelog/post/2026-09-15-granular-worker-permissions/)
- [Workers roles](https://developers.cloudflare.com/workers/authorization/workers/)

Specified-Workers **Editor** covers `versions upload`, `versions deploy`, and deploying with D1/R2 **bindings**. Separate D1 permission is required only to query D1. This pipeline therefore **must not** call `wrangler d1 execute` or `d1 migrations apply`. Adding D1 Edit or account-wide Workers Editor is not authorized.

Fail-closed substitute: `deploy/official-staging/schema-contract.json`.

- Attests the **exact applied set `0001`–`0010`** (order, names, and SHA-256 of source bytes). `0001`–`0008` were already on D1 `043cd0ff`; `0009`/`0010` were applied 07:17.
- Pins official D1 `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` and Worker `kaiyue-travel-staging`.
- Tamper guards fail closed on extra/missing files, reordering, duplicate names, non-sequential `NNNN_*.sql`, or hash edits.
- New or changed SQL fails until a human updates the contract after a reviewed out-of-band apply.
- This is **not** a live D1 readback. Remote drift after attestation is undetected until the next reviewed contract update. That limit is explicit; it is not a silent skip.

## Overlay

Maintained generated source: `deploy/official-staging/wrangler.jsonc` from `deploy/official-staging/constants.json`. Do **not** upload git `wrangler.jsonc` (obsolete D1 `069aa442`). `keep_vars: false`. Secrets omitted. HTML Worker-first paths match `HTML_WORKER_FIRST_PATHS`.

## Workflow pins, permissions, secrets

| Item | Value |
|---|---|
| Workflow | `.github/workflows/official-staging.yml` |
| Triggers | `push` branches `[official-staging]`; `workflow_dispatch` (non-release refs fail closed) |
| Permissions | `contents: read` |
| Environment | GitHub Environment **`staging`** on upload / verify / activate (**not connected in this PR**). No required reviewer. Allowed branch pattern `official-staging`. |
| Actions | `actions/checkout` v4.2.2 `11bd71901bbe5b1630ceea73d27597364c9af683`; `pnpm/action-setup` v4.1.0 `a7487c7e89a18df4991f7f222e4898a00d66ddda`; `actions/setup-node` v4.4.0 `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| Wrangler | lockfile + `package.json` pin **4.132.0** |
| GitHub secrets allowed (names only, later) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Forbidden GitHub secrets | `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, passwords, `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` |
| Production | `.github/workflows/production.yml` always `exit 1`; `environment: production` job is `if: false`; no Cloudflare credentials; no `main` trigger. GitHub Environment `production` must require an **owner reviewer** in the UI before any future enablement; the workflow stays disabled/fail-closed with no credentials now. |

## Access prerequisites (PM / GitHub UI later — not done)

GitHub environment/secrets APIs are unavailable to this agent. Repo is public; owner is admin; `main` is unprotected (**do not change branch protection here**). Workers Builds GET was 403, so that connection is **not verified absent**; do not change it.

Exact remaining connection steps (none of these are claimed complete):

1. In GitHub UI, create Environment **`staging`** with **no** required reviewer, deployment branches / allowed pattern `official-staging` only, and **no** Worker auth secrets.
2. In Cloudflare, create an **account-owned** API token, scope **Specified Workers**, Worker `kaiyue-travel-staging` only, role **Editor**. Do not include production Worker `kaiyue-travel`. Do not add D1 Edit. PM is reviewing a custom staging-only Editor token form; **no token has been created yet**.
3. Put `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID=33ecc75158a1cdd23ba1a62eb70c5103` in GitHub Environment `staging`. Never put `BETTER_AUTH_SECRET` or passwords in GitHub.
4. After **Mika review** and credential connection verified, create and push branch `official-staging` from the approved head. **Do not push it from this increment.** Security review is required before enable.
5. First green run on that branch is the first real connection evidence. Until then, CI/CD is source-only.

No production token is planned. GitHub Environment `production` should require an owner reviewer in the UI; `.github/workflows/production.yml` stays fail-closed, unconnected, and without credentials.

## Verification performed

- Source/YAML/security guards: overlay `--check`, schema contract, `official-staging-guard.mjs`, Vitest `tests/integration/official-staging-cicd.test.ts`.
- Lint, typecheck, and the existing test suite on this branch.
- **Not** verified: GitHub environment exists, token exists, token actually has Specified-Workers Editor, first Actions run, live D1 schema at CD time, staff-session revocation, admin-host `/` cache, production protections, Workers Builds absence.

## Not done

- Push `official-staging`
- Create GitHub environments or secrets
- Create or store Cloudflare tokens
- Enable workflows by a release-branch push
- Production credentials or production CD
- Rewire or inspect-change Workers Builds
- Emails, DNS, Access, cache purge, vault
- Merge to `main`
