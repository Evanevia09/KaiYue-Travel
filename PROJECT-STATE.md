# Kai Yue Travel — Project State

**Last updated:** 2026-09-18  
**Phase:** 1–3 scaffold — foundation, public site, booking/API, and lightweight admin  
**Overall status:** Release 1 application scaffold implemented in-repo; not deployed. Legal names and B2B copy now follow the Kai Yue Group portfolio; B2C booking copy stays Macau-only and quote-after-review.  
**Current objective:** Continue Release 1 against the Transfeero-inspired public design. Keep B2C claims conservative; keep B2B pages aligned with the group portfolio.

## Quick handoff

Kai Yue Travel now has an Astro 7 + React-islands public site, a Cloudflare Workers API with D1 persistence, Resend placeholders, and a lightweight admin area. The public visual system is a dark cinematic, booking-first layout: overlay header with a **Kai Yue** wordmark, centered hero copy, and a compact Point to point / Hourly booking bar. Desktop home embeds that widget on a 100vh full-bleed hero; other public pages use the same dark hero treatment with title and lede only (no hero Book now button). Other pages open the same form as a bottom sheet; `/booking` is the no-JS-enhancement fallback. Public APIs only create bookings and inquiries. Admin APIs require Cloudflare Access claims, with a development-only bypass.

No Cloudflare account, D1 database, Resend domain, or Access policy has been provisioned. Secrets are env placeholders only. B2C copy is conservative (Macau, quote-after-review). B2B pages publish owner-approved group-portfolio claims (alliance, dual-plate GBA, 200+ Alphards, 7×24, Venetian wording). CI uses the single pnpm version from `package.json` (`pnpm@10.15.0`).

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
- Legal names: Kai Yue Group Limited / Kai Yue Travel Group Limited, per the group portfolio.
- B2B pages follow the Kai Yue Group portfolio; B2C booking pages remain Macau-only quote-after-review.

## Verified repository state

- Documentation suite and `BUSINESS_INFORMATION.md` remain in place.
- Application scaffold exists:
  - `packages/contracts` — shared Zod schemas, status transitions, public config
  - `apps/web` — Astro site, React booking/admin islands, `/api/v1/*` Worker handlers
  - `migrations/0001_init.sql` — bookings, contacts, notes, audit, idempotency, rate limits
  - Vitest unit/integration tests and GitHub Actions CI
- Local/integration tests cover booking create + idempotency, contact validation, admin allow/deny, and audited status transitions.
- Public-site visual system follows `docs/design-refs/transfeero-desktop.jpg` and `docs/design-refs/transfeero-mobile.png` (dark overlay header, gold mark + Kai Yue wordmark, pill nav, compact booking bar, dark footer). The journey bar uses a custom dual-month date/time picker instead of the native datetime control. B2C copy remains Macau-only and quote-after-review. B2B pages (`/corporate`, `/business/travel-agency`, `/business/hotels-resorts`) follow the group portfolio. Public heroes are 100vh full-width backgrounds using `apps/web/public/images/hero-home.jpg` with a dark cinematic overlay. Header booking is not duplicated; inner-page heroes no longer include Book now. Homepage embeds the form; other pages book from in-content CTAs or the mobile sticky control.
- Each chauffeur service has an SEO landing page under `/services/[slug]`. Header Business is a dropdown to Travel agency, Corporate solution, and Hotels & resorts. `/services` redirects to airport transfer. Homepage service cards cover all six services. `/pricing` is a quote table without published fares.
- GitHub Actions `check` job is pinned to the `package.json` `packageManager` version only.
- Header navigation and motion (2026-09-18): `Help` is removed from the primary menu — `/faq` still exists and stays linked in the footer Company column. Every primary item is now a dropdown (`Point To Point`, `By The Hour`, `Business`, plus the added `City Tours` page). On mobile the same items are collapsed-by-default `<details>` submenus with a rotating chevron, animated reveal, and a panel that drops in under the header. `apps/web/src/scripts/header-menus.ts` owns all header menu behaviour: one menu open at a time (opening a dropdown or the language switch collapses whichever was open, and expanding a mobile group collapses its siblings without closing the panel), an outside click or tap closes the open menu, Escape closes it and returns focus to its summary, following a link closes it, tabbing out of the header abandons a desktop dropdown, and the mobile panel always reopens collapsed. Motion polish is site-wide: dropdown and submenu reveals, hamburger-to-close morph, wizard step entrances (`.booking-bar` / `.booking-fields`), mobile sheet entrance, and hover feedback on buttons, chips, nav items, footer links, cards and form fields. All of it is disabled under `prefers-reduced-motion` and hover effects are gated behind `(hover: hover) and (pointer: fine)`.
- Motion/behaviour was verified in headless Chrome against the local dev server, not by inspection: submenus closed on load, expand on tap, opening a second dropdown or the language switch collapses the first, an outside click closes, Escape closes and refocuses the summary, following a link closes, tab-out closes, the desktop dropdown animates with the chevron flipping, the wizard's step 2 mounts with its entrance animation, the field focus ring resolves to `border #111` + a 4px ring, and the hover lift measures as `translateY(-1px)` / `translateX(2px)`. `pnpm typecheck`, `pnpm test` (29 tests) and `pnpm build` pass.

## Not yet verified or implemented

- Final brand system, original high-resolution assets, and image usage rights.
- Final B2C services, pricing/quote behavior, lead time, cancellation terms, capacity rules, languages, and customer-response expectations.
- Real D1 databases, Resend domain/sender/recipients, and Cloudflare Access policy.
- Preview/staging/production environments, DNS, analytics, observability, backup/recovery, and runbooks.
- Deployed public-site, booking, admin, accessibility, performance, or security verification.

## Business validation required

Legal names and B2B offer copy are owner-directed to the group portfolio (2026-09-17). Still confirm before launch: B2C phone/hours/address vs B2B phones; whether 200+ may appear on B2C fleet pages; licence number 0162; Hong Kong coverage (not in the group portfolio); notification recipients; privacy/terms. B2C pages must not absorb group-portfolio fleet, GPS, or 7×24 claims.

## Open product and technical decisions

- Exact Release 1 service types and required/conditional form fields (scaffold uses a proposed set).
- Quote-only versus any displayed price estimate (scaffold is quote-only).
- Whether customer acknowledgement email is required in addition to staff alerts.
- Production promotion/approval model and data retention/recovery policy.
- Error-monitoring and consent-compliant analytics choices.
- Booking wizard gating: `BookingForm` advances on step 1 → 2 → 3 in `onSubmit` without validating the current step, so an incomplete journey still reaches the Details step; per-step validation (or an explicit "review before continuing") is undecided.
- Hero wizard steps 2–3 inherit the hero's centered `text-align`, so `.field` labels render centered while the fields stay left-aligned. Cosmetic; decide whether the hero variant should reset text alignment inside the form.

## Assumptions used by this scaffold

- Business timezone `Asia/Macau`.
- English-only UI.
- 24-hour booking notice, configurable via `BOOKING_NOTICE_HOURS`.
- Session storage may keep non-sensitive journey fields only.
- Admin status changes do not email customers in Release 1.

## Risks and safeguards

| Risk                                                         | Current safeguard                                                                                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unverified B2C claims are published as fact                  | B2C copy stays Macau quote-after-review; B2B claims are owner-directed to the group portfolio and framed as programme standards, not website-form guarantees |
| Duplicate or uncertain booking submissions                   | Idempotency keys; unknown-outcome copy reuses the same key                                                                                                   |
| Admin UI is hidden but API remains exposed                   | Access JWT verification; bypass only in `ENVIRONMENT=development`                                                                                            |
| Email failure loses a valid request                          | D1 persist-first; notification state recorded separately                                                                                                     |
| Personal data leaks through logs/analytics                   | Logs use reference/request IDs, not contact or journey details                                                                                               |
| A successful build/deploy is mistaken for working production | Deployment still requires real end-to-end checks                                                                                                             |
| Scope expands into dispatch/CRM/payments prematurely         | Release 1 exclusions unchanged                                                                                                                               |

## Next recommended actions

1. Browser-check the mobile booking sheet (not the homepage hero card) for duration, calendar, and Add return stack.
2. Confirm service types, booking fields, and customer confirmation language.
3. Provision non-production Cloudflare Workers, D1, Access, and Resend placeholders—without committing secrets.
4. Apply `migrations/0001_init.sql` to a local/preview D1 and verify the slice with real bindings.
5. Continue business validation of facts before replacing draft copy. Commission original photography to replace the hero crop.

## Verification record

| Date       | Verification                                                                                                                                    | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Limits                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-17 | Owner-directed B2B pages from group portfolio; legal names adopted                                                                              | Desktop: `/corporate`, `/business/travel-agency`, `/business/hotels-resorts`, `/about`, `/contact`, homepage. Mobile 390: corporate + contact. Inquiry form filled and submitted (API did not persist without D1).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Not a deployed preview. Inquiry persistence not verified.                                                                                                                                                                                                                                                                                                              |
| 2026-09-17 | Compared group-portfolio Chinese copy with `BUSINESS_INFORMATION.md`                                                                            | Shared: 2009, Macau, Mingmen alliance, Alphard 40, Venetian wording. Conflicts: legal name, 200+ vs 15+ fleet, phones, hours, HK vs Mainland dual-plate, instant dispatch vs quote-after-review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Later owner decision adopted group names and B2B copy.                                                                                                                                                                                                                                                                                                                 |
| 2026-09-16 | Inspected repository root before documentation commit                                                                                           | Only `BUSINESS_INFORMATION.md` was present                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Does not prove absence of external deployments or infrastructure                                                                                                                                                                                                                                                                                                       |
| 2026-09-16 | Checked documentation index links and requested-topic coverage                                                                                  | All documentation links resolved; required topics present                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Documentation review is not implementation or visual QA                                                                                                                                                                                                                                                                                                                |
| 2026-09-16 | Implemented Release 1 scaffold and ran automated checks                                                                                         | `pnpm test` 24/24; `pnpm typecheck` clean; `astro build` completed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Not a deployed, Access-protected, or browser-verified environment                                                                                                                                                                                                                                                                                                      |
| 2026-09-16 | Restyled public site to in-repo homepage mocks; pinned CI pnpm                                                                                  | GitHub Actions `check` succeeded (run 35063368522). Local `pnpm test` 24/24, typecheck, build. Desktop/mobile browser pass of homepage, booking steps, and services sheet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Not pixel-perfect to the mock photography (hero is a crop plus CSS sky). Not a deployed preview.                                                                                                                                                                                                                                                                       |
| 2026-09-16 | Full-bleed 100vh heroes, header Book now removed, booking spacing                                                                               | Desktop browser pass of homepage hero/overlay/widget, Services and Corporate heroes, booking sheet steps 1–2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Mobile 100vh heroes not re-checked in this pass. Image usage rights for `hero-home.jpg` not confirmed.                                                                                                                                                                                                                                                                 |
| 2026-09-16 | Service SEO pages, dropdown nav, pricing quote table                                                                                            | Typecheck clean. HTTP 200 on service + pricing pages. `/services` 308 → airport transfer. Dropdown and JSON-LD present in HTML.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | No owner-approved fares. Dropdown interaction not click-tested in the browser.                                                                                                                                                                                                                                                                                         |
| 2026-09-17 | Mobile homepage Add return under pickup date                                                                                                    | 390×844: stacked (pickup then Add return). 1280: side by side. Hourly hides Add return.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Mobile sheet not re-checked.                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-16 | Homepage booking bar restored; inner-page hero Book now removed                                                                                 | See changelog below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Mobile 390 viewport and full booking submit not re-checked in this pass until browser verification completes.                                                                                                                                                                                                                                                          |
| 2026-09-18 | Nav regrouped (Point To Point / By The Hour / City Tours); public pages cut to hero+footer; hero widget on service pages presets the ride state | Real browser (Chrome via Playwright), dev server `http://localhost:4321`. 25 routes HTTP 200 (404 for an unknown path). Every stripped page renders exactly one `main` block (`section.hero`) plus the footer; `/booking` and `/contact` keep their form section; `/booking/confirmation` keeps its message section. Nav dropdowns = Point To Point, By The Hour, Business; links = Help. Mobile 390: panel now `position: fixed`, x=0 w=390 h=766 in an 844 viewport, `overflow-y: auto`, last row reachable. Service pages: hero widget present on all six P2P/hourly pages; `draft.serviceType` = airport_transfer / point_to_point / hourly_charter / hotel_transfer per page. Two real submits: `/services/local-chauffeur` → `serviceType: hourly_charter` + `durationHours: 2`, no destination; `/services/local-transfers` → destination present, no `durationHours`. `pnpm typecheck` clean (65 files, 0 errors/warnings/hints); `pnpm test` 29/29; `pnpm build` complete incl. new `/services/city-tours`. | `pnpm lint` (`prettier --check .`) still fails on `404.astro`, `booking.astro`, `contact.astro` — verified pristine vs HEAD, so pre-existing, not introduced here. `privacy`/`terms` body text is now removed from the rendered page (recoverable from Git). Cross-border and wedding copy is draft, not owner-verified. Not a deployed preview; admin area untouched. |

## Change log

### 2026-09-18 — Nav regrouped, pages cut to hero+footer, service heroes carry the booking widget

- Changed: nav is now **Point To Point** (Airport Transfer, Cross Border Rides, Local Transfers), **By The Hour** (Local Chauffeur, Weddings, City Tours), Help, and Business. Removed the Airport ride / City rides / Hourly entries. Four new service records (`cross-border-rides`, `local-transfers`, `local-chauffeur`, `weddings`) plus `city-tours`; Airport Transfer reuses `/services/airport-transfer`.
- Changed: every public content page renders the hero and the global footer only. `/booking` and `/contact` keep their form section, and `/booking/confirmation` keeps its message, because those pages exist to host a form or an outcome.
- Changed: `/services/*` heroes now embed the same hero booking widget as the homepage, preset per page — `point_to_point` on Point To Point pages, `hourly_charter` on By The Hour pages, `airport_transfer` on the airport page — and the sticky mobile Book now bar is off there, matching the homepage. `BookingForm` gained `initialServiceType`, applied once on mount and skipped when the visitor has already started typing (`isDirty`).
- Changed: mobile menu panel is now viewport-fixed with a scroll cap. It was `position: absolute` inside `.header-actions` (`position: relative`), so the open menu measured 150×983 px at 390 px wide — a narrow column pinned to the right edge, hanging off an 844 px viewport with no scroll.
- Decision/evidence: owner asked for the hero+footer cut, the two new nav groups, a genuine mobile dropdown fix, then the hero widget with the right ride state plus a City Tours page. Owner chose to keep Help and Business, to reuse existing service pages where they fit and create the missing ones, and to keep the forms on `/booking` and `/contact`.
- Verified: see the 2026-09-18 row in the verification record. Real-browser measurements and two real booking submissions, not markup inspection alone.
- Not verified or follow-up: `privacy`/`terms` prose is gone from the rendered page pending rewritten content. The footer Services column still lists the older pages (`hotel-transfer`, `point-to-point`, `sightseeing`, `hourly-charter`), which are no longer in the nav. Cross-border, wedding, and city-tour copy is draft and needs owner verification before launch. Mobile bottom sheet not re-checked. The admin area was left as-is.
- Pre-existing defect found while verifying, not fixed here: `/booking` hydrates unreliably (~4 of 10 fresh loads) with `Hydration failed… <BookingSheet> + <div className="booking-sheet">`. `BookingPage` calls `openBooking()` in a mount effect, so when `BookingPage` wins the hydration race against `BookingSheet`, the sheet's client render no longer matches the server's empty markup. Both files are pristine at HEAD and neither is touched by this change. Likely fix: gate `BookingSheet`'s render on a `mounted` flag.
- Pre-existing defect found while verifying, not fixed here: `/favicon.ico` returns 404 (`public/` holds only `images/` and `robots.txt`, and `BaseLayout` declares no icon link), so every page logs a console 404.

### 2026-09-17 — Mobile Add return stacks under pickup date

- Changed: below 880px, Point to point places **Add return** on its own full-width row under the pickup date. Desktop (≥880px) still keeps Add return beside pickup. Hourly still hides Add return.
- Decision/evidence: user selected the homepage Add return control and asked to put it below the pickup date on mobile.
- Verified: `http://localhost:4322/` at 390×844 — pickup date `y=503` full width, Add return `y=552` same x and width. Desktop 1280 — both `y=547`, Add return to the right of pickup (`x=764` vs `x=537`). Hourly at 390 hides Add return.
- Not verified or follow-up: mobile bottom-sheet booking form; roundtrip combined chip on a phone.

### 2026-09-17 — Booking island loads a single React copy

- Changed: local HTML now rewrites island renderer URLs from Vite `deps_prerender` to `deps`. Astro was hydrating booking islands with a second React copy (`The booking form could not load` / invalid hook call).
- Decision/evidence: homepage showed “The booking form could not load” with `Invalid hook call` / `useSyncExternalStore` of null from two Vite React hashes.
- Verified: homepage at `http://localhost:4322/` shows the booking bar. By the Hour switches to Location + Duration at 2 Hours. Island `renderer-url` is `/node_modules/.vite/deps/` rather than `deps_prerender`.
- Not verified or follow-up: Vite prerender still logs an invalid-hook warning while generating BookingSheet HTML; production bundles are unaffected.

### 2026-09-17 — Hourly duration stepper

- Changed: By the Hour shows a Duration number picker (minimum and default 2 hours, maximum 12). The create schema requires `durationHours` for hourly charter; the Worker stores it in booking notes as `Duration: N hours.` until a dedicated column exists.
- Decision/evidence: user asked for a duration number picker on hourly, starting from 2 hours.
- Verified: `pnpm test` 29/29; typecheck clean; `astro build` complete. Production preview on `http://localhost:4323/`: By the Hour shows Location, pickup date, Duration starting at **2 Hours** with minus disabled; plus steps to 3 Hours; Point to point hides Duration and restores From / To / Add return.
- Not verified or follow-up: mobile sheet duration layout; dedicated D1 duration column. Dev-server HMR can still empty the hero island until a full reload.

### 2026-09-17 — B2B pages follow group portfolio; legal names adopted

- Changed: recorded legal names as Kai Yue Group Limited and Kai Yue Travel Group Limited. Rewrote `/corporate`, `/business/travel-agency`, `/business/hotels-resorts`, and About from the group portfolio. B2C booking copy stays Macau quote-after-review. Website forms remain human-reviewed inquiries.
- Decision/evidence: owner said the group-portfolio legal name is correct and B2B should follow that document.
- Verified: desktop pass of `/corporate` (alliance, 200 Alphards, four scenarios, programme phones, inquiry form fill/submit), `/business/travel-agency`, `/business/hotels-resorts` (Venetian wording), `/about` legal names, `/contact` phone split, homepage still Macau quote-after-review. Mobile 390: corporate hero + contact phones. Typecheck clean.
- Not verified or follow-up: inquiry did not persist (no local D1). B2C phone/hours vs B2B phones still split. This site still has no live GPS, instant dispatch, or payment.

### 2026-09-17 — Kai Yue Group portfolio English translation and alignment

- Changed: added English translation of the group-portfolio Chinese source at `c:\cursor\Kaiyue-website\Kai-Yue-Group-Website-Content.md`. Recorded alignment and conflicts in `BUSINESS_INFORMATION.md`. Public site copy was not changed.
- Decision/evidence: user supplied `凱悅集團-網站內容.md` as another Kai Yue business portfolio and asked to translate it and check it against this repo’s business file.
- Verified: side-by-side read of both documents; alignment table written from that comparison.
- Not verified or follow-up: none of the group-document claims (200+ fleet, new phones, 24/7, dual-plate, SLAs) were independently confirmed. Owner still must choose which source is canonical for this website.

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

### 2026-09-17 — Pickup-only calendar is one month

- Changed: the date popover shows one month when pickup is the only date (hourly, or point-to-point before Add return). Dual-month remains after a return is added.
- Decision/evidence: user selected the dual-month pickup calendar and asked for a single month when pickup is the only active picker.
- Verified: desktop homepage pickup-only popover shows September 2026 only. After Add return, September and October both appear with pickup and return footer rows.
- Not verified or follow-up: hourly single-month calendar; mobile popover.

### 2026-09-17 — Hourly booking bar hides To and return

- Changed: ride toggle label is **Point to point**. Selecting **By the Hour** hides To, relabels From as Location, and hides Add return / return dates. Switching to hourly clears destination and return from the draft.
- Decision/evidence: user asked to rename Transfer and make the widget dynamic for hourly (location only, no return).
- Verified: desktop homepage. Point to point shows From, To, Add return. By the Hour shows Location and pickup date only (To and Add return gone). Switching back restores From / To / Add return.
- Not verified or follow-up: mobile sheet hourly layout.

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
