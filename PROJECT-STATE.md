# Kai Yue Travel — Project State

**Last updated:** 2026-09-16  
**Phase:** 1–3 scaffold — foundation, public site, booking/API, and lightweight admin  
**Overall status:** Release 1 application scaffold implemented in-repo; not deployed; business facts still unverified  
**Current objective:** Continue Release 1 against the Transfeero-inspired public design while keeping unverified claims out of copy.

## Quick handoff

Kai Yue Travel now has an Astro 7 + React-islands public site, a Cloudflare Workers API with D1 persistence, Resend placeholders, and a lightweight admin area. The public visual system is a dark cinematic, booking-first layout: overlay header with a **Kai Yue** wordmark, centered hero copy, and a compact Transfer / Hourly From–To bar. Desktop home embeds that widget on a 100vh full-bleed hero; other public pages use the same dark hero treatment with title and lede only (no hero Book now button). Other pages open the same form as a bottom sheet; `/booking` is the no-JS-enhancement fallback. Public APIs only create bookings and inquiries. Admin APIs require Cloudflare Access claims, with a development-only bypass.

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
- Public-site visual system follows `docs/design-refs/transfeero-desktop.jpg` and `docs/design-refs/transfeero-mobile.png` (dark overlay header, gold mark + Kai Yue wordmark, pill nav, compact booking bar, dark footer). The journey bar uses a custom dual-month date/time picker instead of the native datetime control. Copy remains Macau-only and quote-after-review. Public heroes are 100vh full-width backgrounds using `apps/web/public/images/hero-home.jpg` with a dark cinematic overlay. Header booking is not duplicated; inner-page heroes no longer include Book now. Homepage embeds the form; other pages book from in-content CTAs or the mobile sticky control.
- Each chauffeur service has an SEO landing page under `/services/[slug]`. Header Business is a dropdown to Travel agency, Corporate solution, and Hotels & resorts. `/services` redirects to airport transfer. Homepage service cards cover all six services. `/pricing` is a quote table without published fares.
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

1. Browser-check the custom pickup/return calendar and time popover on desktop and the mobile sheet.
2. Confirm service types, booking fields, and customer confirmation language.
3. Provision non-production Cloudflare Workers, D1, Access, and Resend placeholders—without committing secrets.
4. Apply `migrations/0001_init.sql` to a local/preview D1 and verify the slice with real bindings.
5. Continue business validation of facts before replacing draft copy. Commission original photography to replace the hero crop.

## Verification record

| Date       | Verification                                                   | Result                                                                                                                                                                     | Limits                                                                                           |
| ---------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-09-16 | Inspected repository root before documentation commit          | Only `BUSINESS_INFORMATION.md` was present                                                                                                                                 | Does not prove absence of external deployments or infrastructure                                 |
| 2026-09-16 | Checked documentation index links and requested-topic coverage | All documentation links resolved; required topics present                                                                                                                  | Documentation review is not implementation or visual QA                                          |
| 2026-09-16 | Implemented Release 1 scaffold and ran automated checks        | `pnpm test` 24/24; `pnpm typecheck` clean; `astro build` completed                                                                                                         | Not a deployed, Access-protected, or browser-verified environment                                |
| 2026-09-16 | Restyled public site to in-repo homepage mocks; pinned CI pnpm | GitHub Actions `check` succeeded (run 35063368522). Local `pnpm test` 24/24, typecheck, build. Desktop/mobile browser pass of homepage, booking steps, and services sheet. | Not pixel-perfect to the mock photography (hero is a crop plus CSS sky). Not a deployed preview. |
| 2026-09-16 | Full-bleed 100vh heroes, header Book now removed, booking spacing | Desktop browser pass of homepage hero/overlay/widget, Services and Corporate heroes, booking sheet steps 1–2 | Mobile 100vh heroes not re-checked in this pass. Image usage rights for `hero-home.jpg` not confirmed. |
| 2026-09-16 | Service SEO pages, dropdown nav, pricing quote table | Typecheck clean. HTTP 200 on service + pricing pages. `/services` 308 → airport transfer. Dropdown and JSON-LD present in HTML. | No owner-approved fares. Dropdown interaction not click-tested in the browser. |
| 2026-09-16 | Homepage booking bar restored; inner-page hero Book now removed | See changelog below. | Mobile 390 viewport and full booking submit not re-checked in this pass until browser verification completes. |

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

### 2026-09-16 — Full-bleed heroes, header Book now removed, booking spacing

- Changed: public heroes are now 100vh full-width background photographs. Homepage uses `hero-home.jpg` with a white fade from the top-left so the teal title stays readable. Inner pages share the same hero chrome. Duplicate header Book now was removed (Need Help remains). Booking card body padding, field grid, and empty status spacing were unified.
- Decision/evidence: user asked to drop the extra header Book control, put heroes on other pages, fix form spacing, and make heroes 100vh full-width backgrounds; then supplied the waterfront-hotel chauffeur image for the homepage hero.
- Verified: local desktop browser pass of homepage (full-bleed hero + overlay + widget), Services and Corporate heroes, and booking sheet steps 1–2 spacing. Header no longer shows Book now beside Need Help.
- Not verified or follow-up: mobile viewport pass of the new 100vh heroes; image usage rights for `hero-home.jpg`; pixel match to the plaza mock (hero photography is now the supplied hotel/family scene).

### 2026-09-16 — Service SEO pages, nav dropdown, pricing table

- Changed: added unique SEO pages for every chauffeur service; Services in the header is a dropdown (no index page; `/services` 308s to airport transfer); footer lists all services plus Pricing; homepage cards cover all six services; added `/pricing` as a quote-structure table with no invented fares.
- Decision/evidence: user asked for SEO pages per service, a Services dropdown instead of a main services page, footer and menu links, homepage cards, and a pricing table. Published amounts remain unapproved, so the table explains how quotes are prepared.
- Verified: `pnpm --filter @kaiyue/web typecheck` clean. HTTP 200 on homepage, `/services/airport-transfer`, `/services/hourly-charter`, `/services/corporate`, `/pricing`. `/services` returns 308 to `/services/airport-transfer`. HTML includes the Services dropdown, JSON-LD on a service page, and the quote table.
- Not verified or follow-up: owner-approved public fares; browser click-through of the dropdown on desktop/mobile; React island hydration after Vite re-optimize (dev log showed an invalid hook call on homepage).

### 2026-09-16 — Transfeero-inspired public design and positioning

- Changed: restyled the public site to a dark cinematic, booking-first layout. Logo wordmark is **Kai Yue**. Header is an overlay with pill nav (Airport ride, City rides, Hourly, Help, Business) and a Call chip. Homepage hero is centered white copy plus Transfer / By the Hour, compact From–To bar, and **Get a quote**. Trust line is Macau-only. Footer is dark. Copy does not use worldwide, Trustpilot, or fixed-price claims.
- Decision/evidence: user asked for a complete Transfeero-inspired revamp (https://www.transfeero.com/en/ plus supplied mobile/desktop screenshots) and specified the logo text as Kai Yue. Positioning stays quote-after-review with human confirmation.
- Verified: `pnpm --filter @kaiyue/web typecheck` clean; `pnpm test` 24/24. Desktop browser pass of homepage hero/bar, hourly toggle, Get a quote → details step, airport-transfer overlay hero, and booking sheet. Mobile 390×844 pass of stacked homepage card (Call + hamburger).
- Not verified or follow-up: owner-approved brand tokens and photography rights; pixel-perfect match to Transfeero (native datetime control remains browser-styled); deployed preview.

### 2026-09-16 — Header Sign in and language control

- Changed: removed the header Call chip. Header now sits in front of the hero with no bar background. Right actions are a globe + EN language control and a white Sign in chip. `/login` explains that customer accounts are not in this release.
- Decision/evidence: user selected the header and asked to bring it forward, drop Call, add a globe language control, and add a login chip.
- Verified: desktop browser pass of homepage header (globe + EN, Sign in, no Call, transparent overlay). `/login` loads with honest copy that accounts are not in this release.
- Not verified or follow-up: working customer authentication; additional languages beyond English.

### 2026-09-16 — Restore homepage booking bar, drop inner-page hero Book now

- Changed: restored the homepage From–To booking bar by replacing `lucide-react` with inline SVGs (duplicate React copies were emptying the hero island). Removed Book now from inner-page heroes and the unused PageHero booking-launcher props. Leftover previous-design `.gold-rule` CSS was deleted. Booking CTAs remain in page bodies, service cards, and the mobile sticky control.
- Decision/evidence: user asked to fix the missing widget, remove the leftover Book now/hero buttons from the previous design, and keep the Transfeero-inspired homepage layout.
- Verified: pending browser pass in this change.
- Not verified or follow-up: deployed preview; original photography rights.

### 2026-09-16 — Compact booking bar and smaller nav type

- Changed: homepage booking bar is capped at 58rem instead of stretching with the hero stage. Pill nav, language, Sign in, and hero booking fields use smaller type and tighter padding. The hero **Get a quote** button fills the bar row height with a modest radius. Transfer / By the Hour is a smaller rounded box rather than a large pill.
- Decision/evidence: user asked not to make the booking widget full width, and to reduce nav and booking-widget text size.
- Verified: pending desktop browser pass of homepage nav and booking bar.
- Not verified or follow-up: mobile stacked bar at 390px.

### 2026-09-16 — Custom pickup/return date and time picker

- Changed: replaced native `datetime-local` on the journey bar with a Transfeero-style dual-month calendar, 12h/24h time popover, Add return, and a combined pickup → return chip with clear. Return is collected on step 1; step 2 no longer repeats it. Draft values stay local `YYYY-MM-DDTHH:mm`.
- Decision/evidence: user supplied desktop screenshots of the closed pickup field, open two-month calendar, time wheels with Save, and the round-trip bar.
- Verified: `pnpm test` 28/28; `pnpm --filter @kaiyue/web typecheck` clean. Desktop browser pass: boxed pickup field, dual-month calendar, selected day, 12h time wheels with Save, Add return, combined pickup→return chip, and clear.
- Not verified or follow-up: mobile sheet picker at 390px; pixel-perfect match to the reference; 24-hour notice still server-validated rather than fully blocked in the clock UI.

### 2026-09-16 — 24-hour pickup/return display

- Changed: journey-bar date chips and calendar footer times use 24-hour clock (`Sep 23 · 14:00`) so AM/PM is not needed in the compact round-trip field. The time popover defaults to 24h.
- Decision/evidence: user selected the combined pickup/return chip and asked for military time to drop AM/PM.
- Verified: `pnpm test` 28/28. Desktop homepage pickup chip shows `Wed, Sep 23 · 14:00` with no AM/PM.
- Not verified or follow-up: mobile sheet at 390px.

### 2026-09-16 — Booking bar field hover

- Changed: From, To, the pickup date chip, and Add return get a light gray rounded hover (and matching focus) fill.
- Decision/evidence: user selected those four booking-bar controls and asked for a subtle highlight on hover.
- Verified: desktop homepage From cell shows a light rounded gray fill under forced hover; To, date chip, and Add return share the same hover/focus styles.
- Not verified or follow-up: pointer hover of every control on a physical mouse; mobile stacked bar.

### 2026-09-16 — Ride toggle inner padding

- Changed: homepage Transfer / By the Hour track padding increased from 0.12rem (~2px) to 4px.
- Decision/evidence: user selected the ride-type group and asked for at least 2px of inner padding.
- Verified: desktop homepage `.form--hero .ride-toggle` computed padding is 4px on all sides; Transfer chip inset is 4px from the track edge.
- Not verified or follow-up: mobile sheet toggle.

### 2026-09-16 — Booking From/To inputs: no focus ring

- Changed: From and To text fields no longer show the gold `:focus-visible` outline while typing; the existing cell fill remains the focus cue.
- Decision/evidence: user selected the From input and asked to remove the focus border when typing.
- Verified: desktop homepage From field focused and typed “Macau Airport”; computed outline is `none`, no gold ring, cell fill `#f0f0f2`.
- Not verified or follow-up: keyboard-only tab order on the rest of the bar; mobile sheet inputs.

### 2026-09-16 — Full-width header, wider booking bar

- Changed: desktop header inner spans the viewport instead of the 74rem content wrap. Homepage booking bar width is 64rem (68rem with a return), still not full-bleed.
- Decision/evidence: user selected the header row and asked for a full-width nav, with a modest booking-widget width increase.
- Verified: desktop homepage (~1286px). Header inner left 0, width matches the viewport minus scrollbar. Booking bar 1024px (64rem), with side inset so it is not full-bleed.
- Not verified or follow-up: mobile header; roundtrip 68rem width with Add return.

## Update template

For the next meaningful change, update the header and relevant sections above, then append:

```md
### YYYY-MM-DD — Short change title

- Changed:
- Decision/evidence:
- Verified:
- Not verified or follow-up:
```
