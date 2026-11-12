# 08 — Environments, Deployment, and Operations

## Environments

| Environment | Purpose | Data and integrations |
|---|---|---|
| Local | Development and automated tests | Local/emulated D1; email stub or approved test recipient |
| Preview | Pull-request review | Separate preview database or isolated test data; test email mode/domain |
| Staging | Release candidate and stakeholder acceptance | Separate D1 and Access policy; production-like configuration, no production customer data |
| Production | Live site and staff operation | Production D1, Resend domain, Access policy, monitoring |

Never share D1 databases, email recipients, or secrets across production and non-production. Preview environments must not send real customer/staff mail.

Workers Builds for this repository run from the repo root `wrangler.jsonc`. **Top-level config is not a live target** (`name` `kaiyue-travel-env-required`, placeholder D1/R2). Live Workers are `env.staging` (`kaiyue-travel-staging`, D1 `043cd0ff-a1e6-4b5e-98c1-968c286e0c70`, R2 `kaiyue-offers-staging`) and `env.production` (`kaiyue-travel`, D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`, R2 `kaiyue-offers-production`). Authorized uploads must pass `--env staging` or `--env production` (or `CLOUDFLARE_ENV`). Run `node scripts/require-wrangler-env.mjs --env <name>` first. `wrangler versions upload` without `--env` must not target production. Cloudflare Workers Builds for Worker `kaiyue-travel` is a production version upload; do not retry a PR production build. `npx wrangler preview` uses the `previews` block with isolated placeholder D1/R2 and must not bind live staging. Do not bind D1 `069aa442-30c9-4454-ab3a-26eb372b3a1f`. Do not run `wrangler deploy` from an agent.

GitHub Actions workflow `.github/workflows/ci.yml` (`CI` / job `check`) is the test CI: lint, typecheck, test, build. It does not run wrangler. The red GitHub check `Workers Builds: kaiyue-travel` is Cloudflare Git integration on the **production** Worker. Do not rename top-level `wrangler.jsonc` `name` to `kaiyue-travel` to turn that check green.

### Workers Builds dashboard (PM review; staging-only)

Official defaults: [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) deploy command `npx wrangler deploy`; preview command `npx wrangler preview`; Git branch `main`. Wrangler environments require connecting the repo to **each** environment Worker and adding `--env` ([advanced setups](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)). This agent must not change Cloudflare project/build settings.

**On production Worker `kaiyue-travel` (Settings → Builds) — stop PR production uploads:**

1. Production Git branch: `main` only.
2. Disable preview/non-production builds on this Worker, or keep Preview command `npx wrangler preview` with no `--env production` and no `CLOUDFLARE_ENV=production`.
3. Do not set Deploy command to production `--env`. Do not Retry a failed production build from a task PR.
4. Stronger option: disconnect Git from `kaiyue-travel` until an authorized `main` promotion.

**On staging Worker `kaiyue-travel-staging` (Settings → Builds) — after Mika/Evan still have not approved a trial, this only prepares routing:**

1. Connect GitHub `Evanevia09/KaiYue-Travel` to this Worker if it is not already connected.
2. Production Git branch for **this** Worker: `staging`.
3. Root directory: `/`.
4. Build command: `pnpm install --frozen-lockfile && pnpm build`.
5. Deploy command: `npx wrangler versions upload --env staging --name kaiyue-travel-staging` (override the official `npx wrangler deploy` default; `deploy` promotes 100%).
6. Build variable (non-secret): `CLOUDFLARE_ENV=staging`.
7. If previews are enabled, Preview command: `npx wrangler preview` without `--env staging` (repo `previews` uses placeholder D1/R2; `--env staging` would bind live staging D1).
8. Do not put passwords, `BETTER_AUTH_SECRET`, or allowlist mutations in build variables.
9. After a staging versions upload, promote that version to 100% only when PM is ready for staging UI/console/security. Evan t81u (2026-11-12) asked to get the live dashboard after t79’s unknown-static explanation; t73/t74 is password-capability only. Source writers still must not `wrangler deploy` or retry production Workers Builds.

Confirm in the dashboard which Cloudflare account the GitHub check actually uses. The GitHub check details URL uses account path `41386f432b6fa180fe84f51e709b729b`; a Kai Yue Scripts GET used account `33ecc75158a1cdd23ba1a62eb70c5103`. Do not change account bindings from an agent.

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


