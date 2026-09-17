# Kai Yue Travel Website Documentation

This folder is the build guide for the Kai Yue Travel website. It records the agreed first-release product, design, architecture, delivery, and operating boundaries.

## Agreed direction

- B2C-first website optimized for booking conversion.
- Desktop hero contains an embedded booking widget.
- On mobile, the same booking form is reusable as a modal/bottom sheet and can be opened from anywhere on the site.
- B2B/corporate travel is a secondary journey.
- Astro renders the site; React islands handle interactive UI.
- Cloudflare Workers provides the API, D1 stores data, and Resend sends notifications.
- A lightweight admin area covers bookings, a booking calendar, and contacts.
- Cloudflare Access is preferred for admin protection.
- GitHub is the source of truth and drives Cloudflare deployments.

Homepage visual direction follows the Transfeero-inspired booking-first layout in `design-refs/transfeero-desktop.jpg` and `design-refs/transfeero-mobile.png`. Public copy stays Macau-only and quote-after-review; do not copy worldwide, Trustpilot, or fixed-price claims.

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

## How to use this suite

- Treat **Agreed** items as the Release 1 baseline.
- Treat **Proposed** details as implementation defaults that can be changed during design or technical review.
- Treat **Open decisions** as requiring owner approval before implementation depends on them.
- Keep these files updated when a decision changes; do not let implementation silently diverge.

## Release 1 success measures

- A visitor can understand the offer and start a booking quickly on desktop or mobile.
- The booking form can be opened from any key page without losing context.
- Valid requests are stored once and acknowledged reliably.
- Staff can review and update bookings and inquiries without a large CRM.
- The site is accessible, fast, secure, observable, and deployable through a repeatable workflow.


