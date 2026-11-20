# 08 — Environments, Deployment, and Operations

## Environments

| Environment | Purpose | Data and integrations |
|---|---|---|
| Local | Development and automated tests | Local/emulated D1; email stub or approved test recipient |
| Preview | Pull-request review | Separate preview database or isolated test data; test email mode/domain |
| Staging | Release candidate and stakeholder acceptance | Separate D1 and Access policy; production-like configuration, no production customer data |
| Production | Live site and staff operation | Production D1, Email Service sending domain, Access policy, monitoring |

Never share D1 databases, email recipients, or secrets across production and non-production. Preview environments must not send real customer/staff mail.

Repo-root `wrangler.jsonc` and `apps/web/wrangler.jsonc` are fail-closed (2026-11-16): disabled Worker names, placeholder account `00000000000000000000000000000000`, no `workers_dev`/preview URLs, and no retired D1 `069aa442` or staging R2. The Astro build copies `apps/web/wrangler.jsonc` into `dist/server/wrangler.json` and `apps/web/.wrangler/deploy/config.json`, so that file must stay non-deployable too. A bare `wrangler deploy` / `versions upload` or a leftover Workers Builds connection therefore cannot update `kaiyue-travel` or bind real data. Only `deploy/official-staging/wrangler.jsonc` and `deploy/production/wrangler.jsonc` target real Workers (`tests/integration/root-wrangler-fail-closed.test.ts`). The 2026-11-16 18:11 parent API preflight found no Workers Builds config, triggers, or builds on the three relevant accounts; a residual GitHub-app repo connection is not API-readable. Do not delete legacy Workers or reconnect integrations from source work.

Intended official-staging CD is GitHub Actions `.github/workflows/official-staging.yml` on git branch `official-staging` (not obsolete git branch `staging`, not `main`), using generated overlay `deploy/official-staging/wrangler.jsonc` (account `33ecc`, Worker `kaiyue-travel-staging`, D1 `043cd0ff`, R2 `kaiyue-offers-staging`, `keep_vars` false, HTML Worker-first). `pnpm/action-setup` follows root `packageManager` `pnpm@10.15.0`. Checks and upload builds set `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com` (Astro `site` is build-time; overlay runtime vars cannot repair it). Upload is `wrangler versions upload`; activation is a later `versions deploy VERSION@100%` after structured uploaded-version candidate validation (`wrangler versions view --json`) and the schema-**contract** gate. Candidate validation requires exact official binding names/types/IDs, overlay vars, compatibility, ASSETS, `run_worker_first` **true** (the historical `/*` path array stayed host-agnostic asset-cacheable on live `2a270e59`), and `BETTER_AUTH_SECRET` name/type only. Current-Worker `secret list` is not the candidate-preservation gate. Activation readback is Wrangler 4.132.0 `deployments status --json`, not `versions deployments status`. `CLOUDFLARE_API_TOKEN` is limited to upload, candidate-view, and activate steps. Those steps fail closed if the env token is missing, has CR/LF/NUL/non-latin1 bytes, looks like a quoted/Bearer copy snippet, or the account id is not the overlay account; they do not trim or print the value, and they do not spawn Wrangler until the check passes. GitHub Environment name is **`staging`**, allowed branch pattern `official-staging`, **no** required reviewer (automatic after green checks). Current live official-staging (2026-11-20) is git `04d98ae0b2e3d71f93b5db881affeabbfe327080` (run `44656548128` SUCCESS; Worker version `8ac4fe0e` @100% / deployment `6023ba11`; record `docs/records/2026-11-20-staging-checkpoint-production-prep/REPORT.md`). Historical first CD SHA was `2a270e599e1f596aa6e383607ba1429fdb9b6f09` (run `43832384537` SUCCESS; Worker version `3e027a63` @100% / deployment `6cb6b664`). Failed run `43818219718` is historical. Later docs commits on PR #42 are **not** that deployed SHA and must not be pushed to `official-staging` by the source writer. Staging cache/readiness source lives on `cursor/staging-cache-readiness-a72c` and is not live until a reviewed promote. Boolean `run_worker_first` true is required to enter the Worker but is not the admin-root gate: `@astrojs/cloudflare` can still `ASSETS.fetch` prerendered `/` and `/index.html` before middleware, so `pnpm build` wraps `dist/server/entry.mjs` with `createWorkerFetch`. HTTP smoke asserts admin-staging `/` is a real redirect to that origin's exact `/login` and is not marketing HTML. Staging `ENVIRONMENT=production` is intentional host-role design; notifications send only when `PUBLIC_SITE_URL` is an explicit production site (`kaiyuemacau.com` / `www.kaiyuemacau.com`), not from that flag, not from missing/malformed URLs, and not from workers.dev aliases. Schema compatibility is `deploy/official-staging/schema-contract.json` (source SQL hashes of exact applied `0001`–`0010`; not a live D1 readback; not tamperproof). CI must not query D1 or apply migrations; a Worker-only Editor token cannot query D1, and D1 Edit is not authorized. Record: `docs/records/2026-11-16-official-staging-cicd.md`.

The reviewed production release overlay is `deploy/production/wrangler.jsonc` (account `33ecc`, Worker `kaiyue-travel`, D1 `06cf879d`, R2 `kaiyue-offers-production`, `keep_vars` false, `run_worker_first` true, `NOTIFICATIONS_ENABLED=false`; record `docs/records/2026-11-16-production-operator-release.md`). Email sends only when `NOTIFICATIONS_ENABLED` is exactly `true` in addition to the existing production-site check. The older packaging template is `docs/records/wrangler.production-artifact.jsonc`: account `33ecc`, D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, R2 `kaiyue-offers-production`, HTML Worker-first (`run_worker_first` path array so dedicated-admin `/` can redirect; hashed assets stay asset-first). Official UAT (`kaiyue-travel-staging`, D1 `043cd0ff`, R2 `kaiyue-offers-staging`) is recorded as **DO_NOT_UPLOAD** in `docs/records/wrangler.staging-artifact.jsonc` for the protected UAT baseline; the generated official overlay is the upload config. Isolated admin trial, if later approved, uses a **new** Worker/D1/R2 (`docs/records/wrangler.admin-trial-artifact.jsonc` and `docs/records/2026-11-15-isolated-admin-trial-plan.md`) — not UAT, not production. Do **not** upload git `wrangler.jsonc`. Production password minimum stays 12; `ADMIN_STAGING_TEST_PASSWORD_MIN` must not appear in production overlays and has no effect on production hosts even if present. GitHub Actions `ci.yml` does not run wrangler. `.github/workflows/production.yml` is fail-closed and unconnected (no credentials, no `main` trigger). Do not retry or cancel Workers Builds `41386f`. Compact reconcile map: `docs/records/2026-11-15-main-reconcile-dashboard.md`. Super-admin user management (`0009_admin_operator.sql`, `0010_admin_operator_last_super.sql`, plus staging-only preflight/provision SQL) shipped to official staging D1 out of band on 2026-11-16 07:17; apply `0009`/`0010` to production D1 `06cf879d` only in the reviewed release sequence in `docs/records/2026-11-16-production-operator-release.md`, never the staging-only preflight/provision SQL, and never from CI. Record: `docs/records/2026-11-15-super-admin-user-management.md`.

## Configuration and secrets

### Public build/runtime configuration

- Canonical site URL, public support contact, business timezone, enabled locale(s), optional analytics site ID.
- Only values safe for every visitor may use a public prefix or enter browser bundles.

### Server bindings and secrets

- D1 database binding/identifier.
- Email Service: onboarded sending subdomain `notify.kaiyuemacau.com`, `EMAIL` send_email binding, sender `NOTIFY_FROM_EMAIL`, approved staff recipient `NOTIFY_STAFF_TO`, optional `NOTIFY_ALLOWED_RECIPIENTS` lock (required on staging).
- Cloudflare Access audience/team-domain verification values where needed.
- Anti-abuse/Turnstile secret if enabled.
- Error monitoring DSN/token, with PII scrubbing configured.

Store secrets in Cloudflare/GitHub secret stores as applicable. Provide `.env.example` with names and descriptions only. Never commit live values, print them in CI, or expose them through public config endpoints.

## Git and review workflow

1. Create a short-lived branch from the protected default branch.
2. Open a pull request with scope, screenshots for UI work, migration notes, and verification evidence.
3. Automated checks run: install-lock integrity, formatting/linting, type check, unit/integration tests, production build, and relevant end-to-end smoke tests.
4. Cloudflare creates an isolated preview. Product/content changes receive business review; data/privacy/security changes receive the appropriate human review.
5. Required checks and approval pass before merge.
6. Merge deploys to staging or production according to the selected release policy.

Recommended release policy: check-only GitHub Actions on pull requests (`ci.yml`); automatic official-staging Worker activation after green checks on git branch `official-staging`, using GitHub Environment `staging` with **no** required reviewer; production remains explicit owner approval. `.github/workflows/production.yml` stays fail-closed and unconnected with no credentials. GitHub Environment `production` must require an owner reviewer in the UI before any future enablement. Do not treat default-branch merge or obsolete git branch `staging` as official-staging CD.

## Database migration workflow

- Create numbered, reviewed, forward migrations; never modify an already-applied shared migration.
- CI validates migrations against a fresh database and, where possible, a representative prior schema.
- Apply to staging first and run API/admin smoke tests.
- Before production, confirm backup/export and the recovery plan. Apply migration, deploy compatible application code, and verify real read/write paths.
- Prefer additive expand/migrate/contract changes. Do not depend on an unsafe destructive rollback.

## Deployment verification

A successful build or deployment is not sufficient. Verify:

- canonical and preview/staging URLs return the intended release;
- main public routes, metadata, robots, and sitemap;
- booking and contact submissions persist exactly once using test records;
- admin authentication and authorization, lists, calendar, detail, and status update;
- email acknowledgement/staff alert or the documented test substitute;
- error reporting, correlation IDs, and no sensitive data in logs;
- a small set of mobile/desktop accessibility and performance smoke checks.

## Rollback and recovery

- Keep the previous application release deployable and document the promotion/rollback owner.
- Roll back application code only when it remains schema-compatible.
- For data incidents, stop harmful writes if necessary, preserve evidence, restore from the approved backup/export path, reconcile affected records, and communicate through an approved incident process.
- Test recovery before launch and periodically thereafter. “Backup configured” is not proof of recoverability.

## Observability

### Signals

- Structured server logs: timestamp, environment, request ID, route, method, status, duration, safe error code, and safe entity reference where necessary.
- Metrics: request volume/error/latency, booking/contact success, idempotent replay/conflict, notification failure, D1 error, rate-limit activation, and admin mutation failure.
- Alerts: sustained public submission failure, D1 unavailability/error spike, repeated notification failure, admin authentication anomalies, and deployment health failure.

### Privacy boundary

Scrub request bodies and query strings. Do not log names, contact details, full locations, notes, Access tokens, secret values, or email bodies. Define log retention and access before launch.

## Error handling

- Assign a request ID at the edge and return it on API errors.
- Map expected validation/auth/rate errors to stable codes and safe messages.
- Preserve the booking/contact record when notification fails; mark notification state and alert staff.
- For unknown submission outcomes, retry with the same idempotency key.
- Public UI gives a safe retry/contact path; admin UI distinguishes empty, unauthorized, unavailable, and partial-failure states.
- Error details remain server-side, sanitized, and searchable by request ID.

## Operational runbooks required before launch

- Failed booking/contact submission.
- Stored request but failed email notification.
- Duplicate request investigation.
- Access onboarding/offboarding and suspected unauthorized access.
- D1 outage/data recovery.
- Bad deployment rollback.
- Privacy request and approved retention/deletion procedure.



## Staging account migration

The 2026-11-05 migration targets the separate Kai Yue Cloudflare account. Use the reviewed staging revision and an account-specific Worker and storage configuration. The current `main` and `staging` root configs share the legacy D1 and R2 identifiers, and the live Workers deployment is documented as using that D1. Treat both legacy stores as potentially containing live data.

1. In an authenticated session, verify both account names and IDs, the legacy Worker's deployment revision, routes, bindings, Workers Builds settings, and runtime secret names. Confirm the target workers.dev subdomain, existing resources, and Zero Trust availability. Keep the legacy Worker and build connection serving during verification.
2. Provision a fresh D1 and private R2 in the target account within the approved plan. Apply migrations `0001`–`0008` to the new database and verify the migration list. Start with synthetic fixtures. Any transfer of legacy rows or offer objects requires review of the exact data subset, permissions, and destination. Offer images referenced by D1 need corresponding R2 keys and metadata.
3. Update a staging-only deployment configuration with the verified Worker name, target D1 ID, R2 bucket, and target URL. Build from the repository root and set `PUBLIC_SITE_URL` at build time for Astro as well as in runtime configuration. Verify the generated Worker entry and assets paths. Keep admin fail-closed until the target Access application, team domain, audience and approved principals are reviewed and verified. Keep `NOTIFICATIONS_ENABLED=false` for synthetic verification; delivery testing uses only the approved staging inbox through the locked `EMAIL` binding and an owner-approved message.
4. Use Workers Builds with `staging` as the deployment branch for this staging Worker. Keep other branch builds disabled initially, especially `main`. Verify repository access, root directory, build and deployment commands, and runtime bindings before enabling the trigger. The fetched checkout has Wrangler 4.132.0 locally. If using the current Worker Previews workflow later, verify the lockfile version meets Cloudflare's 4.135.0 minimum and configure preview-specific resources.
5. Verify the deployed revision and staging URL, localized public routes, canonical metadata, booking and contact persistence and replay behavior with synthetic submissions, R2 image behavior, and admin denial. After Access review, verify an approved identity can sign in and an unapproved identity is denied. Switch staging review links after these checks. Keep the legacy service available and handle retirement separately because it serves the published site.

Cloudflare references include [D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Workers Builds branch settings](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), and [Worker Previews](https://developers.cloudflare.com/workers/previews/).

### Kai Yue public and admin hostnames

Owner-approved simpler layout (source/code host roles; DNS, Worker routes, and deploys are out of scope for the host-role PR):

| Address | Role | Intended use |
|---|---|---|
| `kaiyuemacau.com`, `www.kaiyuemacau.com` | Production marketing | Live public site. `/admin` and `/login` stay 403. |
| `admin.kaiyuemacau.com` | Production admin | Future staff host. Code supports password login when Access vars are absent. Do not attach or treat a host-role PR as a production release. |
| `staging.kaiyuemacau.com` | Staging marketing | Public marketing for team testing. Staff login is not offered. |
| `admin-staging.kaiyuemacau.com` | Staging admin | Staff sign-in and dashboard for team testing. |
| `kaiyue-travel-staging.kai-yue.workers.dev` | Production-protected marketing | Official staging workers.dev remains fail-closed. Do not use it as the staff login URL. |
| `kaiyue-travel-admin-trial.kai-yue.workers.dev` | Isolated trial (not a product host) | Must not be added to any production-host list. |

Staging email notifications and GitHub continuous deployment for these custom hosts are separate work. Password policy stays minimum 12 characters; do not inherit `ADMIN_STAGING_TEST_PASSWORD_MIN=6` or UAT `TEMP_ADMIN_EXPIRES_AT`.

The custom-hostname release uses a separate Kai Yue Worker and production-only D1 and private R2 bindings. The fresh staging database is for synthetic checks. Keep the production database empty until cutover unless a separately approved data migration is executed.

1. Verify the active `kaiyuemacau.com` zone, assigned nameservers, edge certificate, current apex and `www` web records, and Workspace MX/TXT records. Capture the existing apex target and proxy state for rollback. Bind the apex only after the new deployment and release checks pass.
2. Verify the selected Kai Yue account in `wrangler whoami`. In an isolated production Wrangler config at the repository root, pin the account ID, Worker name, D1 ID and R2 bucket. Keep the Astro entry and asset paths from the root config. Set `ENVIRONMENT=production`, `PUBLIC_SITE_URL=https://kaiyuemacau.com`, and `DEV_ADMIN_BYPASS=false`. Disable `workers_dev` and `preview_urls` for the live Worker. Leave password admin secrets absent. Run `pnpm install --frozen-lockfile`, `PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build`, and `pnpm exec wrangler deploy --dry-run --config <production-config>`. Confirm that the config and dry run point to the new resources, then run `pnpm exec wrangler d1 migrations apply DB --remote --config <production-config>` and deploy the reviewed release with that config. Verify the release revision and bindings in Cloudflare.
3. In Kai Yue Zero Trust, create a self-hosted Access application covering the entire `admin.kaiyuemacau.com` hostname. Review the exact permitted staff emails or managed group, identity provider and MFA requirement, session duration, and policy owner before enabling the Allow policy. Use deny by default with no Bypass rule. Set the Worker `ACCESS_TEAM_DOMAIN` to the Kai Yue team domain and `ACCESS_AUD` to this application's audience. Keep these separate from staging. Bind `admin.kaiyuemacau.com` after the Access application is ready. The admin entry URL is `https://admin.kaiyuemacau.com/admin`.
4. Verify the public homepage, localized pages, canonical metadata and protected path denial on the apex. On the admin host verify a signed-out challenge, denial for an unapproved identity, an approved user's dashboard and API access, and Access sign-out. Confirm password login, setup and auth routes are blocked. Exercise booking/contact persistence and admin auditing with approved synthetic verification. Recheck apex HTTPS and Workspace DNS after cutover. Restore the prior apex target and proxy state if public verification fails.

Cloudflare documents [self-hosted Access setup](https://developers.cloudflare.com/learning-paths/clientless-access/access-application/create-access-app/), [origin JWT verification](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/), and [Access sign-out behavior](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).

At public cutover on 2026-11-05, the Custom Domain API returned 100117 because the apex already had two A records. The release instead uses Worker routes `kaiyuemacau.com/*` and `www.kaiyuemacau.com/*`. Both existing apex A records (`76.223.105.230` and `13.248.243.5`) were switched from DNS only to Proxied with their values retained. The www CNAME still points to the apex and was switched to Proxied after public resolvers continued returning the old origin for it. If rollback is needed, restore DNS only on both apex A records and the www CNAME, remove the two Kai Yue Worker routes, and verify the prior site and Workspace mail DNS. Keep the GoDaddy origin available until ordinary DNS verification is stable. The legacy LOF HOTEL Worker serves a separate URL and shared legacy data stores. Its GitHub Builds association, active routes and data retention must be reviewed before retirement.
