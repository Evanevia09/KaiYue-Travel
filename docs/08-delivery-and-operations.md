# 08 — Environments, Deployment, and Operations

## Environments

| Environment | Purpose | Data and integrations |
|---|---|---|
| Local | Development and automated tests | Local/emulated D1; email stub or approved test recipient |
| Preview | Pull-request review | Separate preview database or isolated test data; test email mode/domain |
| Staging | Release candidate and stakeholder acceptance | Separate D1 and Access policy; production-like configuration, no production customer data |
| Production | Live site and staff operation | Production D1, Resend domain, Access policy, monitoring |

Never share D1 databases, email recipients, or secrets across production and non-production. Preview environments must not send real customer/staff mail.

Workers Builds for this repository run from the repo root `wrangler.jsonc`. `wrangler versions upload` uses the top-level config (not `env.preview`) unless `--env` or `CLOUDFLARE_ENV` is set. `npx wrangler preview` uses the `previews` block and does not inherit top-level D1/R2. The dashboard root directory can stay at the repository root; changing it to `apps/web` is a dashboard change and is not required. On the current staging branch, both production and preview bind D1 `kaiyue-travel-staging` (`069aa442-30c9-4454-ab3a-26eb372b3a1f`) and R2 `kaiyue-offers-staging`. Do not merge those bindings to `main`.

## Configuration and secrets

### Public build/runtime configuration

- Canonical site URL, public support contact, business timezone, enabled locale(s), optional analytics site ID.
- Only values safe for every visitor may use a public prefix or enter browser bundles.

### Server bindings and secrets

- D1 database binding/identifier.
- Resend API key, verified sender, approved staff recipient(s), reply-to configuration.
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

Recommended release policy: automatic preview per pull request, automatic staging on default-branch merge, and a controlled production promotion after acceptance. Direct production auto-deploy is acceptable only after the team approves the risk and rollback process.

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
3. Update a staging-only deployment configuration with the verified Worker name, target D1 ID, R2 bucket, and target URL. Build from the repository root and set `PUBLIC_SITE_URL` at build time for Astro as well as in runtime configuration. Verify the generated Worker entry and assets paths. Keep admin fail-closed until the target Access application, team domain, audience and approved principals are reviewed and verified. Leave Resend unconfigured for synthetic verification, then use separate staging credentials and approved test recipients if delivery testing is needed.
4. Use Workers Builds with `staging` as the deployment branch for this staging Worker. Keep other branch builds disabled initially, especially `main`. Verify repository access, root directory, build and deployment commands, and runtime bindings before enabling the trigger. The fetched checkout has Wrangler 4.132.0 locally. If using the current Worker Previews workflow later, verify the lockfile version meets Cloudflare's 4.135.0 minimum and configure preview-specific resources.
5. Verify the deployed revision and staging URL, localized public routes, canonical metadata, booking and contact persistence and replay behavior with synthetic submissions, R2 image behavior, and admin denial. After Access review, verify an approved identity can sign in and an unapproved identity is denied. Switch staging review links after these checks. Keep the legacy service available and handle retirement separately because it serves the published site.

Cloudflare references include [D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Workers Builds branch settings](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), and [Worker Previews](https://developers.cloudflare.com/workers/previews/).
