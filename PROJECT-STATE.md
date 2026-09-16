# Kai Yue Travel — Project State

**Last updated:** 2026-09-16  
**Phase:** 1–3 scaffold — foundation, public site, booking/API, and lightweight admin  
**Overall status:** Release 1 application scaffold implemented in-repo; not deployed; business facts still unverified  
**Current objective:** Continue Release 1 against the in-repo homepage mocks while keeping unverified claims out of copy.

## Quick handoff

Kai Yue Travel now has an Astro 7 + React-islands public site, a Cloudflare Workers API with D1 persistence, Resend placeholders, and a lightweight admin area. Desktop home embeds the booking widget; the homepage also shows that form on mobile, stacked under the vehicle photo. Other pages open the same form as a bottom sheet; `/booking` is the no-JS-enhancement fallback. Public APIs only create bookings and inquiries. Admin APIs require Cloudflare Access claims, with a development-only bypass.

No Cloudflare account, D1 database, Resend domain, or Access policy has been provisioned. Secrets are env placeholders only. Public copy is conservative and does not publish unverified license, partnership, fleet-size, cross-border, testimonial, or vehicle-specification claims. CI uses the single pnpm version from `package.json` (`pnpm@10.15.0`).

## Confirmed decisions

- B2C booking conversion is the primary website goal.
- Corporate/B2B content and inquiries are secondary but included.
- Desktop home hero includes the booking widget.
- Mobile reuses the same booking form in an accessible bottom sheet/modal callable from anywhere.
- Astro + React islands is the frontend approach.
- Cloudflare Workers + D1 is the backend/data approach. Pages is not used.
- Resend is intended for transactional notifications; missing keys stub delivery and still persist the request.
- Admin scope is dashboard snapshot, bookings, calendar, and contacts.
- Cloudflare Access is preferred for admin protection; the Worker also checks identity.
- GitHub is the versioning and deployment source of truth.
- Booking submission creates a request awaiting human confirmation.

## Verified repository state

- Documentation suite and `BUSINESS_INFORMATION.md` remain in place.
- Application scaffold exists:
  - `packages/contracts` — shared Zod schemas, status transitions, public config
  - `apps/web` — Astro site, React booking/admin islands, `/api/v1/*` Worker handlers
  - `migrations/0001_init.sql` — bookings, contacts, notes, audit, idempotency, rate limits
  - Vitest unit/integration tests and GitHub Actions CI
- Local/integration tests cover booking create + idempotency, contact validation, admin allow/deny, and audited status transitions.
- Public-site visual system is matched to `docs/design-refs/homepage-desktop.png` and `docs/design-refs/homepage-mobile.png` (teal/gold/white, sans-serif, Macau plaza + vehicle hero, teal booking header, gold CTA).
- GitHub Actions `check` job is pinned to the `package.json` `packageManager` version only.

## Not yet verified or implemented

- Business-owner approval of public claims and policies.
- Final brand system, original high-resolution assets, and image usage rights.
- Final services, service areas, pricing/quote behavior, lead time, cancellation terms, capacity rules, languages, and customer-response expectations.
- Real D1 databases, Resend domain/sender/recipients, and Cloudflare Access policy.
- Preview/staging/production environments, DNS, analytics, observability, backup/recovery, and runbooks.
- Deployed public-site, booking, admin, accessibility, performance, or security verification.

## Business validation required

Unchanged: confirm legal names, license, address/phone, hours, services, fleet, coverage, partnerships, testimonials, booking policies, languages, and notification recipients before launch. Do not treat source-reported claims in `BUSINESS_INFORMATION.md` as current confirmation.

## Open product and technical decisions

- Exact Release 1 service types and required/conditional form fields (scaffold uses a proposed set).
- Quote-only versus any displayed price estimate (scaffold is quote-only).
- Whether customer acknowledgement email is required in addition to staff alerts.
- Production promotion/approval model and data retention/recovery policy.
- Error-monitoring and consent-compliant analytics choices.

## Assumptions used by this scaffold

- Business timezone `Asia/Macau`.
- English-only UI.
- 24-hour booking notice, configurable via `BOOKING_NOTICE_HOURS`.
- Session storage may keep non-sensitive journey fields only.
- Admin status changes do not email customers in Release 1.

## Risks and safeguards

| Risk                                                         | Current safeguard                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Unverified claims are published as fact                      | Conservative public copy plus `BUSINESS_INFORMATION.md` warnings  |
| Duplicate or uncertain booking submissions                   | Idempotency keys; unknown-outcome copy reuses the same key        |
| Admin UI is hidden but API remains exposed                   | Access JWT verification; bypass only in `ENVIRONMENT=development` |
| Email failure loses a valid request                          | D1 persist-first; notification state recorded separately          |
| Personal data leaks through logs/analytics                   | Logs use reference/request IDs, not contact or journey details    |
| A successful build/deploy is mistaken for working production | Deployment still requires real end-to-end checks                  |
| Scope expands into dispatch/CRM/payments prematurely         | Release 1 exclusions unchanged                                    |

## Next recommended actions

1. Review this scaffold and the draft PR against the homepage mocks.
2. Confirm service types, booking fields, and customer confirmation language.
3. Provision non-production Cloudflare Workers, D1, Access, and Resend placeholders—without committing secrets.
4. Apply `migrations/0001_init.sql` to a local/preview D1 and verify the slice with real bindings.
5. Continue business validation of facts before replacing draft copy. Commission original photography to replace the mock-derived hero crop.

## Verification record

| Date       | Verification                                                   | Result                                                                                                                                                                     | Limits                                                                                           |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-09-16 | Inspected repository root before documentation commit          | Only `BUSINESS_INFORMATION.md` was present                                                                                                                                 | Does not prove absence of external deployments or infrastructure                                 |
| 2026-09-16 | Checked documentation index links and requested-topic coverage | All documentation links resolved; required topics present                                                                                                                  | Documentation review is not implementation or visual QA                                          |
| 2026-09-16 | Implemented Release 1 scaffold and ran automated checks        | `pnpm test` 24/24; `pnpm typecheck` clean; `astro build` completed                                                                                                         | Not a deployed, Access-protected, or browser-verified environment                                |
| 2026-09-16 | Restyled public site to in-repo homepage mocks; pinned CI pnpm | GitHub Actions `check` succeeded (run 35063368522). Local `pnpm test` 24/24, typecheck, build. Desktop/mobile browser pass of homepage, booking steps, and services sheet. | Not pixel-perfect to the mock photography (hero is a crop plus CSS sky). Not a deployed preview. |

## Change log

### 2026-09-16 — Documentation and agent-handoff baseline

- Added root agent instructions and contributor/agent onboarding README.
- Added this living project-state document.
- Added the complete Release 1 product, design, content, architecture, API/data, booking, admin, delivery, operations, quality, testing, security, and implementation guide under `docs/`.
- Preserved `BUSINESS_INFORMATION.md` as the business reference and elevated its verification warnings into the agent workflow.

### 2026-09-16 — Release 1 application scaffold

- Changed: added pnpm workspace, shared contracts, D1 migration, Astro/Workers public site, booking/contact islands, admin UI, Resend placeholders, CI, and focused tests.
- Decision/evidence: Workers-hosted Astro per current `@astrojs/cloudflare` docs; Pages no longer supported by the adapter.
- Verified: `pnpm test` (24 tests), `pnpm typecheck`, and `pnpm --filter @kaiyue/web build`.
- Not verified or follow-up: Cloudflare/Resend provisioning, deployed E2E, visual/accessibility QA, and business-approved copy.

### 2026-09-16 — Public site visual match to homepage mocks

- Changed: restyled the public site to the amber-gold luxury system (Playfair/Noto Serif headings, Inter/Noto Sans UI, full-bleed dark hero, gold CTAs, logo wordmark, service icon cards, dark footer).
- Decision/evidence: coordinator stored mocks at `internal/design-refs/homepage-desktop.png` and `homepage-mobile.png`; this worker matched the existing Kai Yue visual language those mocks represent. Exact PNG files were not mounted on this VM. Unverified license/fleet/spec claims were not copied into copy.
- Verified: `pnpm test` 24/24; `astro build`; desktop/mobile browser pass of the restyled homepage (hero, services, CTA, booking sheet).
- Not verified or follow-up: pixel-perfect comparison to the original mock PNGs (files were not mounted on this worker); original photography CDN returned 403.

### 2026-09-16 — Restyle to in-repo homepage mocks and CI pnpm pin

- Changed: public site now follows `docs/design-refs/homepage-desktop.png` and `homepage-mobile.png` (teal headlines, gold CTAs, white header, colorful K mark, stacked mobile booking card, vehicle crop from the mock). Header nav matches the mock (Home, Services, Corporate, About, Contact). Booking chrome is a teal “Book Your Journey” header with a gold full-width action. CI `pnpm/action-setup` no longer sets `version`; `packageManager: pnpm@10.15.0` is the single source.
- Decision/evidence: user designated the in-repo mocks as visual source of truth. Mock help number `+853 6288 1234` and Greater Bay Area copy were not published; phone remains the source-listed `+853 2833 8882`.
- Verified: GitHub Actions `check` green (run 35063368522) after removing the workflow pnpm `version`. Local `pnpm test` 24/24, `pnpm typecheck`, `astro build`. Browser pass of desktop hero/booking widget (continue/back), mobile stacked homepage, and services booking sheet.
- Not verified or follow-up: original licensed photography, owner-approved brand tokens, language switcher, deployed preview.

## Update template

For the next meaningful change, update the header and relevant sections above, then append:

```md
### YYYY-MM-DD — Short change title

- Changed:
- Decision/evidence:
- Verified:
- Not verified or follow-up:
```
