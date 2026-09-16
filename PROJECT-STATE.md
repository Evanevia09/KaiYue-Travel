# Kai Yue Travel — Project State

**Last updated:** 2026-09-16  
**Phase:** 0 — discovery, documentation, and business validation  
**Overall status:** Documentation baseline established; implementation not started or verified  
**Current objective:** Validate business facts and operational rules, approve the Release 1 UX/content direction, then scaffold a thin end-to-end technical slice.

## Quick handoff

Kai Yue Travel is being planned as a B2C-first premium travel/chauffeur website with a secondary B2B/corporate journey. The main conversion path is one reusable booking form: embedded in the desktop hero and opened as a mobile bottom sheet/modal from CTAs throughout the site. The planned stack is Astro, React islands, Cloudflare Workers, D1, Resend, GitHub-driven Cloudflare delivery, and Cloudflare Access for a lightweight admin area.

The repository currently contains business source material and a complete planning/design/architecture documentation suite. No application code, database migration, CI workflow, Cloudflare environment, notification integration, admin area, or production deployment has been verified in this repository.

## Confirmed decisions

- B2C booking conversion is the primary website goal.
- Corporate/B2B content and inquiries are secondary but included.
- Desktop home hero includes the booking widget.
- Mobile reuses the same booking form in an accessible bottom sheet/modal callable from anywhere.
- Astro + React islands is the intended frontend approach.
- Cloudflare Workers + D1 is the intended backend/data approach.
- Resend is intended for transactional notifications.
- Admin scope is deliberately small: dashboard snapshot, bookings, calendar, and contacts.
- Cloudflare Access is preferred for admin protection.
- GitHub is the versioning and deployment source of truth.
- Booking submission creates a request awaiting human confirmation.

## Verified repository state

- `BUSINESS_INFORMATION.md` exists and contains extracted business context plus explicit verification warnings.
- Root agent guidance and repository onboarding documentation are established.
- `docs/` contains the Release 1 product, design, content, technical, data/API, booking, admin, delivery/operations, quality, testing, security, and phased implementation guides.
- There was no pre-existing application code or root README/agent/status documentation at the time this baseline was prepared.

## Not yet verified or implemented

- Business-owner approval of public claims and policies.
- Final brand system, original high-resolution assets, and image usage rights.
- Final services, service areas, pricing/quote behavior, lead time, cancellation terms, capacity rules, languages, and customer-response expectations.
- Application repository scaffold and dependency choices.
- D1 schema/migrations, Worker APIs, Resend domain/sender/recipients, and Cloudflare Access policy.
- Preview/staging/production environments, CI checks, DNS, analytics, observability, backup/recovery, and runbooks.
- Public-site, booking, admin, accessibility, performance, security, or end-to-end behavior.

## Business validation required

Before production copy or configuration is approved, confirm at minimum:

- current legal names, tourism license/status, address, phone/fax, and operating hours;
- current services, fleet composition/capacity, Alphard specifications, and 15+ vehicle wording;
- Macau, Hong Kong, Guangdong, and Greater Bay Area operating/cross-border coverage;
- The Venetian Macao relationship, alliance/partner structure, event relationship wording, and testimonial permissions;
- booking notice, confirmation, pricing/payment, cancellation, retention, privacy, and legal terms;
- supported launch languages and the source-language approval process;
- notification recipients, reply-to address, and staff response expectations.

Do not treat the source-reported expiry date or commercial claims in `BUSINESS_INFORMATION.md` as current confirmation.

## Open product and technical decisions

- Exact Release 1 service types and required/conditional form fields.
- Quote-only versus any displayed price estimate.
- Business timezone and supported locales at launch.
- Whether non-sensitive booking drafts may use session storage.
- Whether Release 1 status changes send customer notifications.
- Cloudflare Pages/Functions versus Workers-hosted Astro packaging, based on current official support.
- Package manager, test runner, error-monitoring and consent-compliant analytics choices.
- Production promotion/approval model and data retention/recovery policy.

## Risks and safeguards

| Risk | Current safeguard |
|---|---|
| Unverified claims are published as fact | `BUSINESS_INFORMATION.md` warnings plus mandatory business review |
| Duplicate or uncertain booking submissions | Planned idempotency and explicit unknown-outcome UX |
| Admin UI is hidden but API remains exposed | Planned Access gate plus Worker-side claim verification |
| Email failure loses a valid request | D1 persistence is authoritative; notification state is separate |
| Personal data leaks through logs/analytics | Data-minimization and PII-scrubbing requirements in docs |
| A successful build/deploy is mistaken for working production | Deployment verification requires real end-to-end checks |
| Scope expands into dispatch/CRM/payments prematurely | Release 1 exclusions require separate approval |

## Next recommended actions

1. Review `BUSINESS_INFORMATION.md` with Kai Yue management and record verified/corrected facts.
2. Approve the Release 1 sitemap, services, booking fields, customer confirmation language, and corporate inquiry fields.
3. Approve brand assets, content ownership, legal/privacy/cancellation text, and supported languages.
4. Confirm Cloudflare accounts/projects, domain/DNS ownership, Access users/groups, D1 environments, and Resend sender/recipients without committing secrets.
5. Scaffold a thin vertical slice: one public page → shared booking form → Worker validation → D1 → test notification → protected admin list/detail.
6. Verify that slice in a non-production environment before expanding pages and polish.

## Verification record

| Date | Verification | Result | Limits |
|---|---|---|---|
| 2026-09-16 | Inspected repository root before documentation commit | Only `BUSINESS_INFORMATION.md` was present | Does not prove absence of external deployments or infrastructure |
| 2026-09-16 | Checked documentation index links and requested-topic coverage | All documentation links resolved; required topics present | Documentation review is not implementation or visual QA |

## Change log

### 2026-09-16 — Documentation and agent-handoff baseline

- Added root agent instructions and contributor/agent onboarding README.
- Added this living project-state document.
- Added the complete Release 1 product, design, content, architecture, API/data, booking, admin, delivery, operations, quality, testing, security, and implementation guide under `docs/`.
- Preserved `BUSINESS_INFORMATION.md` as the business reference and elevated its verification warnings into the agent workflow.

## Update template

For the next meaningful change, update the header and relevant sections above, then append:

```md
### YYYY-MM-DD — Short change title

- Changed:
- Decision/evidence:
- Verified:
- Not verified or follow-up:
```


