# 08 — Environments, Deployment, and Operations

## Environments

| Environment | Purpose | Data and integrations |
|---|---|---|
| Local | Development and automated tests | Local/emulated D1; email stub or approved test recipient |
| Preview | Pull-request review | Separate preview database or isolated test data; test email mode/domain |
| Staging | Release candidate and stakeholder acceptance | Separate D1 and Access policy; production-like configuration, no production customer data |
| Production | Live site and staff operation | Production D1, Resend domain, Access policy, monitoring |

Never share D1 databases, email recipients, or secrets across production and non-production. Preview environments must not send real customer/staff mail.

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


