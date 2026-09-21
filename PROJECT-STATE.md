# Kai Yue Travel — Project State

**Last updated:** 2026-09-21
**Phase:** 2–3 — booking/API completion and lightweight admin workflow
**Overall status:** Two-channel booking enquiry workflow and operator UI implemented in-repo; not deployed or connected to real Cloudflare/Resend services.
**Current objective:** Finish local responsive/interaction validation of the refreshed public pages and booking/admin flows, then provision non-production D1, Resend, and Access for an end-to-end environment.

Language/menu refinement (2026-09-21): the header language control and its menu now use subtler rounded corners and translucent backgrounds. English remains the only functioning locale. Português and 繁體中文 appear as clearly unavailable, coming-soon options rather than linking to English content. The redundant “Macau · Quote after review · Human confirmation” line was removed beneath Home and consumer-service hero booking forms. Translating and publishing the two additional locales remains open.

Public content refinement (2026-09-21): inquiry cards on Contact, About, and B2B pages pair short fields and omit the long business-phone/hours/operations preamble. Home now has an image-led introduction, distinct Point To Point and By The Hour service cards, a request process, and a FAQ preview. Consumer service detail sections vary by point-to-point versus hourly; B2B, About, and Contact supporting sections use the existing local photographs, small icons, and more structured layouts. Image usage rights still require verification.

Navigation and WhatsApp refinement (2026-09-21): the WhatsApp communication tab now offers an optional validated number, persisted through the existing phone field and included in the prepared message when entered. Mobile header shows the globe language dropdown instead of General Enquiry; the mobile menu includes Contact Us. `/booking`, `/fleet`, and `/pricing` are retired, and the footer is grouped as Services, Company, and B2B Solution with phone/address beside the brand.

Homepage booking refinement (2026-09-21): Journey stays embedded in the hero, but Communication now opens the shared booking modal on desktop as well as mobile. The hero form unmounts while a modal is open, preventing duplicate booking forms. Closing a step-2 modal leaves a Continue request action in the hero to resume the draft. Communication-tab helper descriptions are smaller (0.78rem).

Mobile booking refinement (2026-09-21): input/select/textarea text is 16px at narrow widths; booking and date/time sheets have icon-only labelled close controls. Pickup and return use separate single-month mobile calendar views with a separate 24-hour time view. The user supplied three Transfeero mobile screenshots, and interactive browser inspection later confirmed its separate Pickup Date → Pickup Time sheets, one-month calendar, Back/Close controls, and date-sheet Save action. Kai Yue keeps the previously requested 24-hour-only time and explicit Confirm action.

Step-two UI refinement (2026-09-21): the sheet header subtitle, duplicate Communication kicker, and WhatsApp helper sentence are removed. The selected channel is black/white like the primary booking action; action buttons and booking choices use consistent rounded rectangles rather than pills. The Email response-time note and request consent copy remain.

The step-2 sheet now omits the black “Request a chauffeur” title bar, while retaining a screen-reader-only “Booking request” dialog title and the close button on white. Step 1 retains its standard title bar.

Step-2 progress is placed inside the white sheet header on the same row as the close icon, and its duplicate in the form is suppressed only for the sheet. The WhatsApp helper description is restored alongside the existing Email description.

Communication labels now read “Your Name,” “Your Email,” and “Your Message (optional).” Message is optional for both channels; Email still requires name and email. Blank messages persist as empty strings and are omitted from formatted notifications/deep links.

Public page-layout refinement (2026-09-21): home and consumer chauffeur service pages now share the embedded Journey → one Communication modal flow; their page content and service preset differ. Corporate Service, Corporate, Travel Agency, Hotels & Resorts, Contact, and About have one inquiry form in a two-column desktop hero, with at most two detail sections below. FAQ, Privacy, Terms, and the account notice have no photographic hero or form. The booking sheet and mobile booking trigger mount only on booking-enabled pages. Legal text is still draft pending review.

## Quick handoff

Kai Yue Travel now has an Astro 7 + React-islands public site, a Cloudflare Workers API with D1 persistence, Resend placeholders, and a lightweight admin area. The public visual system is a dark cinematic, booking-first layout: overlay header with a **Kai Yue** wordmark and a compact Point to point / Hourly booking bar. Home and consumer service pages embed Journey and open Communication in one modal; B2B and general inquiry pages use a two-column hero with an inquiry form; FAQ and legal pages have no hero or form. The standalone `/booking` route has been removed. Public APIs only create bookings and inquiries. Admin APIs require Cloudflare Access claims, with a development-only bypass.

No Cloudflare account, D1 database, Resend domain, or Access policy has been provisioned. Secrets are env placeholders only. B2C copy is conservative (Macau, quote-after-review). B2B pages publish owner-approved group-portfolio claims (alliance, dual-plate GBA, 200+ Alphards, 7×24, Venetian wording). CI uses the single pnpm version from `package.json` (`pnpm@10.15.0`).

## Confirmed decisions

- B2C booking conversion is the primary website goal.
- Corporate/B2B content and inquiries are secondary but included.
- Desktop home hero includes the booking widget.
- Mobile reuses the same booking form in an accessible bottom sheet/modal on booking-enabled consumer pages.
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
- Public-site visual system follows `docs/design-refs/transfeero-desktop.jpg` and `docs/design-refs/transfeero-mobile.png` (dark overlay header, gold mark + Kai Yue wordmark, compact booking bar, dark footer). The journey bar uses a custom calendar/time picker instead of the native datetime control. B2C copy remains Macau-only and quote-after-review. B2B pages (`/corporate`, `/business/travel-agency`, `/business/hotels-resorts`) follow the group portfolio. Home and consumer service pages embed one shared booking flow; inquiry pages show one hero form; FAQ/legal/account pages show neither booking nor inquiry forms.
- Each chauffeur service has an SEO landing page under `/services/[slug]`. Header Business is a dropdown to Travel agency, Corporate solution, and Hotels & resorts. `/services` redirects to airport transfer. Homepage service cards cover all six services. Standalone `/pricing`, `/fleet`, and `/booking` pages are retired.
- GitHub Actions `check` job is pinned to the `package.json` `packageManager` version only.
- Header navigation and motion (2026-09-18): `Help` is removed from the primary menu — `/faq` still exists and stays linked in the footer Company column. Every primary item is now a dropdown (`Point To Point`, `By The Hour`, `Business`, plus the added `City Tours` page). On mobile the same items are collapsed-by-default `<details>` submenus with a rotating chevron, animated reveal, and a panel that drops in under the header. `apps/web/src/scripts/header-menus.ts` owns all header menu behaviour: one menu open at a time (opening a dropdown or the language switch collapses whichever was open, and expanding a mobile group collapses its siblings without closing the panel), an outside click or tap closes the open menu, Escape closes it and returns focus to its summary, following a link closes it, tabbing out of the header abandons a desktop dropdown, and the mobile panel always reopens collapsed. Motion polish is site-wide: dropdown and submenu reveals, hamburger-to-close morph, wizard step entrances (`.booking-bar` / `.booking-fields`), mobile sheet entrance, and hover feedback on buttons, chips, nav items, footer links, cards and form fields. All of it is disabled under `prefers-reduced-motion` and hover effects are gated behind `(hover: hover) and (pointer: fine)`.
- Motion/behaviour was verified in headless Chrome against the local dev server, not by inspection: submenus closed on load, expand on tap, opening a second dropdown or the language switch collapses the first, an outside click closes, Escape closes and refocuses the summary, following a link closes, tab-out closes, the desktop dropdown animates with the chevron flipping, the wizard's step 2 mounts with its entrance animation, the field focus ring resolves to `border #111` + a 4px ring, and the hover lift measures as `translateY(-1px)` / `translateX(2px)`. `pnpm typecheck`, `pnpm test` (29 tests) and `pnpm build` pass.
- Booking-widget dev crash root-caused and fixed (2026-09-18). Symptom: the booking widget stops rendering — the islands arrive with no markup and never hydrate, so the page has no form. Cause: under `@astrojs/cloudflare` the workerd/SSR graph is its own Vite environment; when a request pulls in a bare import Vite has not pre-bundled, the optimizer re-runs mid-session, flips the `?v=` hash on every optimized dependency URL, and workerd's module runner — which caches evaluated modules by that URL — ends up with two live React instances (null hook dispatcher, `Invalid hook call`), and `@cloudflare/vite-plugin`'s `ignoreOutdatedRequests` suppresses Vite's stale-dep retry so the session stays wedged until restart. Upstream: withastro/astro#17364. Fix: `@astrojs/cloudflare` 14.3.2 (pre-bundles the renderer server entrypoints and the console logger) plus a `configEnvironment` Vite plugin in `apps/web/astro.config.mjs` that pre-bundles this project's own island/server dependencies in the first optimization pass — `vite.ssr.optimizeDeps` never reaches that environment, which is why the previous attempt did nothing. `resend` and `astro/logger/console` were both observed being optimized lazily before they were listed.
- Booking-widget verification (2026-09-18): cold cache (`apps/web/node_modules/.vite` removed) + dev server restart, then 25 consecutive page loads after `ready in` — 25/25 rendered the form and responded to a click, with a single React bundle per load and no `dependency optimized` / `program reload` lines in the dev log; the same procedure before the fix was 3 bad loads with no booking islands at all. The built artifact (`dist/client`) is green on the same probe. `pnpm typecheck`, `pnpm test` (29) and `pnpm build` pass. Not verified: requests served _before_ `ready in` still return an empty shell (3–4 during startup) — a separate, still-open cold-start behaviour.

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
- Booking journey validation checks pickup, destination where applicable, and pickup date/time before advancing; the shared schema still validates the full request before submission.

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
| 2026-09-19 | Footer services column grouped like the header                                                                                                  | Real browser at 1440 and 390. `[Services]` renders the two groups only (Point To Point → Airport Transfer, Cross Border Rides, Local Transfers; By The Hour → Local Chauffeur, Weddings, City Tours); Pricing now sits in the Company column; no duplicate footer hrefs; 0 console errors. Mobile panel 390 wide, `overflow-y: auto`, 285 collapsed → 447 with a group expanded, all links reachable. `pnpm typecheck` 67 files clean; `pnpm test` 29/29.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `/booking` hydration race still reproduces 4/10 fresh loads. Brand mark still undecided (`mark.svg` vs the gold CSS diamond). Not a deployed preview.                                                                                                                                                                                                                  |

## Change log

### 2026-09-21 — Language menu styling and hero booking cleanup

- Changed: language control/menu corners and opacity; added visible coming-soon Portuguese and Traditional Chinese entries. They are intentionally not selectable because the website has no translated routes or content yet. Removed the shared hero booking status line from Home and service pages.
- Open: full translation, locale-aware routing and metadata, and language-switch behavior require a separate content/localization pass.
- Verified locally: mobile browser showed the translucent, softly rounded control and dropdown; the two upcoming languages were visible but had no misleading links. Escape closed the menu. Home accessibility/DOM no longer contained the hero status line. `pnpm typecheck` clean (65 files), `pnpm test` 35/35, `pnpm build` successful, and `git diff --check` passed. No locale switching or translated pages exist yet.

### 2026-09-21 — Compact inquiry forms and editorial public sections

- Changed: the shared Contact/About/B2B inquiry card now places name with company and phone with email in paired rows when space permits. Removed the B2B phone list, hours, and long operations explanation from the form card, keeping server-validated fields and the acknowledgement. The Contact page carries useful contact context below the hero rather than inside the form.
- Changed: Home gained an image-led introduction, distinct journey cards, a three-step human-reviewed request sequence, and an FAQ preview. Consumer service sections now distinguish point-to-point from hourly content and layout. Corporate, agency, hotel, About, and Contact sections use the existing local photography, inline decorative icons, and more deliberate editorial structure.
- Verified locally: typecheck clean (65 Astro/TS files), 35/35 tests pass, production build succeeds, and `git diff --check` passes. Browser checks showed paired contact fields at desktop and 390px, one Corporate inquiry form with no duplicate booking form or phone list in the card, and no horizontal overflow at 390px. Empty contact submission displayed friendly inline validation without sending a request. Point-to-point and hourly routes rendered distinct section headings with all local images loaded and one booking form each. No real contact submission, notification, or deployed visual test was performed.
- Open: final image usage rights, content approval, real D1/Resend/Access configuration, and deployed responsive/accessibility validation.

### 2026-09-21 — Shared consumer booking flow and inquiry-page layouts

- Changed: home and consumer point-to-point/hourly service routes embed the same Journey form and use one Communication modal; booking infrastructure is mounted only on those routes. Corporate Service, the three B2B routes, Contact, and About have a single inquiry form in a two-column desktop hero. FAQ, Privacy, Terms, and the account notice have plain content without a hero or form. Supporting page details are limited to two sections below the hero.
- Source: existing business and service content in `BUSINESS_INFORMATION.md` and the site's owner-directed B2B portfolio copy. No live availability, pricing, or new operational promises were introduced.
- Verified locally: one booking form on a consumer service page; opening Communication unmounts its hero form, leaving one sheet form. Hourly service preset works. Corporate renders one inquiry form, no booking form, and stacks without horizontal overflow at 390px. FAQ renders no form or hero. Route responses, typecheck, tests, and build passed. No real email, WhatsApp, D1, or production submission was exercised.
- Still open: privacy/terms need legal approval; final content and deployment verification remain outstanding.

### 2026-09-19 — Footer services column grouped like the header; favicon fixed

- Changed: the footer's Services column is now the two service groups rather than one flat run of every service record. `site.ts` gained `serviceGroups`, and `nav` and the new `footerServiceGroups` both spread it, so the header menus and the footer services column cannot drift apart. `footerServiceNav` (every service record plus Pricing) is gone.
- Changed: Pricing moved out of the Services column into the Company column. It is not a service, so under the grouping it read as a fourth item under _By The Hour_.
- Changed: `BaseLayout` declares `<link rel="icon" href="/images/mark.svg" type="image/svg+xml">`, which clears the `/favicon.ico` 404 that every page logged. Note `mark.svg` is the four-colour K; the header logo mark is a gold CSS diamond, so the two do not match yet — the brand mark still needs an owner decision.
- Decision/evidence: owner asked for the footer to be grouped according to the services.
- Verified: real browser, dev server `http://localhost:4321`. Desktop 1440 and mobile 390 both render `[Services]` = Point To Point (Airport Transfer, Cross Border Rides, Local Transfers) and By The Hour (Local Chauffeur, Weddings, City Tours), with no stray links in the column and no duplicate footer hrefs. 0 console errors on both widths. Mobile panel still `position: fixed`, 390 wide, `overflow-y: auto`, collapsed height 285 → 447 with a group expanded, every link reachable. `pnpm typecheck` clean (67 files, 0 errors/warnings/hints); `pnpm test` 29/29.
- Still open: the `/booking` hydration defect below still reproduces at the same ~4 of 10 fresh loads after `04f637b`; that commit fixed a different fault (two live React instances from mid-session dependency re-optimisation), so this race is separate and unfixed. The header's Help entry was removed by `05732fd`, not by the 2026-09-18 change; FAQ remains in the footer's Company column.

### 2026-09-18 — Nav regrouped, pages cut to hero+footer, service heroes carry the booking widget

- Changed: nav is now **Point To Point** (Airport Transfer, Cross Border Rides, Local Transfers), **By The Hour** (Local Chauffeur, Weddings, City Tours), Help, and Business. Removed the Airport ride / City rides / Hourly entries. Four new service records (`cross-border-rides`, `local-transfers`, `local-chauffeur`, `weddings`) plus `city-tours`; Airport Transfer reuses `/services/airport-transfer`.
- Changed: every public content page renders the hero and the global footer only. `/booking` and `/contact` keep their form section, and `/booking/confirmation` keeps its message, because those pages exist to host a form or an outcome.
- Changed: `/services/*` heroes now embed the same hero booking widget as the homepage, preset per page — `point_to_point` on Point To Point pages, `hourly_charter` on By The Hour pages, `airport_transfer` on the airport page — and the sticky mobile Book now bar is off there, matching the homepage. `BookingForm` gained `initialServiceType`, applied once on mount and skipped when the visitor has already started typing (`isDirty`).
- Changed: mobile menu panel is now viewport-fixed with a scroll cap. It was `position: absolute` inside `.header-actions` (`position: relative`), so the open menu measured 150×983 px at 390 px wide — a narrow column pinned to the right edge, hanging off an 844 px viewport with no scroll.
- Decision/evidence: owner asked for the hero+footer cut, the two new nav groups, a genuine mobile dropdown fix, then the hero widget with the right ride state plus a City Tours page. Owner chose to keep Help and Business, to reuse existing service pages where they fit and create the missing ones, and to keep the forms on `/booking` and `/contact`.
- Verified: see the 2026-09-18 row in the verification record. Real-browser measurements and two real booking submissions, not markup inspection alone.
- Not verified or follow-up: `privacy`/`terms` prose is gone from the rendered page pending rewritten content. The footer Services column still lists the older pages (`hotel-transfer`, `point-to-point`, `sightseeing`, `hourly-charter`), which are no longer in the nav. Cross-border, wedding, and city-tour copy is draft and needs owner verification before launch. Mobile bottom sheet not re-checked. The admin area was left as-is.
- Pre-existing defect found while verifying, not fixed here: `/booking` hydrates unreliably (~4 of 10 fresh loads) with `Hydration failed… <BookingSheet> + <div className="booking-sheet">`. `BookingPage` calls `openBooking()` in a mount effect, so when `BookingPage` wins the hydration race against `BookingSheet`, the sheet's client render no longer matches the server's empty markup. Both files are pristine at HEAD and neither is touched by this change. Likely fix: gate `BookingSheet`'s render on a `mounted` flag.
- Pre-existing defect found while verifying, not fixed here: `/favicon.ico` returns 404 (`public/` holds only `images/` and `robots.txt`, and `BaseLayout` declares no icon link), so every page logs a console 404. Fixed on 2026-09-19 — see the changelog.

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

### 2026-09-21 — WhatsApp number, mobile navigation, and footer segmentation

- Changed: added the optional WhatsApp number field using the existing validated/stored phone path, and include it in the prepared WhatsApp message only when supplied. Mobile header now shows the globe language dropdown instead of General Enquiry; its menu links to Contact Us. Removed the standalone `/booking`, `/fleet`, and `/pricing` pages and their public links. Footer groups Company and B2B Solution as requested, with business phone/address beside the brand.
- Decision/evidence: direct user request. The number remains optional because no new required-field rule was specified; Email's existing optional phone remains unchanged. The API/data schema already supports the phone field, so no migration is needed.
- Verified: targeted formatting, strict typecheck (63 files, no diagnostics), 35/35 tests, production build, and `git diff --check` passed. Local `/booking`, `/fleet`, and `/pricing` all returned 404, with no remaining exact public links. Browser at mobile width showed the globe/EN dropdown, Contact Us in the mobile menu, the requested footer groups, and a 16px WhatsApp number input in the sole step-2 modal. Desktop General Enquiry remains visible. The integration test verified number persistence and inclusion/omission in the WhatsApp link.
- Not verified or follow-up: deployed behavior, physical-device accessibility, real WhatsApp ownership, and real Resend delivery. The removed `/booking` fallback leaves a progressive-enhancement gap to address before launch.

### 2026-09-21 — Single communication modal at all widths

- Changed: the home hero now renders Journey only; Get a quote opens the shared step-2 modal on desktop and mobile. The hero form unmounts while that modal is open, and a Continue request button reopens it if closed with the draft still on step 2. Both communication helper descriptions use smaller 0.78rem text.
- Decision/evidence: direct user requests to remove the duplicate hero step-2 widget and use the same modal on desktop.
- Verified: mobile 390px and desktop 1280px browser checks found one step-2 form in the modal and none behind it; the desktop modal was centered at 640px. Both channel descriptions computed to 12.48px. Targeted formatting, typecheck, 35 tests, production build, and `git diff --check` passed after the desktop routing change.
- Not verified or follow-up: physical-device and screen-reader behavior, deployed preview.

### 2026-09-21 — Optional booking message and personal field labels

- Changed: added “Your” to name, email, and message labels; made message optional for both communication channels in shared client/server validation; omitted empty message lines from WhatsApp links and staff email details. Email name/address requirements remain.
- Decision/evidence: direct user request. The existing booking table already stores an empty message string, so no migration is required.
- Verified: mobile browser showed “Your Name *”, “Your Email *”, and “Your Message (optional)” in Email, plus the optional message label in WhatsApp. Shared-schema tests accept whitespace/omitted messages while retaining Email contact requirements; integration tests persist blank messages and omit the empty WhatsApp line. `pnpm test` 35/35, `pnpm typecheck` clean, targeted Prettier check, `git diff --check`, and production build passed.
- Not verified or follow-up: real Resend delivery, deployed preview, physical-device form entry.

### 2026-09-21 — Align progress with step-two close control

- Changed: moved the Journey → Communication progress list to the white step-2 sheet header beside X; the embedded/page form still shows its own progress list. Restored the WhatsApp helper description beneath its selected tab, matching the Email description placement.
- Decision/evidence: direct user request.
- Verified: 390px browser inspection showed Journey → Communication aligned with X, no duplicate progress row in the sheet body, and both WhatsApp and Email descriptions beneath their tabs. A 320px browser check found no horizontal overflow. `pnpm test` 32/32, `pnpm typecheck` clean, targeted Prettier check, `git diff --check`, and production build passed.
- Not verified or follow-up: physical-device and screen-reader testing, deployed preview.

### 2026-09-21 — Remove step-two title bar

- Changed: step 2 uses a white minimal close-control row instead of the black “Request a chauffeur” header; its accessible dialog title is “Booking request.” Step 1 header is unchanged.
- Decision/evidence: direct user request to remove that header from step 2.
- Verified: mobile 390px browser screenshot showed a white sheet top, visible X close control, and communication question in place of the black title bar; the accessibility tree identified the dialog as “Booking request.” `pnpm test` 32/32, `pnpm typecheck` clean, targeted Prettier check, `git diff --check`, and production build passed.
- Not verified or follow-up: physical-device and screen-reader testing, deployed preview.

### 2026-09-21 — Simplified communication step

- Changed: removed the sheet header's secondary tagline, Communication kicker, and WhatsApp helper sentence; tightened communication-field spacing; selected channel is black with white text; standard buttons and booking choices use rounded-rectangle corners.
- Decision/evidence: direct owner UI request. Interpreted “primary color” as the existing black action color, while retaining gold for restrained brand accents.
- Verified: mobile browser at 390px showed the simplified WhatsApp and Email layouts, visible selected black channel, and matching 11.2px button radii; a final screenshot after spacing changes confirmed the WhatsApp layout. `pnpm test` 32/32, `pnpm typecheck` clean, targeted Prettier check, `git diff --check`, and production build passed.
- Not verified or follow-up: physical-device touch/zoom and deployed preview. Consent copy and Email response-time note intentionally remain.

### 2026-09-21 — Mobile booking-sheet and date/time refinement

- Changed: mobile text-entry controls use 16px; booking sheet has a labelled X close button and safe-area padding; mobile pickup and return use distinct one-month calendar sheets, with a standalone 24-hour time view and labelled Back/X controls. Confirm can complete the active mobile leg independently; return dates before pickup are disabled and a same-day return must be later than pickup.
- Decision/evidence: direct user request and three supplied screenshots; later interactive browser inspection of Transfeero confirmed the one-month separate-leg date sheets and separate time view. Kai Yue deliberately retains its 24-hour-only picker and required explicit time selection.
- Verified: mobile 390×844 browser pass showed one pickup month, disabled Confirm until an hour was actively selected and saved, Confirm closing the pickup sheet, separate Return Date sheet on Add return, and 16px computed font for visible inputs. The booking sheet rendered its X close control and displayed the keep/discard draft safeguard. `pnpm test` 32/32, `pnpm typecheck` clean, targeted Prettier check, and production build passed after the final layout refinement.
- Not verified or follow-up: physical iOS zoom behavior, screen-reader and touch-device interaction, and deployed preview.

### 2026-09-21 — Explicit calendar time selection and confirmation

- Changed: newly selected pickup/return dates stay pending without a committed time; the time Save control requires an explicit interaction; time uses a fixed 24-hour hour/minute picker with no 12h or AM/PM mode; a calendar Confirm button closes the picker only after enabled journey legs have complete date/time values; the pickup-day highlight is now translucent charcoal.
- Decision/evidence: direct user request on 2026-09-21.
- Verified: `pnpm test` 32/32; `pnpm typecheck` clean. Live desktop browser pass confirmed Select time, disabled Save/Confirm before interaction, enabled Save/Confirm after explicit time selection, Confirm closes the picker, and the softer pickup highlight is visually distinct from return.
- Not verified or follow-up: physical-device mobile interaction and screen-reader announcement wording.

### 2026-09-21 — Two-channel booking workflow and operator dashboard

- Changed: replaced the header Sign in chip with a WhatsApp General Enquiry action; changed booking to a two-step Journey → Communication flow; added WhatsApp message handoff and Email/Resend fields; persisted both channels before side effects; added migration `0002` for `enquiry`/`assigned`/terminal stages and communication fields; redesigned the admin dashboard with KPIs, recent enquiries, manual booking entry, status changes, and remarks.
- Decision/evidence: direct user request on 2026-09-21. The configured WhatsApp number currently uses the source-listed B2C number `+853 2833 8882` and still requires owner confirmation that it is WhatsApp-enabled.
- Verified: `pnpm typecheck` clean; `pnpm test` 32/32; `pnpm build` successful. Migration tests apply both migrations to a fresh in-memory database. Applied migration `0002` to the local Wrangler D1 store. Live browser pass: desktop header action, mobile 390px date picker from the bottom edge, mobile Journey → Communication sheet, WhatsApp/Email tabs and required Email fields, dashboard KPI/recent-enquiry layout, migrated `enquiry` labels, filters, and manual booking/remarks form. No browser console errors. Resend remains safely skipped without a key.
- Not verified or follow-up: real WhatsApp destination ownership; real Resend domain/sender/recipient and actual email delivery; remote Cloudflare D1/Access; deployment. Repository-wide `pnpm lint` still reports pre-existing formatting drift outside the files changed for this feature.

For the next meaningful change, update the header and relevant sections above, then append:

```md
### YYYY-MM-DD — Short change title

- Changed:
- Decision/evidence:
- Verified:
- Not verified or follow-up:
```
