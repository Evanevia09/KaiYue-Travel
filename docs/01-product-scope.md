# 01 — Product Scope

## Product goal

Create a trustworthy, conversion-focused website that helps individual travelers request transport with minimal friction while still presenting a credible corporate travel offer.

## Audiences and priorities

1. **Primary — B2C travelers:** airport transfers, point-to-point transport, hourly charter, and other confirmed services.
2. **Secondary — B2B/corporate:** companies, travel coordinators, hotels, agencies, and partners requesting recurring or tailored arrangements.
3. **Internal — staff:** users who review, confirm, progress, complete, or cancel requests and respond to inquiries.

## Release 1 scope

### Public website

- Clear value proposition, service coverage, vehicle/service presentation, trust content, and strong booking calls to action.
- Embedded desktop booking widget in the home-page hero.
- Reusable mobile booking bottom sheet/modal callable from persistent and contextual CTAs.
- Service, fleet, corporate, about/trust, FAQ, and contact content.
- General contact form and dedicated corporate inquiry path.
- Booking confirmation state and transactional email acknowledgement.

### Backend and admin

- Booking and inquiry persistence in D1.
- Email notifications through Resend.
- Protected admin pages for dashboard summary, bookings list, booking calendar, booking detail/status updates, and contacts.
- Booking statuses: `new`, `confirmed`, `in_progress`, `completed`, `cancelled`.
- Contact statuses: `new`, `replied`, `closed`.

## Out of scope for Release 1

- Online payment or automatic fare charging.
- Real-time vehicle availability, dispatch, GPS tracking, driver apps, route optimization, or customer accounts.
- Full CRM, accounting, invoicing, loyalty, or marketing automation.
- Automatic booking confirmation without human review.
- Advanced analytics, role/permission management, or multilingual content unless separately approved.

## Product principles

- **Booking first:** every key page should offer a relevant route into the booking flow.
- **One form, many entry points:** embedded and bottom-sheet experiences share fields, rules, and submission logic.
- **Progressive disclosure:** ask only what is needed to evaluate a request; reveal conditional fields when relevant.
- **Human confirmation:** submission creates a request, not a guaranteed service contract.
- **Mobile thumb-friendly:** important actions remain reachable and touch targets are at least 44×44 px.
- **Trust before persuasion:** explain service scope, confirmation process, privacy, and contact routes plainly.
- **Small admin:** prioritize operational clarity over broad analytics.

## Core journeys

### Consumer booking

Landing or content page → open/see booking form → enter journey and contact details → review → submit → receive reference and acknowledgement → staff reviews and confirms separately.

### Corporate inquiry

Corporate page → understand offer → submit company/travel needs → receive acknowledgement → staff follows up.

### Staff handling

Authenticate through Cloudflare Access → review new item → inspect details → update status/notes → contact customer outside or through approved workflow → complete or close.

## Open decisions

- Exact service types, operating locations, business hours, notice period, passenger/luggage limits, and cancellation policy.
- Whether price estimates are displayed or all requests are quote-based.
- Supported languages and the source-language approval workflow.
- Notification recipients and reply-to address.
- Legal entity name, privacy notice, terms, and data-retention period.


