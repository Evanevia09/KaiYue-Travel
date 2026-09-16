# Kai Yue Travel Website

Repository for the new Kai Yue Travel website and its lightweight booking operations system.

The agreed direction is a B2C-first, booking-focused website with secondary corporate content. The desktop home hero embeds the booking widget; on mobile, the same form is reusable as a bottom sheet/modal that can be opened from anywhere. The planned platform uses Astro, React islands, Cloudflare Workers, Cloudflare D1, Resend, and Cloudflare Access for the admin area.

## Current status

The project is in the **planning and documentation phase**. This repository currently establishes the business reference, Release 1 scope, design and architecture guidance, delivery controls, and agent operating rules. Application implementation and production deployment are not yet verified.

Read [PROJECT-STATE.md](PROJECT-STATE.md) for the latest status, open decisions, and next action.

## Start here

### AI agents and contributors

Read these files in order before making changes:

1. [AGENTS.md](AGENTS.md)
2. [PROJECT-STATE.md](PROJECT-STATE.md)
3. [BUSINESS_INFORMATION.md](BUSINESS_INFORMATION.md)
4. [Documentation index](docs/README.md)

`BUSINESS_INFORMATION.md` contains source-derived business material. Its verification warnings are binding: source-reported claims are not automatically approved production copy.

### Documentation guide

- [Product scope](docs/01-product-scope.md)
- [Design system and UX](docs/02-design-and-ux.md)
- [Information architecture and content](docs/03-information-architecture-and-content.md)
- [Technical architecture and stack rationale](docs/04-technical-architecture.md)
- [Data model and API contract](docs/05-data-model-and-api.md)
- [Reusable booking widget](docs/06-booking-widget.md)
- [Admin area](docs/07-admin-area.md)
- [Environments, deployment, and operations](docs/08-delivery-and-operations.md)
- [Quality, security, testing, and roadmap](docs/09-quality-and-roadmap.md)

## Release 1 at a glance

- Public service/fleet/trust content and conversion-focused booking calls to action.
- Shared booking form for desktop embed, mobile bottom sheet, and optional fallback page.
- General and corporate inquiry paths.
- Worker APIs with D1 persistence, idempotency, and Resend notifications.
- Cloudflare Access-protected dashboard, booking list/calendar/detail, status updates, and contacts.
- Human confirmation of booking requests; submission is not automatic service confirmation.

## Important boundaries

- Business identity, licensing, relationships, fleet/capacity claims, operating coverage, policies, testimonials, and legal text require business-owner verification before launch.
- Payments, dispatch/GPS, customer or driver accounts, automated confirmation, and a full CRM are outside Release 1 unless separately approved.
- Secrets and production customer data must never be committed to Git.

## Documentation maintenance

`PROJECT-STATE.md` is the living handoff document. Update it after meaningful work so the next person or agent can quickly understand what is confirmed, what changed, what remains open, what was verified, and what should happen next.


