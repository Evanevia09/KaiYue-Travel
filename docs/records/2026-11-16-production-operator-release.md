# 2026-11-16 — Production operator release candidate (review packet)

Status: `probe_complete` for source and local evidence. Not reviewed, not staged, not deployed, not `user_accepted`, not `released`. Main and production remain on HOLD until the exact candidate review passes.

## Exact refs

- Base (`main`): `037b93ad` (#31). It is an ancestor of the candidate; the merge is a fast-forward.
- Source checkpoint: `cd9631d6` (PR #44 docs head; staged runtime `dca860c5` plus docs).
- Code candidate: `696c2bd8` on `cursor/production-operator-release-a72c`. Later commits on that branch are docs-only; the PR states the exact head.
- Live production rollback: Worker `kaiyue-travel` version `71a66a99` (deployment `f3169afb`), source annotation `9ff81925`.

## Source changes (functional)

1. **Operator-row admission.** On `admin.kaiyuemacau.com` and production marketing hosts, `requireAdmin` admits only an enabled `admin_operator` row (`super_admin` or `staff`), for both password and Access sessions. Unprovisioned, missing, or disabled accounts fail closed. `ADMIN_EMAILS` / `ADMIN_PRIMARY_EMAIL` neither admit nor exclude there. Last-super PATCH guard and `0010` DELETE trigger unchanged. No public signup, no Cloudflare Access requirement.
2. **Mail switch.** Notifications send only when `NOTIFICATIONS_ENABLED` is exactly `true` (and the existing explicit production-site check passes). The production overlay sets `false`.
3. **Provisioner.** `scripts/provision-primary-admin.mjs` no longer needs `BETTER_AUTH_SECRET` (it was only compared). It uses the Better Auth `hashPassword`, enforces 12–128, and adds production-only `--preflight-operators` and `--write-bootstrap-sql`. Both are pinned to the configured primary; trial and other emails are refused. Bootstrap uses a temporary `CHECK(ok = 1)` guard table with preconditions repeated in each write: exactly one user and one credential, and the directory either empty or already holding this primary as an enabled `super_admin`. It inserts only into an empty directory, writes one `operator_created` audit row, and replay inserts nothing.
4. **Production overlay** `deploy/production/wrangler.jsonc`: `kaiyue-travel`, account `33ecc`, D1 `06cf879d`, R2 `kaiyue-offers-production`, `keep_vars` false, `run_worker_first` true, no ACCESS_*/ADMIN_* vars.
5. **Fail-closed default configs.** Root and `apps/web` `wrangler.jsonc` use disabled names and a placeholder account, and bind no real D1/R2. Retired D1 `069aa442`, staging R2, and the old workers.dev URL are removed.

## Evidence (local, 2026-11-16)

- `pnpm lint`, `pnpm typecheck`, `pnpm test`: 40 files / 273 tests pass. Key files: `production-operator-release.test.ts`, `admin-production-host.test.ts`, `admin-password-min.test.ts`, `access-jwt.test.ts`, `notifications-staging.test.ts`, `root-wrangler-fail-closed.test.ts`.
- Covered: staff admitted but Users 403; super admin Users 200; missing, unprovisioned, or disabled denied; another `ADMIN_PRIMARY_EMAIL` neither blocks super nor admits a non-operator; production minimum 12 with the staging var at 6 (create and change both 422); bootstrap replay is a no-op, an interrupted replay leaves one audit row, and every bad prestate fails closed.
- `PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build`, then Wrangler 4.132.0 `versions upload --dry-run --strict --config deploy/production/wrangler.jsonc`. Bindings: production D1/R2 only, `NOTIFICATIONS_ENABLED=false`.
- Local `wrangler dev` probe of that overlay:
  - `admin.kaiyuemacau.com`: `/` and `/index.html` return 302 to `/login` (no-store); `/admin*` 302 to `/login`; admin API 401.
  - Apex/www: `/admin*`, `/login` and the admin API return 403; `/` renders marketing.
- A real root `wrangler deploy` with an invalid token targeted `/accounts/000…0/workers/services/kaiyue-root-config-disabled` and failed. The dry run shows only an ASSETS binding.
- No-loss check against `9ff81925` and `cd33cf8c`: no files deleted, and public assets are identical. Lines removed relative to `9ff81925` are the `9ff81925`→`cd33cf8c` evolution, which the candidate carries byte-identically. Lines removed relative to `cd33cf8c` are the mandatory-Access gate, plus a middleware rewrite whose security headers, `/admin` noindex/no-store, special-offers no-store and content-language behaviors remain.
- Parent-verified, not by this writer: dca860c staging browser UAT at 18:13 (staff, role change, disable, session revocation). Final fixture disabled at 18:18 after one inadvertent re-enable and a compensating disable. That UAT covers `dca860c`, not this candidate. Password-change and reset UI UAT was not covered.

Artifacts (not in git): `/opt/cursor/artifacts/kaiyue-production-candidate-696c2bd8/`, containing the dry-run outputs, `SHA256SUMS`, `dist-client.SHA256SUMS`, the local probe, the invalid-token deploy attempt, and the no-loss numstat.

## Minimal remaining gates

1. Exact review of the candidate head.
2. Promote the candidate to official staging (changed runtime), then bounded browser UAT, including profile password change.
3. Production, run by the parent, in this order:
   - backup/export of `06cf879d`;
   - `--preflight-operators`;
   - apply `0009` + `0010`;
   - CREATE with the owner password supplied through `PRIMARY_ADMIN_PASSWORD` in the local process env only;
   - bootstrap SQL;
   - re-preflight;
   - new `BETTER_AUTH_SECRET`, generated locally, as a Worker secret;
   - upload and deploy the overlay version;
   - attach `admin.kaiyuemacau.com`;
   - verify.
4. Production mail remains off; enabling it is a separate reviewed gap.

Rollback: redeploy version `71a66a99` at 100% and detach the admin hostname. `0009`/`0010` are additive and are ignored by the old runtime.
