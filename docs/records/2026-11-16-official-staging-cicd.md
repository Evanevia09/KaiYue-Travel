# 2026-11-16 — Official staging CI/CD source (not connected)

**task_id:** `official-staging-cicd-20261116`  
**Owner:** 2026-11-16 07:05 Asia/Macau complete CI/CD after frozen staging activation; 07:17 ops activation; later browser QA; Worker-token docs confirmation; Mika HOLD at `8964c428` / base `61805431` (B1 job-scoped token, B2 substring + Worker secret-list gates)  
**Branch / PR:** `cursor/official-staging-cicd-a72c` stacked on PR #41 head `6180543` (same PR #42 / sole writer)  
**Base:** `cursor/host-role-admin-gate-a72c` (not `main`, not `staging`, not `official-staging`)  
**Status:** B1 remains closed. R1–R4 remain on this PR. Owner created git `official-staging` at `8caab939` (14:42) and connected GitHub Environment `staging` credentials. Actions run `43818219718` **failed twice** (attempt 1 14:42, attempt 2 15:14) at Wrangler 4.132.0 `versions upload` `Headers.set` invalid header value **before any candidate**; checks passed and were reused; verify/activate/smoke skipped. Staging traffic unchanged (`72e580d0` @100% / `28f8b40b`). This increment adds fail-closed credential-format gates so a malformed env token never reaches Wrangler. **Promotion of this SHA is not done.** Production automation remains fail-closed and unconnected. Not `user_accepted`. Not `released`. Do not auto-run operations after green checks.

This increment does not merge, does not push `official-staging` or `main`, does not create GitHub environments or Cloudflare tokens, does not read secrets, does not change Workers Builds, DNS, email, or Access, and does not touch production Worker `kaiyue-travel` version `71a66a99-0605-401f-9997-e6d3c3e9561b` / deployment `f3169afb-ccb7-4c52-9fde-b043cd15854d`.

## Separate states (do not collapse)

| State | Status |
|---|---|
| Staged | **Yes**, ops 2026-11-16 07:17 Asia/Macau. Worker `kaiyue-travel-staging` version `72e580d0-aeb1-4766-935a-0cb9a27631a4` @100%, deployment `28f8b40b-0ffa-45aa-ba82-601f9e429e0f`. Frozen runtime `4af0a5c`. Production untouched. |
| Browser-checked | **Partial.** Sign-in succeeded. Desktop and mobile dashboard plus Users list verified for owner super-admin and UAT staff. Profile / password min-6 UI verified. No app JS errors. **No mutations.** Staff-session revocation **untested** (no second credentials). Admin-host `/` cached marketing **unresolved**; cache-purge grant still pending. **Not all QA pass.** Not accepted. |
| CI/CD connected | **No successful upload.** Environment `staging` and a Specified-Workers Editor token were connected by the owner; run `43818219718` did not create a candidate. This source now fail-closes malformed tokens before Wrangler. Parent corrects the GitHub secret via secure UI, then promotes only the reviewed SHA. Do not report connected or deployed from this writer push. |

## What this source does

Automatic official-staging Worker activation after green checks **only** on git branch `official-staging` (not obsolete git branch `staging`, not `main`). GitHub Environment name is **`staging`**, with allowed branch pattern `official-staging` and **no** required reviewer / per-run manual approval (owner asked auto after green checks).

1. `checks` — lint, typecheck, tests, staging-URL build (`PUBLIC_SITE_URL=https://staging.kaiyuemacau.com`; runtime vars cannot repair built artifacts), overlay guard. `pnpm/action-setup` uses root `packageManager` `pnpm@10.15.0` with no explicit version override. No Cloudflare token.
2. `upload` — install/build **without** the token and with the same staging `PUBLIC_SITE_URL`. Fail-closed credential-format check, then `wrangler versions upload --strict --config deploy/official-staging/wrangler.jsonc`. Creates an inactive version. Not traffic.
3. `verify` — schema contract (no token). Fail-closed credential-format check, then structured uploaded-version candidate check (`wrangler versions view VERSION --json`): exact `DB`/`d1`/`043cd0ff…`, `OFFERS_BUCKET`/`r2_bucket`/`kaiyue-offers-staging`, `ASSETS` name/type, Worker-first from recorded `resources.script_runtime.assets.raw_run_worker_first`, overlay `plain_text` vars, `compatibility_date` + `nodejs_compat`, `BETTER_AUTH_SECRET` `secret_text` **name/type only**. Rejects malformed/missing/wrong candidate, Access/temp/password/Resend names, production/obsolete/trial D1. Current-Worker `secret list` is **not** this gate.
4. `activate` — fail-closed credential-format check, then `wrangler versions deploy VERSION@100% -y` on `kaiyue-travel-staging`, then pinned Wrangler 4.132.0 `deployments status --json` (not `versions deployments status`) readback of deployment id / version / 100% **before** smoke. Command failure is fail-stop: the command may have committed remotely; remote traffic is unknown until readback; no blind retry; no claim that previous traffic remains.
5. `smoke` — public `https://staging.kaiyuemacau.com` 200, public `/login` 403, `https://admin-staging.kaiyuemacau.com/login` 200 Admin sign-in. Admin-host `/` is **not** asserted. No D1 query/migrate/bootstrap. No permission widening.

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
- This is **not** a live D1 readback and **not** tamperproof. Editing the contract together with source SQL can still pass. Remote drift after attestation is undetected until the next reviewed contract update. Those limits are explicit; they are not a silent skip.

## Overlay

Maintained generated source: `deploy/official-staging/wrangler.jsonc` from `deploy/official-staging/constants.json`. Do **not** upload git `wrangler.jsonc` (obsolete D1 `069aa442`). `keep_vars: false`. Secrets omitted. HTML Worker-first paths match `HTML_WORKER_FIRST_PATHS`.

## Workflow pins, permissions, secrets

| Item | Value |
|---|---|
| Workflow | `.github/workflows/official-staging.yml` |
| Triggers | `push` branches `[official-staging]`; `workflow_dispatch` (non-release refs fail closed) |
| Permissions | `contents: read` |
| Environment | GitHub Environment **`staging`** on upload / verify / activate (**not connected in this PR**). No required reviewer. Allowed branch pattern `official-staging`. `CLOUDFLARE_API_TOKEN` is step-scoped to upload, candidate-view, and activate only. |
| Actions | `actions/checkout` v4.2.2 `11bd71901bbe5b1630ceea73d27597364c9af683`; `pnpm/action-setup` v4.1.0 `a7487c7e89a18df4991f7f222e4898a00d66ddda`; `actions/setup-node` v4.4.0 `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| Wrangler | lockfile + `package.json` pin **4.132.0** |
| GitHub secrets allowed (names only, later) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Forbidden GitHub secrets | `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, passwords, `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN` |
| Production | `.github/workflows/production.yml` always `exit 1`; `environment: production` job is `if: false`; no Cloudflare credentials; no `main` trigger. GitHub Environment `production` must require an **owner reviewer** in the UI before any future enablement; the workflow stays disabled/fail-closed with no credentials now. |

## Access prerequisites (parent / owner admin)

GitHub environment/secrets APIs are unavailable to this writer. Do not change branch protection here. Workers Builds GET was 403, so that connection is **not verified absent**; do not change it.

Remaining after failed run `43818219718` (none claimed complete by this writer):

1. GitHub Environment **`staging`** and a Specified-Workers Editor token for `kaiyue-travel-staging` already exist from owner UI work; do not recreate production scope or add D1 Edit.
2. Parent re-saves GitHub `staging` `CLOUDFLARE_API_TOKEN` as a **single-line raw token** (no wrap, quotes, `Bearer ` prefix, or CR/LF) with `CLOUDFLARE_ACCOUNT_ID=33ecc75158a1cdd23ba1a62eb70c5103`. Never put `BETTER_AUTH_SECRET` or passwords in GitHub.
3. After **independent re-review of this source**, parent (owner/admin) promotes **only the reviewed SHA** to protected `official-staging`. This writer must not push `official-staging` or `main`.
4. A green upload that creates a Worker Version ID is the first real connection evidence. Failed run `43818219718` is not that evidence.

## Failed attempts 1–2 (run 43818219718) and diagnosis

SHA `8caab939daf570928f3c0574190f3e36d83cc821`. Checks: 239 tests / lint / type / staging-URL build / guard passed (attempt 2 reused). Upload token-free build passed. Pinned Wrangler 4.132.0 `versions upload` failed `Headers.set` invalid header value before any candidate. Env showed token and account present (masked). Not 401/403. Verify/activate/smoke skipped. Staging remained `72e580d0` @100% / `28f8b40b`. Production `71a66a99` / `f3169afb` untouched.

**Confirmed from source + dummy offline repro (no real secrets, no Cloudflare calls):** workflow and `official-staging-upload.mjs` pass `CLOUDFLARE_API_TOKEN` through unchanged. Wrangler 4.132.0 `validateAuthorizationHeaderValue` does not reject CR/LF. Bundled undici `7.29.0` strips leading/trailing CR/LF then `Headers.set` rejects any remaining CR/LF/NUL. Trailing-newline-only dummy does **not** reproduce this error. Leading or interior LF dummy does, locally, with no network. A clean latin1 dummy reaches HTTP construction (dead localhost). Ellipsis/non-latin1 is a different Wrangler UserError, not this log.

**Not established:** exact stored GitHub secret bytes, or that a dashboard/clipboard/page-copy introduced the interior LF. A replacement token that fails the same way does not prove a clean secret or a Wrangler defect for valid tokens.

This source **does not silently trim**. Upload, candidate-check, and activate refuse missing/malformed/copied-snippet tokens and a mismatched account id **before** spawning Wrangler. Errors are categorical and must not print token or header values. Wrangler pin stays 4.132.0.

No production token is planned. GitHub Environment `production` should require an owner reviewer in the UI; `.github/workflows/production.yml` stays fail-closed, unconnected, and without credentials.

## Verification performed

- Source/YAML/security guards: overlay `--check`, schema contract (including not-tamperproof declaration), `official-staging-guard.mjs` (job-scoped token forbidden; packageManager pnpm; staging build URL; `deployments status` argv; credentialed scripts must use `spawnWrangler`).
- Vitest `tests/integration/official-staging-cicd.test.ts`: recorded `raw_run_worker_first` fixture, activation fixture, pinned Wrangler 4.132.0 `--help`/argv construction, and dummy credential-format cases (clean/missing/leading+interior+trailing CR/LF/NUL/non-latin1/quoted/copy-snippet). Invalid env does not start Wrangler and diagnostics contain no dummy token/header fragments.
- Lint, typecheck, full test suite, and `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com pnpm build` on this branch.
- **Not** verified: GitHub secret is now a single-line raw token, Specified-Workers Editor capability of the replacement token, live uploaded-version JSON from Cloudflare, live D1 schema at CD time, staff-session revocation, admin-host `/` cache, production protections. Green checks and this writer push are not operations approval or a deployed fix.

## Not done

- Push `official-staging` or `main` from this writer
- Correct the GitHub `staging` secret (parent / owner admin, secure UI)
- Claim run `43818219718` uploaded or activated
- Enable workflows by a release-branch push from this increment
- Production credentials or production CD
- Rewire or inspect-change Workers Builds
- Emails, DNS, Access, cache purge, vault
- Merge to `main`
