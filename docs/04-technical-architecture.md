# 04 — Technical Architecture

## System overview

```text
Visitor browser
  └─ Astro pages on Cloudflare
       └─ React islands (booking sheet/form and selected UI)
            └─ /api/v1/* on Cloudflare Workers
                 ├─ D1 (bookings, contacts, audit/event records)
                 └─ Resend (acknowledgements and staff alerts)

Staff browser
  └─ Cloudflare Access
       └─ /admin/* and admin API routes
            └─ Worker + D1
```

The exact Cloudflare packaging—Pages with Functions or a Workers-hosted Astro application—should be selected during scaffolding based on current supported adapters. Preserve the same boundaries either way.

## Stack rationale

| Choice              | Why it fits                                                                         | Boundary                                                             |
| ------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Astro               | Fast content pages with minimal browser JavaScript and strong SEO defaults          | Do not force admin/form state into static components                 |
| React islands       | Mature state/form ecosystem for the widget and admin interactions                   | Hydrate only interactive regions                                     |
| Cloudflare Workers  | One edge runtime for APIs and server behavior close to the deployed site            | Design for the Workers runtime, not Node-only APIs                   |
| Cloudflare D1       | Managed SQLite-style relational storage suited to a modest booking/inquiry workload | Review limits, migrations, backup/export, and recovery before launch |
| Resend              | Focused transactional email API and delivery visibility                             | Email is notification, not the source of truth                       |
| Cloudflare Access   | Removes custom password/session handling for a small internal team                  | Worker-side authorization and offboarding policy remain required     |
| GitHub + Cloudflare | Reviewable version history, automated previews, and repeatable releases             | Protect branches and keep secrets out of Git                         |

## Frontend responsibilities

- Astro owns routing, static/server rendering, metadata, content collections, layouts, and mostly static components.
- React is limited to genuinely interactive islands: booking form/sheet, date/time controls, conditional fields, and admin calendar/table interactions.
- Shared validation schemas and API types live in a framework-neutral package/module.
- Avoid a global client store. Booking draft state can live in a provider mounted once in the main layout and use session storage if approved.

## Backend responsibilities

- Validate and normalize all inputs independently of client validation.
- Apply spam/rate controls and idempotency protection.
- Create public, non-sequential booking references while retaining internal IDs.
- Store the record before attempting notifications.
- Send notifications without rolling back a valid booking if email delivery fails; record and surface delivery state for retry.
- Enforce allowed status transitions and write operational audit events.
- Return stable JSON error shapes and correlation/request IDs.

## Trust boundaries

- Public API accepts booking and contact creation only; it cannot list or update records.
- Admin routes require verified Cloudflare Access identity. The Worker must validate Access tokens/claims for admin APIs; hiding the UI is not authorization.
- D1 and Resend bindings/keys stay server-side.
- Treat all browser and email content as untrusted. Escape output and never render raw user HTML.

## Proposed repository structure

```text
/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ components/{booking,admin,content,ui}/
│     │  ├─ content/{services,vehicles,faqs}/
│     │  ├─ layouts/
│     │  ├─ lib/{api,validation,analytics}/
│     │  ├─ pages/{admin,api}/
│     │  └─ styles/
│     ├─ public/
│     ├─ astro.config.mjs
│     └─ wrangler.jsonc
├─ packages/
│  └─ contracts/          # schemas, types, status constants
├─ migrations/            # ordered D1 migrations
├─ tests/{e2e,integration}/
├─ docs/                  # this suite or its maintained copy
├─ .github/workflows/
├─ package.json
└─ README.md
```

A single-app layout is also acceptable at this scale; keep domain folders and shared contracts even if the monorepo layer is omitted.

## Engineering conventions

- TypeScript in strict mode; schema validation at every network boundary.
- UTC timestamps in storage; explicit business timezone for display and daily grouping.
- Database migrations are append-only after shared deployment.
- Use generated/validated environment types for bindings.
- API versioning begins at `/api/v1`.
- Keep user-visible strings centralized when multilingual support is likely.
- Log metadata and IDs, not full messages, phone numbers, email addresses, or journey notes.

## Implementation defaults recorded 2026-09-16

These are proposed defaults used by the first application scaffold. They can be changed during review.

- **Packaging:** Astro 7 with `@astrojs/cloudflare` on Cloudflare Workers. Cloudflare Pages is not used; current official adapter support is Workers-only. In local Vite, island `renderer-url` is rewritten from `deps_prerender` to `deps` so booking islands hydrate with the same React copy as the form.
- **Package manager / tests:** pnpm workspaces and Vitest.
- **Timezone / locale:** `Asia/Macau` display timezone; English-only public copy until multilingual support is approved.
- **Draft persistence:** in-memory plus `sessionStorage` for journey fields only (service, locations, times, counts). Contact details are not written to storage.
- **Status emails:** staff/customer status-change email is not sent in Release 1. Create-time staff notification is attempted only when `RESEND_API_KEY` is present.
- **Admin auth:** Cloudflare Access JWT verification when `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set. `DEV_ADMIN_BYPASS=true` is honored only when `ENVIRONMENT=development`.

## Remaining architecture decisions

- Production promotion/approval model and Access policy details.
- Error-monitoring and consent-compliant analytics choices.
- Whether customer acknowledgements are required at launch in addition to staff alerts.
