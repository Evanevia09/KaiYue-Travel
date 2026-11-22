# Kai Yue Travel Website Documentation

This folder is the build guide for the Kai Yue Travel website. It records the agreed first-release product, design, architecture, delivery, and operating boundaries.

## Agreed direction

- B2C-first website optimized for booking conversion.
- Desktop hero contains an embedded booking widget.
- On mobile, the shared booking flow uses a modal/bottom sheet on Home and consumer service pages; inquiry and informational pages do not mount the booking widget.
- B2B/corporate travel is a secondary journey.
- Astro renders the site; React islands handle interactive UI.
- Cloudflare Workers provides the API, D1 stores data, and Resend sends notifications.
- A lightweight admin area covers bookings, a booking calendar, and contacts.
- Cloudflare Access is preferred for admin protection.
- GitHub is the source of truth and drives Cloudflare deployments.

Homepage visual direction follows the Transfeero-inspired booking-first layout in `design-refs/transfeero-desktop.jpg` and `design-refs/transfeero-mobile.png`. B2C copy (2026-10-16) presents chauffeur services across Macau, Mainland China, and Hong Kong; City Tours stay Macau-only. Quote-after-review remains. Do not invent prices, licences, or worldwide/Trustpilot/fixed-price claims. B2B pages follow the owner-approved Kai Yue Group portfolio.

## Documentation map

1. [Product scope and delivery principles](01-product-scope.md)
2. [Design system and UX patterns](02-design-and-ux.md)
3. [Information architecture and content](03-information-architecture-and-content.md)
4. [Technical architecture and repository structure](04-technical-architecture.md)
5. [Data model and API contract](05-data-model-and-api.md)
6. [Booking widget specification](06-booking-widget.md)
7. [Admin area specification](07-admin-area.md)
8. [Environments, deployment, and operations](08-delivery-and-operations.md)
9. [Quality, security, and implementation phases](09-quality-and-roadmap.md)
10. [Illustrative Home, service, and B2B image set](10-illustrative-image-set.md)
11. [Codex project workflow adapter](11-codex-workflow-adapter.md)
12. [City tour package authoring](12-city-tour-packages.md)
13. [Agent access to the admin API](13-agent-api.md)
14. [Special Offers dashboard handover](handover/special-offers-dashboard.md)
15. [Special Offers photos and dashboard speed](handover/special-offers-photos.md)
16. [Special Offers enquiry, hero, and package pages](handover/special-offers-enquiry.md)
17. [Greater Bay Area chauffeur copy](handover/gba-chauffeur-copy.md)
18. [Staff dashboard Traditional Chinese](handover/admin-zh-hant.md)
19. [Traditional Chinese 包車接送 wording](handover/bao-che-jie-song.md)
20. [Promote staging to main](handover/promote-staging-to-main.md)
21. [Optional Macau tour guide](handover/macau-tour-guide.md)
22. [Promote optional Macau tour guide to main](handover/promote-tour-guide-to-main.md)
23. [Booking time picker, required WhatsApp, language labels](handover/booking-time-whatsapp-lang.md)
24. [2026-11-15 main reconciliation (prepare only)](records/2026-11-15-main-reconcile-dashboard.md)
25. [2026-11-15 staff profile password release packet (prepare only)](records/2026-11-15-admin-profile-password-release-packet.md)
26. [2026-11-15 isolated admin trial resource plan (not approved, not created)](records/2026-11-15-isolated-admin-trial-plan.md)
27. [2026-11-15 admin-prep package of freeze 74c3023 (ops hold)](records/2026-11-15-admin-prep-package.md)
28. [2026-11-15 isolated trial D1/R2 + REST probe evidence (docs closeout)](records/2026-11-15-admin-trial-safety-evidence/REPORT.md)
29. [2026-11-15 host-role admin gate (source only)](records/2026-11-15-host-role-admin-gate.md)
30. [2026-11-15 super-admin user management (source only)](records/2026-11-15-super-admin-user-management.md)
31. [2026-11-16 official staging CI/CD (completed on `2a270e59`)](records/2026-11-16-official-staging-cicd.md)
32. [2026-11-16 staging cache + production-readiness source](records/2026-11-16-staging-cache-readiness.md)
33. [2026-11-16 `dca860c` overlay-main / Wrangler-bundle artifact](records/2026-11-16-staging-cache-readiness/ARTIFACT-dca860c.md)
34. [2026-11-16 `dca860c` staged closeout (admin root fixed; staff UAT open)](records/2026-11-16-staging-cache-readiness/CLOSEOUT-20261116-1757.md)
35. [2026-11-16 production operator release candidate (review packet)](records/2026-11-16-production-operator-release.md)
36. [2026-11-19 staff password sign-in lockout (merged PR #55)](records/2026-11-19-mcp-password-rate-limit/REPORT.md)
37. [2026-11-19 agent login / plugin plaintext (unmerged)](records/2026-11-19-agent-login-plugin-fix/REPORT.md)
38. [2026-11-19 combined staging MCP direct writes + branded email / WhatsApp / WeChat QR (merged PR #57)](records/2026-11-19-mcp-branded-email-combined/REPORT.md)
39. [2026-11-20 staging ack+admin notifications overlay on (production off)](records/2026-11-20-staging-ack-admin-email/REPORT.md)
40. [2026-11-22 application MCP Code Mode feasibility + CLI measurement STOP (unauthenticated)](records/2026-11-22-codemode-benchmark/REPORT.md)

City Tour planning: [2026-10-03 discussion record — packages, future booking and staff authoring](records/2026-10-03-city-tour-future-planning.md). The later package-page request flow is recorded in [2026-10-05 City Tour booking](records/2026-10-05-city-tour-booking.md). Staff package editing remains unimplemented.

WeChat QR: owner-supplied JPEG at `apps/web/public/images/wechat-qr.jpg` (Contact and footer). Do not invent a WeChat ID. Placeholder history: [2026-10-16 record](records/2026-10-16-wechat-qr-placeholder.md).

[Agent API and Kai Yue Travel Staging plugin](13-agent-api.md) covers staff sessions, staging MCP email/password connection, and local installation.

## How to use this suite

- Treat **Agreed** items as the Release 1 baseline.
- Treat **Proposed** details as implementation defaults that can be changed during design or technical review.
- Treat **Open decisions** as requiring owner approval before implementation depends on them.
- Keep these files updated when a decision changes; do not let implementation silently diverge.

## Release 1 success measures

- A visitor can understand the offer and start a booking quickly on desktop or mobile.
- The booking form keeps one draft across the hero Journey and modal Communication steps on booking-enabled pages.
- Valid requests are stored once and acknowledged reliably.
- Staff can review and update bookings and inquiries without a large CRM.
- The site is accessible, fast, secure, observable, and deployable through a repeatable workflow.


