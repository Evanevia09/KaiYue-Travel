# 2026-11-16 — Official staging CI/CD (completed on `2a270e59`)

**task_id:** `github-staging-cd`  
**event_id:** `kai-yue-official-staging-cicd-20261116-completed-01`  
**Owner / parent operator:** 2026-11-16 07:05–16:45 Asia/Macau. UI token work, non-force FF of `official-staging`, and browser QA are parent/owner-admin facts, not this writer.  
**Branch / PR:** `cursor/official-staging-cicd-a72c` / PR #42 (docs closeout on this task branch only)  
**Base:** `cursor/host-role-admin-gate-a72c` (not `main`)

## SHA distinction (do not collapse)

| SHA | Role |
|---|---|
| `2a270e599e1f596aa6e383607ba1429fdb9b6f09` | Implemented + Mika 16:32 PASS + **deployed** official-staging CD. Worker version `3e027a63-b969-4e1b-b618-68269a29a33b` (number 14) @100%, deployment `6cb6b664-9a60-498a-8030-5130bb359e5c`. |
| This docs commit on PR #42 | **Not deployed.** Do not push it to `official-staging` or `main`. |

`official-staging` / default is `2a270e59`. `main` remains `037b93ad704ce4ed45d0148ad22a7a05cf030a81`. Production Worker `kaiyue-travel` remains `71a66a99-0605-401f-9997-e6d3c3e9561b` @100% on `f3169afb-ccb7-4c52-9fde-b043cd15854d`. Not `user_accepted`. Not production `released`.

## Separate states (do not collapse)

| State | Status |
|---|---|
| Staged | **Yes**, CD 2026-11-16 16:37 Asia/Macau. Worker `kaiyue-travel-staging` version `3e027a63-b969-4e1b-b618-68269a29a33b` @100%, deployment `6cb6b664-9a60-498a-8030-5130bb359e5c`, source `2a270e59`. Independent Cloudflare GET matches. Previous live `72e580d0` / `28f8b40b` superseded on staging only. Production untouched. |
| CI/CD connected | **Yes** for official-staging. Run [43832384537](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/43832384537) attempt 1: started 16:34:57, completed success 16:37:12 Asia/Macau. Checks / upload / verify / activate PASS. Failed run `43818219718` is historical. |
| Browser-checked | **Partial**, parent 16:44 readonly. Staging marketing 200 desktop + 390×985 mobile; nav collapse / form stack; no app console / page errors / mixed content. Public `/login` and `/api/auth/get-session` 403 (expected; only 403 resource console messages). `admin-staging` `/login` 200 empty fields desktop/mobile. Unauth `/admin` redirects to login, no private content. **No authenticated session**, so dashboard / Users / sign-in flow **not retested**. Admin-host `/` still cached marketing 200 (known **separate** gate; no purge permission / retry). HTTPS, no certificate errors, no visible obvious secrets. Staff-session / revocation full UAT **pending**. Production admin **not attached**. |
| Product acceptance | Owner delivered success 16:45. Full product acceptance / production release **not granted**. |

## Completed connection (parent / owner admin)

- Mika 16:32 PASS of `2a270e59` (`/workspace/kaiyue-pr42-review/2a270e59-review/REVIEW.md`, parent box path; supplied summary sufficient). Owner 16:22 “fix it common dont stop” authorized follow-through.
- Owner GitHub admin **non-force FF** `official-staging` `8caab939` → `2a270e59` at 16:34:55 Asia/Macau. Ruleset `27353819` remains exact `official-staging` restrict create/update/delete/force, owner/admin Always only, no app. Environment `27422732670` remains exact branch `official-staging`, secret **names only**.
- Parent created v3 token 16:23 under the same Specified-Workers Editor-only policy and replaced the GitHub `staging` env secret. Earlier exact-Copy control belonged to curl/`Bearer` block; corrected to Copy-to-clipboard raw token on the labelled field. **No secret values read or stored-byte proof.** Successful upload is authentication proof. Account ID / env policy unchanged. Original and v2 tokens **retained**; do **not** revoke or clean up. No wider permissions, no `main`/prod/D1/cache/mail/Access mutations.

Sanitized success evidence (parent-collected 16:38): `docs/records/2026-11-16-official-staging-cicd-success/SUCCESS-20261116-1638.md` SHA256 `411da0a1b7c1d844b6a7ab8ca4aa2c14419c83fc016ccdee78f6a4f744ddd40e` (matches parent index). Parent hash index `docs/records/2026-11-16-official-staging-cicd-success/SHA256SUMS` also lists run-status / sanitized job excerpts / workers-state that remain parent-local (not supplied to this writer).

## What this source does

Automatic official-staging Worker activation after green checks **only** on git branch `official-staging` (not obsolete git branch `staging`, not `main`). GitHub Environment name is **`staging`**, allowed branch pattern `official-staging`, **no** required reviewer.

1. `checks` — lint, typecheck, tests, staging-URL build (`PUBLIC_SITE_URL=https://staging.kaiyuemacau.com`), overlay guard. `pnpm/action-setup` uses root `packageManager` `pnpm@10.15.0`. No Cloudflare token.
2. `upload` — token-free build with the same `PUBLIC_SITE_URL`. Fail-closed credential-format check, then `wrangler versions upload --strict --config deploy/official-staging/wrangler.jsonc`. Inactive candidate. Not traffic until activate.
3. `verify` — schema **contract** (source hashes of attested `0001`–`0010` only; **not** a live D1 query, **not** tamperproof). Fail-closed credential-format check, then structured candidate check (`wrangler versions view VERSION --json`): exact staging bindings, Worker-first `raw_run_worker_first`, overlay vars, `BETTER_AUTH_SECRET` `secret_text` **name/type only**.
4. `activate` — fail-closed credential-format check, then `wrangler versions deploy VERSION@100% -y`, then Wrangler 4.132.0 `deployments status --json` 100% readback **before** smoke.
5. `smoke` — credential-free HTTP: public staging 200, public `/login` 403, `admin-staging` `/login` 200. Admin-host `/` is **not** asserted.

`workflow_dispatch` or any ref other than `refs/heads/official-staging` fails closed. Concurrency does not cancel an in-flight activation. Token stays step-scoped. No silent trim. Wrangler pin **4.132.0**. Production workflow stays fail-closed with no credentials.

## Run 43832384537 (success)

- Attempt 1, event `push`, SHA `2a270e599e1f596aa6e383607ba1429fdb9b6f09`, actor Evanevia09.
- `refuse-other-refs` skipped (expected). `checks` 16:34:59–16:36:01 PASS. `upload` 16:36:06–16:36:26 PASS, candidate `3e027a63-b969-4e1b-b618-68269a29a33b`. `verify` 16:36:31–16:36:45 PASS (schema source-hash attestation; structured candidate metadata including BetterAuth name/type; no D1 query). `activate` 16:36:50–16:37:11 PASS; deploy 16:37:06; readback 100% on deployment `6cb6b664-9a60-498a-8030-5130bb359e5c`; independent CF GET matches. Credential-free HTTP smoke PASS.
- Logs showed token/account present as masked `***` only. No format/header errors. No token values.

## Failed attempts 1–2 (run 43818219718) — historical

SHA `8caab939`. Checks passed; Wrangler 4.132.0 `versions upload` `Headers.set` invalid header **before any candidate**; not 401/403. Trailing-newline-only dummy does **not** reproduce; leading/interior LF does. Clipboard origin **unproven**. Source fix: fail-closed preflight, no trim, pin 4.132.0, categorical errors without values/headers.

## Overlay, schema, pins

Maintained generated overlay `deploy/official-staging/wrangler.jsonc`. Do **not** upload git `wrangler.jsonc`. Schema contract attests exact `0001`–`0010` source hashes; CI must not `d1 execute` / `d1 migrations apply`; D1 Edit is not authorized. Actions SHAs and Wrangler **4.132.0** unchanged. Allowed GitHub secret **names**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Forbidden: Worker auth secrets, passwords, Access values.

## Verification performed

- Parent: Mika 16:32 PASS of deployed SHA `2a270e59`; owner FF of `official-staging`; Actions run 43832384537 success; independent CF GET of version 14 @100%; 16:44 readonly browser as above; user-delivered success 16:45.
- This writer: docs closeout only on PR #42. Did not push `official-staging`/`main`, did not dispatch/rerun, did not read secrets, did not mutate D1/cache/mail/Access/prod.
- **Not** verified: authenticated dashboard/Users/sign-in (no session this pass), staff-session revocation, admin-host `/` cache purge, production admin attach, stored GitHub secret bytes, `user_accepted`, production `released`.

## Not done

- Push this docs commit to `official-staging` or `main`
- Merge PR #42 to `main`
- Production CD / production credentials
- Cache purge, D1 query/migrate, mail, Access, vault, token revoke/cleanup
- Full product acceptance / production release
