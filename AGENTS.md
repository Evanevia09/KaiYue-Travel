# Kai Yue Travel — Agent Instructions

These instructions apply to the entire repository. More specific `AGENTS.md` files may add rules for a subdirectory, but must not weaken the safeguards here.

## Required reading order

Before planning or changing the project, read:

1. `AGENTS.md` — working rules and authority boundaries.
2. `PROJECT-STATE.md` — current phase, verified status, open decisions, and next actions.
3. `BUSINESS_INFORMATION.md` — business facts, source-derived claims, and verification warnings.
4. `docs/README.md` — documentation index; then read the documents relevant to the task.
5. Existing code, tests, configuration, migrations, and recent history in the area being changed.

Do not start implementation from a conversation summary alone.

## Source-of-truth hierarchy

When sources conflict, use this order:

1. Current, explicit user or business-owner decision.
2. Verified project files and deployed/runtime evidence.
3. `PROJECT-STATE.md` and approved decisions recorded in the repository.
4. `BUSINESS_INFORMATION.md` for business context, subject to its verification warnings.
5. The design and architecture guides under `docs/`.
6. Assumptions and proposals, which must be labeled and must not silently become facts.

Never convert a source-reported or unverified business claim into published website copy without approval. This includes license status, commercial relationships, fleet size, cross-border coverage, testimonials, partnerships, operating hours, policies, and vehicle specifications.

## Agreed Release 1 direction

- B2C-first public website with strong booking conversion.
- Desktop home hero with an embedded booking widget.
- The same booking form reused on mobile as a modal/bottom sheet callable from anywhere.
- Secondary B2B/corporate content and inquiry path.
- Astro frontend with React islands for interactive components.
- Cloudflare Workers API, Cloudflare D1 database, and Resend notifications.
- Lightweight protected admin area: dashboard summary, bookings, calendar, and contacts.
- Cloudflare Access is preferred for admin protection.
- GitHub is the source of truth and drives Cloudflare preview/release workflows.

Payment, live dispatch/GPS, driver or customer apps, automatic booking confirmation, a full CRM, and other excluded features require separate approval.

## Working rules

- Inspect current repository and runtime state before making significant changes.
- Preserve existing files, manual edits, configuration, migrations, and unrelated work.
- Prefer small, reversible, reviewable changes with focused tests.
- Separate confirmed facts, assumptions, proposals, open decisions, completed actions, and verification evidence.
- Do not publish, deploy, change production data, rotate secrets, or contact external people without explicit authorization.
- Protect personal, booking, financial, authentication, and confidential business data.
- Require human review for money, privacy, legal, safety, access-control, and materially ambiguous decisions.
- Do not claim success from a command, file, build, upload, HTTP status, or deployment record alone; verify the requested end state.
- Use current official documentation when platform behavior or limits may have changed.

## Architecture boundaries

- Astro owns content pages, routing, layouts, metadata, and mostly static UI.
- React is limited to interactive islands such as the shared booking flow and admin interactions.
- Embedded, bottom-sheet, and fallback booking experiences share one form contract, validation model, and submission behavior.
- Client validation improves UX; the Worker independently validates and authorizes every request.
- Public APIs may create bookings and inquiries only. Listing, reading, or mutating operational records requires verified admin authorization.
- Cloudflare Access protects the admin UI, and the Worker must also verify Access identity/claims for admin APIs.
- D1 is the source of truth for requests. Email delivery is a notification side effect and must not determine whether a stored booking exists.
- Use idempotency for public form submission and audit every admin status change.
- Never expose secrets or personal data in browser bundles, URLs, analytics, or broad logs.

## Documentation discipline

After meaningful work, update `PROJECT-STATE.md` in the same change:

- phase and current objective;
- verified completed work;
- in-progress work and blockers;
- open decisions and assumptions;
- validation performed and its limits;
- next recommended action;
- dated change log entry.

Update the relevant `docs/*.md` file when product, content, UX, architecture, API, data, security, testing, deployment, or operating decisions change. Keep durable rules here; do not add temporary conversation details to `AGENTS.md`.

## Quality gates

Before calling a change complete, run the checks appropriate to its risk:

- formatting/linting, strict type checking, tests, and production build;
- booking/contact persistence and idempotency for form work;
- authorization allow/deny checks and audit recording for admin work;
- responsive, keyboard, focus, screen-reader, and reduced-motion checks for UI work;
- schema migration, recovery, notification-failure, logging, and secret/PII checks for backend work;
- preview or deployed end-to-end verification when a release is in scope.

Record what was actually verified in `PROJECT-STATE.md`; clearly label anything not verified.


