# 09 — Quality, Security, and Implementation Roadmap

## Accessibility baseline

Target WCAG 2.2 AA.

- Semantic landmarks, heading order, form labels/instructions, error summary, and programmatic field errors.
- Full keyboard operation, visible focus, logical focus order, and no keyboard traps except correctly managed modal focus.
- Minimum 44×44 px touch targets where applicable; usable at 200% zoom/reflow and narrow widths.
- Sufficient text/UI contrast; status never depends on color alone.
- Meaningful alt text; decorative images ignored; captions/transcripts where media requires them.
- Reduced-motion support and live announcements for submission/loading results.
- Calendar has an equivalent accessible agenda/list view.

Test with automated tooling plus manual keyboard and at least representative screen-reader checks. Automated scores alone do not establish conformance.

## Performance targets

Proposed launch budgets, measured on representative mobile conditions:

- Public pages target Core Web Vitals “good” thresholds at the 75th percentile.
- Keep initial JavaScript limited; do not hydrate static content.
- Reserve image dimensions, use responsive modern formats, lazy-load below-fold media, and prioritize only the real LCP asset.
- Subset/self-host fonts where licensing permits; avoid unnecessary weights and third-party scripts.
- Cache public immutable assets aggressively; never publicly cache personalized/admin/API responses.
- Set a per-page JS/image budget during implementation and fail CI or review when it regresses materially.

## Security and privacy baseline

- Server-side schema validation, output escaping, parameterized D1 queries, strict method/content-type checks, and bounded payload sizes.
- Same-origin APIs, restrictive CORS, secure headers/CSP, HTTPS, and no secrets in browser code.
- Rate limiting and anti-automation tuned for public forms; do not rely on a CAPTCHA alone.
- Idempotency prevents duplicate submission effects.
- Cloudflare Access plus API-side token/claim verification for every admin route.
- Least-privilege bindings, recipient lists, repository permissions, and staff access.
- Dependency/update scanning and secret scanning in GitHub; pin the lockfile.
- Collect only required personal data; approve purpose, retention, access, deletion, and incident processes before launch.
- Any payment feature requires a separate security/compliance design and is not part of this release.

Threat-model at least spam/abuse, injection, stored content, authorization bypass, ID enumeration, sensitive logging, email abuse, duplicate booking, CSRF for admin mutations, compromised staff identity, and dependency compromise.

## Test strategy

### Unit

- Shared schemas, normalization, date/time/timezone rules, status transitions, reference/idempotency helpers, API error mapping, and conditional form rules.

### Component

- Booking step/layout behavior, validation/focus, bottom-sheet open/close/dirty state, loading/success/error states, admin filters/status controls, and accessible names/roles.

### Integration

- Worker handlers with isolated D1: valid/invalid create, idempotent replay/conflict, pagination/filtering, Access allow/deny, state transition/audit transaction, and email failure after persistence.

### End to end

- Desktop embedded booking and mobile sheet from multiple entry pages.
- Duplicate click/retry, slow/offline recovery, and unknown outcome.
- General and corporate inquiry.
- Admin login gate, booking list/calendar/detail/status update, and contacts flow.
- Keyboard-only and representative screen-reader journeys.

### Non-functional

- Performance audits on representative pages; accessibility scans plus manual review; security headers and authorization tests; rate-limit/abuse behavior; production-like migration and recovery rehearsal.

Use deterministic test data and fake/test email delivery. Production smoke records must be visibly marked and removed or retained according to approved policy.

## Definition of done

A feature is done only when behavior and edge cases match this documentation, tests pass at the appropriate levels, accessibility and responsive states are reviewed, analytics/logging contain no sensitive values, content is approved, documentation/migrations are updated, and the deployed target—not only the build—has been verified.

## Implementation phases

### Phase 0 — Discovery and decisions

- Confirm services, locations, business rules, timezone, content owner, legal/privacy text, brand/assets, admin users, email recipients, and release policy.
- Validate booking fields and staff workflow with the business.
- Choose Cloudflare deployment shape after checking current adapter/platform support.

**Exit:** approved requirements and content inventory; open decisions do not block build.

### Phase 1 — Foundation and design

- Scaffold repository, Astro/React, strict TypeScript, shared contracts, CI, preview environment, tokens, core components, layouts, content model, and route skeletons.
- Prototype embedded form and bottom sheet; test with keyboard/mobile before visual polish.

**Exit:** approved responsive direction and functioning preview pipeline.

### Phase 2 — Public site and booking

- Implement approved content, booking/contact forms, validation, D1 migrations/API, idempotency, confirmation states, and Resend notifications.
- Add metadata, structured data, sitemap/robots, error pages, accessibility/performance controls, and observability.

**Exit:** end-to-end test submissions persist exactly once and notification failures are recoverable.

### Phase 3 — Admin operations

- Configure Cloudflare Access and server authorization.
- Implement dashboard, bookings list/detail/calendar/status/notes, contacts, audit events, and notification-failure visibility.
- Validate the workflow with actual staff using non-production data.

**Exit:** staff acceptance; access/offboarding and operational runbooks approved.

### Phase 4 — Hardening and launch

- Complete cross-browser/device, accessibility, security, performance, migration, recovery, and failure-mode testing.
- Approve production content/legal text, configure DNS/email/auth/secrets, deploy, verify the real production flows, and monitor closely.

**Exit:** product owner signs off with evidence; launch checks and rollback/recovery path are confirmed.

### Phase 5 — Evidence-led improvements

- Review conversion funnel, failure categories, inquiry quality, performance, staff pain points, and accessibility feedback.
- Consider pricing/quotes, multilingual content, richer calendar/dispatch, customer notifications, or CRM integration only after validated need and separate scope/security review.

## Recommended build order within phases

Deliver a thin vertical slice early: one public page → reusable form → Worker → D1 → test email → protected admin list/detail. This validates the critical boundaries before expanding content or polish.


