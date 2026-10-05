# Kai Yue Travel — Project State

**Last updated:** 2026-10-05 (City Tour work on main, CI passed)
**Product-status evidence date:** 2026-10-05 for City Tour booking UI; previous booking/admin evidence remains dated 2026-09-27.
**Phase:** 2–3 — booking/API completion and lightweight admin workflow
**Overall status:** Two-channel booking enquiry workflow and expanded operator UI implemented in-repo; a temporary local dashboard login is verified. Nothing is deployed or connected to real Cloudflare/Resend services.
**Current objective:** Owner review of the three City Tour packages: Special offer, Half day (6 hours), and Full day (10 hours), each with a car and driver. Supply any approved special-offer terms and pictures before publication. Staff package editing remains out of scope. Prior booking/admin hardening and production access decisions remain open.

City Tour planning (2026-10-03, documentation only): [Latest discussion record](docs/records/2026-10-03-city-tour-future-planning.md) distinguishes implemented Markdown catalogue/pages from future package-detail presentation, the welcomed but deferred City Tour booking mode, and a reopened staff-editor option. Half-day 6 hours/full-day 10 hours supersede illustrative 4/8-hour examples. Real offers, prices, itineraries, booking placement, content source of truth, staff roles/workflow, hosting publication and costs remain to be clarified. No UI, API, schema, booking or CMS was changed in this planning increment.

City Tour UI (2026-10-03): `/services/city-tours` now has a dedicated hero without booking, a direct desktop/mobile menu entry, and feature-image cards linking to individual Markdown package pages. Add a file in `apps/web/src/content/city-tours/` and its image in the public asset directory; the build generates the card and English, Portuguese, and Traditional Chinese routes. Four frontmatter fields are required; translations are optional, with explicit English fallback. Three sample themes remain labelled drafts and noindex; their content, routes, pricing, inclusions, availability, translations, and image use require owner review. [Authoring guide](docs/12-city-tour-packages.md) and [task evidence](docs/records/2026-10-03-city-tour-catalogue.md) record verification and limits. This is an uncommitted local change, not user acceptance or release.

City Tour booking (2026-10-05): the header City Tours item is a dropdown for Special offer, Half day (6 hours with a car and driver), and Full day (10 hours with a car and driver). The earlier heritage, waterfront, and visitor-selected-stops samples are removed. Each package hero embeds the shared widget with City tours and that package selected. The homepage shows the same three packages as image cards; Book now opens that package page and uses the booking-widget green. The catalogue hero still has no form. No fare is published. Step 2 of the shared form collects big luggage and hand carry (0–10). This work is on `main` at `a9b953e`. GitHub CI run 37293798248 passed. `user_accepted` and `released` are not established. [Task evidence](docs/records/2026-10-05-city-tour-booking.md). Staff editing and publication remain open.

Codex workflow documentation (2026-10-03): [Project adapter](docs/11-codex-workflow-adapter.md) and [dated adoption record](docs/records/2026-10-03-codex-workflow-adoption.md) route substantial tasks through current source, bounded file ownership, behavioral checks, independent review, and precise closeout statuses. This documentation-only adoption does not rerun the 2026-09-27 booking/admin checks or establish production readiness. The pre-existing uncommitted local readiness entry below remains intact.

End-to-end readiness check (2026-09-27): A real local Chrome run completed Home → journey validation → date/time selection → Email communication → API 201 → visible reference. Local D1 contained the matching enquiry (`KY-TUCA24PU`); notification state was `skipped` because local Resend is unconfigured. A 390 px service-page run rendered the hourly form and date dialog without horizontal overflow. Anonymous `/admin` redirected to `/login`, and the admin summary API returned 401. Authenticated dashboard browser testing could not run because the temporary local access has expired. The isolated session integration test passed. All 43 tests, type checking, and production build passed separately; the full CI chain stops at Prettier issues in 74 existing files. Production readiness is **not established**: no production stack, production access policy, real notification delivery, deployed end-to-end test, or owner acceptance is verified.

Public localization (2026-09-27): English public routes now have Portuguese (`/pt`, `pt-PT`) and Traditional Chinese (`/zh-Hant`) counterparts across Home, About, Contact, FAQ, legal drafts, booking confirmation, six service pages, and three B2B pages. The language switch keeps the page context; public metadata, navigation, booking/inquiry forms, feedback, date display, API booking confirmation, and prepared WhatsApp requests are localized. Form submissions carry the selected locale and source path. Protected admin pages remain outside scope. Mobile browser checks passed for representative pages and forms, including mocked contact submission in both added locales. The isolated admin-session test now sets its own temporary expiry, so local `.dev.vars` cannot make that test fail after the real local access expires. The full `pnpm run ci` gate passed: formatting, type checking, 43 tests, and production build. Draft translation wording, especially B2B facts and legal text, needs native-language and business-owner review before any production publication. No deployment was made.

Booking-widget stability (2026-09-27): The local middleware had been changing Astro's renderer path from `deps_prerender` to `deps` while leaving the prerender optimizer's `?v=` version on an immutable browser URL; the two optimizer versions were confirmed different. Booking islands now use client rendering, and the local renderer URL resolves through Vite's uncached `/@id/` entry. This removes the booking islands from the workerd/prerender React render path that had produced invalid-hook errors. Browser verification and quality gates are recorded below.

About voice refinement (2026-09-27): public `/about` copy now uses a more natural company voice after the initial first-person pass repeated `we` and `our` too often. Company and partner names, sentence fragments, and selective first-person phrasing provide variety. Source and verification notes remain in project documentation. This is a local copy change, not a new approval of the underlying business claims.

About portfolio expansion (2026-09-27): `/about` now presents the Macau company story and milestones, four service/partner areas, the three alliance roles, group-level business mobility and operating area, service philosophy, and a closing inquiry form. The page uses the owner-directed group portfolio while distinguishing Macau consumer travel from B2B Macau–Mainland programmes. Current fleet scale, routes, dispatch hours, and alliance roles still require business-owner reconfirmation before production publication. No deployment was made.

Public-route cleanup (2026-09-27): the six footer-linked service routes are the only generated `/services/[slug]` pages. Five older service records that were absent from the footer and header have been removed. Home, About, Contact, FAQ, Privacy, Terms, the three B2B pages, and functional routes remain. The image set follows the current footer-linked service and B2B page list.

Illustrative Home/service/B2B images (2026-09-27): the six footer-linked service pages and three B2B Solution pages each have a generated hero and featured image; Home uses a generated family-focused hero and reuses the existing About story image in its main section. The Local Chauffeur hero was replaced by a rear-passenger view of the driver. The user-supplied Alphard 40 Series photos guided body shape; generated exterior scenes use ordinary factory-style wheels. The AI-generated scenes are illustrative drafts, not evidence of actual Kai Yue vehicles, people, partners, or trips. Other public pages retain their existing photography. The image set and its scene briefs are documented in `docs/10-illustrative-image-set.md`; business-owner image-use approval remains a publication gate.

Home featured-image revision (2026-09-27): after reviewing a generated front-cabin draft, the user chose to reuse the existing About story image for the Home main section. The generated draft remains unused locally. No production deployment was made.

About image refinement (2026-09-27, superseded): initial generated illustrative Macau office hero and posed team portrait were added. The hero was later replaced by a fleet photo, and the portrait was later replaced by an office command-center scene. Home continues using the existing family image. These generated people and premises are not Kai Yue staff or an actual Kai Yue office; owner review is required before publication. No production deployment was made.

About hero fleet revision (2026-09-27): at the owner's direction, the About hero now shows a fictional team and chauffeurs in front of a neatly parked Alphard 40 Series fleet and a modern building. The hero copy sits above the group, and its two buttons were removed to keep the team visible. The earlier office-workspace hero remains an unused local alternative. This generated group and fleet are illustrative, not actual company staff, vehicles, or premises; owner review remains required before publication. The hero was checked in 1440 px and 500 px browser screenshots, and the production build passed; a narrower mobile crop was not reliably verified by the headless browser screenshot.

Featured-image revision (2026-09-27): the About history section now uses a generated illustrative office command-center scene with staff working at desks and route displays instead of the posed team portrait. All overlaid labels on featured photos were removed across Home, About, Contact, consumer service pages, and B2B pages at the owner's request. Descriptive image alt text remains. The scene is not evidence of actual Kai Yue staff, systems, or premises; owner review remains a publication gate. The changed files passed Prettier, `git diff --check`, type checking, 43 tests, and production build; source search found no remaining featured-photo labels. The repository-wide lint gate still reports 75 unchanged files outside this edit, so the full `pnpm run ci` chain stops at lint. No production deployment was made.

Primary navigation refinement (2026-09-27): About Us is the final direct link in the desktop primary navigation. The mobile menu retains its existing single About Us link. The link uses the existing current-page state on `/about` and its localized counterparts. The desktop header begins at 1024 px so the added item does not force the pill navigation to wrap at narrower widths. Browser screenshots at 1047 and 1024 px showed a single-line desktop pill; 900 px showed the compact header. The production build passed. The owner requested commit and push to `main`; no manual deployment was requested.

About contact refinement (2026-09-27): the closing inquiry section now shows the existing public contact number and Macau office address in place of the private-journeys and partnership summaries. The contact form remains beside those details.

Public accent refinement (2026-09-27): the website accent and section kickers now use the owner-specified `#f3a600`. Related orange shades were aligned for light-surface text and badges. Non-booking primary actions remain black or white. No production deployment was made.

Site canvas refinement (2026-09-27): the outer `html` and `body` backgrounds now use the owner-specified `#008c5e`. Main content and regular sections have explicit white surfaces so the outer color does not show through; muted and dark sections retain their backgrounds. Heroes use a dark fallback behind their photographs. A local FAQ browser screenshot confirmed the white content surface, and formatting, diff checks, and production build passed. This is a local visual change; no production deployment was made.

Booking-widget accent refinement (2026-09-27): the pickup, destination, date, and add-return icons and Journey → Communication progress markers use the site's `#f3a600` accent. Booking request buttons, selected ride and communication choices, selected calendar days and times, and date/time Save or Confirm buttons use a lighter gradient starting at the owner-specified `#008c5e`, with dark text. Non-booking actions keep their prior styling. No production deployment was made.

Service copy refinement (2026-09-27): metadata, hero summaries, overviews, and detail cards across the service routes now describe each journey and its use cases rather than repeating review/confirmation language. Booking-status explanations remain in the booking flow and relevant FAQs. Service claims remain limited to the current Macau-first scope and known service boundaries.

Mobile navigation refinement (2026-09-27): the mobile dropdown is a contained dark glass panel with clearer expandable service/Business groups, active states, and an About Us link in place of Contact Us. The desktop navigation and footer links remain in their existing locations.

B2B content enrichment (2026-09-27): the corporate, travel-agency, and hotels/resorts pages now give fuller programme context from the owner-directed group portfolio while retaining one inquiry form and two detail sections per page. Current fleet scale, routes, hours, B2B contact ownership, alliance roles, and the Venetian relationship still require business-owner reconfirmation before production publication.

Temporary dashboard access (2026-09-21): a local-only Better Auth operator account was created in the development D1 database and allowlisted through ignored `.dev.vars`. The one-time setup token was removed. `TEMP_ADMIN_EXPIRES_AT` closes this local access after 24 hours (2026-09-22 10:58 UTC / 18:58 Macau); the record remains until explicitly removed. The in-app browser showed the authenticated `/admin` dashboard with loaded KPI cards and booking links. No production account, credential, or policy was changed.

Admin dispatch update (2026-09-21): bookings now have a redesigned paginated table, editable journey/contact fields, explicit status controls, and driver/vehicle assignment. The calendar uses React Calendar with a daily agenda. A protected Drivers & vehicles inventory page stores contact details, active state, and capacity. Migration `0003_dispatch_inventory.sql` was applied to the local development D1 only; it has not been applied remotely. Assignment validates active records and passenger capacity, but does not detect schedule conflicts or send driver/customer notifications. Browser automation could not load its request-header policy, so visual interaction QA of these changes remains open; local route/API smoke checks, typecheck, tests, and build are the current verification boundary.

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
- Admin scope is dashboard snapshot, bookings, calendar, contacts, and staff-managed dispatch inventory/assignments.
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

City Tour next action (2026-10-05): review the homepage package cards and each package page in the browser, then provide approved special-offer terms and real pictures before publication. Keep unapproved records hidden before any separately authorized release. Staff editing and special-offer prices remain undecided.

1. Check the booking widget in the existing in-app browser tab after a reload, then verify the booking flow on a non-production preview before release.
2. Browser-check the mobile booking sheet (not the homepage hero card) for duration, calendar, and Add return stack.
3. Confirm service types, booking fields, and customer confirmation language.
4. Provision non-production Cloudflare Workers, D1, Access, and Resend placeholders—without committing secrets.
5. Apply `migrations/0001_init.sql` to a local/preview D1 and verify the slice with real bindings.
6. Continue business validation of facts before replacing draft copy. Commission original photography to replace the hero crop.

Workflow resume action (2026-10-03): the owning agent should trial a bounded read-only task using the [adapter](docs/11-codex-workflow-adapter.md), return evidence to the Lab coordinator, and record actual acceptance and review evidence before changing shared policy. The user need not route routine work between chats.

## Verification record

2026-10-03 workflow adoption: 46 local Markdown links resolved; targeted Prettier and `git diff --check` passed; independent read-only review found no actionable issue. Source/revision provenance, dirty-state preservation, and limits are in the [adoption record](docs/records/2026-10-03-codex-workflow-adoption.md). This is `task_verified` for documentation only; no browser, API, D1, CI, or deployed behavior was checked in this task.

2026-09-27 booking-widget stability: After the change and again after a fresh local dev-server restart, headless Chrome rendered the widget on Home in English, Portuguese, and Traditional Chinese and on `/services/local-transfers` across 12/12 reloads in each pass, with no console errors. The visible Home widget switched to hourly fields on click and loaded one `react.js` resource. `pnpm run ci` passed: formatting, strict type checking (0 errors), 43/43 tests, and production build. The existing in-app browser tab and a deployed preview were not inspected.

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

### 2026-10-05 — City Tour handoff

- Shipped on `main`: `814f530` (packages, booking mode, luggage counts, green Book now) and `a9b953e` (Prettier so CI lint passes).
- GitHub CI on `a9b953e` passed: [run 37293798248](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/37293798248). Local typecheck had 0 errors, 49 tests passed, and the production build completed before that push.
- The local dev server on port 4321 was stopped. `user_accepted` and `released` are not established. Prices, real pictures, and staff editing remain open.

### 2026-10-05 — Booking luggage counts and package Book now color

- Package-page Book now uses the same green gradient as the booking widget button.
- Communication step (step 2) collects big luggage and hand carry as number dropdowns from 0 to 10. Big luggage uses the existing luggage column. Hand carry is stored in booking notes.
- Decision/evidence: owner direction on 2026-10-05. No luggage fee, size limit, or new database column was added.
- Verified locally: package Book now computed background matches the booking button gradient (`#008c5e` to `#2db883`, black text). Step 2 shows both dropdowns; selecting 2 big luggage and 1 hand carry keeps those values on the Email tab. At 390 px the fields stack and the page does not overflow. Booking contract and integration tests passed (23). Full CI and a stored enquiry with these counts were not rerun.

### 2026-10-05 — Footer City Tour links

- Changed: the footer Services column lists City Tours as its own group, with Special offer, Half day, and Full day. Those links open the package pages. City Tours is no longer a single link under By The Hour in the footer.
- Decision/evidence: owner direction on 2026-10-05.
- Verified: local Chrome at `http://localhost:4321`. Footer Services lists Point To Point, By The Hour, and City Tours. City Tours links to Special offer, Half day, and Full day. Full day opens `/services/city-tours/full-day`.

### 2026-10-05 — City Tour product page body

- Changed: each package page body is now a product block with a photo gallery, title, From price, description, and terms. No fare amount was added. Until `priceFrom` is supplied, the price reads From / On request. Gallery photos are existing illustrative images.
- Decision/evidence: owner direction on 2026-10-05 to make the package body look like a product page.
- Verified: local Chrome at `http://localhost:4321/services/city-tours/half-day`. The product block shows a large image with three thumbnails beside it. Choosing the second thumbnail changes the main image. At 390 px the thumbnails sit in a row under the main image, with no horizontal overflow. Price still reads From / On request.
- Limits: special-offer amount, discount, and real pictures remain open. Not a release.

### 2026-10-05 — Homepage City Tour cards

- Changed: the homepage now shows Special offer, Half day, and Full day as image cards. Each card uses the package feature image. Book now opens that package page. No fare was added.
- Decision/evidence: owner direction on 2026-10-05 to add a homepage City Tour section with package cards and a Book now action.
- Verified: local Chrome at `http://localhost:4321`. The homepage section lists Special offer, Half day (6 hours), and Full day (10 hours) with their feature images. Book now on Half day opens `/services/city-tours/half-day` with City tours and Half day selected. Portuguese `/pt/` shows the same three cards and localized package links. At 390 px the cards stack in one column with no horizontal overflow. No fare was added.
- Limits: packages remain drafts. Special offer and Full day still share an illustrative image. Not a release.

### 2026-10-05 — City Tour package types

- Changed: removed the heritage, waterfront, and visitor-selected-stops samples. City Tours in the header and mobile menu is a dropdown for Special offer, Half day (6 hours), and Full day (10 hours). Each package hero embeds the booking widget with City tours and that package selected. Each package is a car with a driver. No fare was added.
- Decision/evidence: owner direction on 2026-10-05.
- Verified: local Chrome at `http://localhost:4321`. City Tours dropdown lists Special offer, Half day, and Full day. Half day, Special offer, and Full day heroes open with City tours pressed and that package selected; durations are 6 hours, none, and 10 hours. Old heritage, waterfront, and your-own-stops URLs return 404. Catalogue returns 200. No fare was added.
- Limits: special-offer terms, real pictures, and publication remain open. Not a release.

### 2026-10-05 — City Tour package details and booking mode

- Changed: package pages show a key-details band under the feature image and open the shared booking sheet with that package selected. The shared widget adds a City tours mode with package, pickup, date and time, and passengers, and without destination or return. The stored enquiry records the package title and id. Optional `durationHours` is shown only when a package file supplies it. The catalogue still has no embedded hero form.
- Decision/evidence: 2026-10-03 voice follow-up after the planning note. Passengers stay on the form so the team can suggest vehicles. No prices, itineraries, or offer terms were added. See [task record](docs/records/2026-10-05-city-tour-booking.md).
- Verified: focused tests (26), production build (catalogue and all three package pages in three locales), local Chrome journeys in English, Portuguese, and Traditional Chinese, homepage mode switching, catalogue with no form, 390 px and 320 px overflow checks, and local D1 row `KY-JFMM8DFB` (`city_tour`, null destination and return, notification `skipped`). Details and limits are in the task record. Full CI is not claimed.
- Limits: sample packages remain drafts. Real package copy, image rights, special-offer terms, and staff editing are still open. Not a release.

### 2026-10-03 — Record future City Tour planning

- Changed: saved the voice-discussion planning record and linked it from the documentation index/state. Confirmed direction, illustrative examples, superseded durations, proposed booking flow and open staff-authoring decisions are separated.
- Decision/evidence: latest owner discussion; documentation first, return later to clarify the build. Recommended next step: review the package-detail example and agree staff-authoring scope.
- Verified: document readback, local links, focused formatting, diff whitespace and unchanged application-source hashes for this increment.
- Limits: no application/runtime checks rerun, no feature implementation, no commit/push/deployment; commercial content and future design decisions remain pending.

### 2026-10-03 — City Tour catalogue and Markdown package pages

- Changed: dedicated hero (booking deferred), one direct menu entry, feature-image catalogue cards, and shared-template package pages generated from one Markdown folder. Simple four-field authoring supports optional localized labels and explicit English-body fallback. Existing homepage/footer links retain their URL.
- Decision/evidence: latest owner clarification superseded hero booking and expandable-only details. Three samples remain draft planning themes, with no commercial claims approved. See [task record](docs/records/2026-10-03-city-tour-catalogue.md).
- Verified: desktop/mobile catalogue and individual-page journeys, Portuguese/Traditional Chinese routing and keyboard/image-card navigation, minimal English-only authoring, hidden-record exclusion, draft/noindex handling, 45 tests, typecheck, production build, focused formatting, diff checks, independent review and corrections.
- Limits: repository-wide lint has unrelated formatting drift; external hosting publication, real business content/image rights, full body translations, physical devices, and screen readers remain unverified. Dev booking-island optimizer error observed during concurrent checks; production-built homepage form hydrates. No push or deployment.

### 2026-10-03 — Adopt project-specific Codex workflow routing

- Changed: added the compact workflow adapter, dated scope/acceptance record, and links from project instructions and documentation index. The business scope, booking/admin authority, historical checks, and pre-existing local readiness note were not revised.
- Verified: documentation-only checks and independent review are in the [adoption record](docs/records/2026-10-03-codex-workflow-adoption.md). This task is `task_verified` for documentation; no application behavior, owner acceptance, or release was verified.
- Next action: trial one bounded read-only resumption from the startup links and record whether the adapter provided sufficient current context.

### 2026-09-27 — Local booking and dashboard readiness test

- Verified: Chrome desktop booking submission returned 201 and displayed the same reference that was stored in local D1; empty journey validation appeared, and there were no browser page errors. Chrome mobile at 390 px loaded the hourly service form and date picker without horizontal overflow. Anonymous admin page and API access were denied as expected. The 43 unit/integration tests, type check, and production build passed.
- Limitation: local email notification was skipped by configuration; temporary dashboard access has expired, so authenticated dashboard interaction was not exercised in a browser. The isolated admin-session test passed, but it does not establish the complete browser workflow. Repository-wide Prettier check fails on 74 pre-existing files, preventing `pnpm run ci` from passing.
- Next action: renew or provision a non-production operator identity under the approved access policy, then run booking → dashboard list/detail/status/calendar/contacts in an isolated staging environment with test mail and D1. Resolve the formatting gate and complete owner, accessibility, security, recovery, and release reviews before calling the site production ready.

### 2026-09-27 — Use orange accent for booking steps

- Changed: active and completed Journey / Communication step circles now use `#f3a600` with dark numerals; their labels use the darker related accent for contrast on white, and the connector after a completed step uses the orange accent. The selected WhatsApp / Email tab and booking action remain green.
- Decision/evidence: direct user browser comment on the step-2 mobile progress header.
- Verified: a browser style preview using the current stylesheet showed orange active/completed step circles, the completed connector, and darker orange labels beside the unchanged green WhatsApp / Email tabs. The full `pnpm run ci` gate passed (formatting, type checking, tests, and production build) before main integration; `git diff --check` passed. The user's browser screenshot supplied the live step-2 layout reference; the preview verified styling rather than a new click-through.
- Open: no deployment was performed.

### 2026-09-27 — Complete booking selection colors

- Changed: extended the booking green gradient to the selected Point to point / By the Hour switcher, WhatsApp / Email tabs, selected calendar days and time values, progress markers, and calendar Save / Confirm buttons. Step-2 field focus rings use green. Kept the pickup day distinguishable with a dark green inner ring. Unselected ride icons use the orange accent. Updated the design and booking guides.
- Decision/evidence: direct user correction that these booking controls still had black highlights after the earlier button change.
- Verified: `pnpm typecheck` passed with 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `pnpm build`, focused documentation formatting, and `git diff --check` passed. A live desktop Home screenshot showed the selected ride switcher in green. A separate browser preview using the current stylesheet showed green selected calendar days and time, Save / Confirm controls, progress markers, and both WhatsApp / Email selected states. The preview checked styling, not the full booking interaction.
- Open: interactive calendar and step-2 click-through and mobile visual review remain unverified in this pass. No deployment was performed.

### 2026-09-27 — Booking icon and request-button colors

- Changed: switched booking field icons to the shared orange accent and scoped a green gradient from `#008c5e` to `#2db883` to booking request primary buttons, with a brighter hover gradient and dark text. Updated the design and booking-widget guides.
- Decision/evidence: direct user request for the existing orange accent on widget icons and a lighter gradient based on `#008c5e` for the button.
- Verified: `pnpm typecheck` passed with 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `pnpm build`, focused documentation formatting, and `git diff --check` passed. A desktop Chrome screenshot at 1440×900 showed the orange booking icons and green gradient Get a quote button on Home, with the bar and headline legible.
- Open: mobile visual review of the new colors. No deployment was performed.

### 2026-09-27 — Stabilize local booking widget rendering

- Changed: render `BookingEmbedded` and `BookingSheet` on the client across all locales. In local development, rewrite Astro's prerendered React renderer URL to Vite's uncached client entry rather than retaining a prerender `?v=` hash on a client dependency URL. Updated the architecture note.
- Evidence: the prerender and client optimizer hashes differed while the generated renderer URL combined the client path with the prerender hash, and Vite marked that URL immutable. Earlier browser errors showed `Invalid hook call` and `useSyncExternalStore` failures in the booking islands.
- Verified: see the 2026-09-27 verification record above. The fresh dev server remains running at `http://localhost:4321/`.
- Limit: the current in-app tab and a deployed preview have not been directly checked; no deployment was made.

### 2026-09-27 — Align public accent to `#f3a600`

- Changed: set the shared accent token used by section kickers to `#f3a600`; aligned the related strong/soft/text tones, current mobile navigation highlight, About alliance highlights, and other small text accents. Updated the design token documentation.
- Decision/evidence: direct user request for `#f3a600`, especially on section kicker text.
- Verified: `pnpm build`, focused documentation formatting, and `git diff --check` passed. A desktop Chrome screenshot of Local Chauffeur showed the new orange kicker over the hero photograph.
- Open: `#f3a600` has low contrast as small text on white sections (about 2.05:1); the exact requested color is applied, but a background treatment or darker text variant is needed before claiming WCAG AA for those kickers. No deployment was performed.

### 2026-09-27 — Reuse About story image on Home

- Changed: reused `/images/hero-home.jpg`, the existing About story image, for the Home main section and aligned its alt text and image manifest. The generated front-cabin draft was rejected by the user and is not referenced by any page.
- Decision/evidence: the user's direct correction to use the image currently featured on About. Current About source confirms that its main editorial section uses `/images/hero-home.jpg`.
- Verified: `pnpm build` and focused Prettier checks passed. Both built Home and About HTML contain `/images/hero-home.jpg`, the image is present in the build, and the rejected generated draft is absent from built Home HTML. `git diff --check` passed for the changed tracked files.
- Open: image-use review before publication. No deployment was performed.

### 2026-09-27 — Home family images and Local Chauffeur interior hero

- Changed: added a back-seat view toward the driver for the Local Chauffeur hero; added a family-focused Home hero and Home featured image with the Alphard behind the family. Wired the new assets into their pages and the Home social preview, adjusted desktop Home image positioning so the family remains clear of the centered heading, and updated the image manifest. Earlier assets remain in place for review.
- Decision/evidence: direct user request for these three images, with the supplied Alphard 40 Series body references and ordinary factory-style wheels on exterior scenes. The Home hero was revised once after a desktop screenshot showed the first composition obscuring a family member.
- Verified: generated images visually inspected; desktop Chrome screenshots at 1440×900 showed the revised Home family, headline, vehicle, and booking form visible, and showed the Local Chauffeur back-seat driver view behind legible page content. The three new JPEGs were confirmed in the final local build and their paths in built page HTML. `pnpm typecheck` passed with 0 errors and 0 warnings (one unrelated deprecation hint); `pnpm build`, focused Prettier checks for page/code/docs, and `git diff --check` passed. The full CSS file still has unrelated pre-existing admin styles that Prettier would reformat; that formatting was left untouched.
- Open: visual review by the business owner, especially vehicle/landmark fidelity and permission to publish illustrative images. Mobile visual layout was not checked in this pass. No production deployment was performed.

### 2026-09-27 — Generate and wire 18 service/B2B images

- Changed: generated one page-specific hero and one main-section image for each of the six footer-linked service pages and three B2B Solution pages. Added optimized JPEGs under `apps/web/public/images/illustrative/`, wired their paths and descriptive illustrative alt text into the page templates, and recorded the shared constraints and scene briefs in `docs/10-illustrative-image-set.md`.
- Decision/evidence: direct user request for 18 images after reviewing the current footer-linked page set, plus user-supplied Alphard 40 Series body references and instruction to use normal wheels rather than the references' modified wheels.
- Verified: all 18 outputs were visually inspected; `pnpm typecheck` had 0 errors and 0 warnings (one unrelated deprecation hint), `pnpm build` passed, and built HTML for each of the nine target pages contains exactly its two expected image URLs. All 18 image files are present in the build (5,629,238 bytes total). Local HTTP checks returned 200 for all nine pages and two sample image files. Focused Prettier and `git diff --check` passed. Desktop headless Chrome screenshots at 1440×900 showed the Airport Transfer and Corporate Solutions hero text and forms legible over their new backgrounds.
- Not verified or follow-up: mobile screenshots from headless Chrome were clipped by its minimum viewport behavior and are not a valid mobile layout check. Real vehicle fidelity, landmark accuracy, image-use approval, and the three B2B commercial relationships require owner review before publication. No production deployment was performed.

### 2026-09-27 — Balance About page voice

- Changed: revised repetitive `we`/`our` phrasing across the hero, history, service cards, alliance, business mobility, and values. Kept selected first-person language and used names or service-led wording where it reads more naturally. Updated the content voice guidance.
- Decision/evidence: direct user feedback on the initial first-person pass. Business scope, group capacity qualifications, and contact form were not changed.
- Verified: local `/about` renders the revised hero and philosophy text, omits the earlier repetitive values sentence, and retains one contact form. Focused Prettier check passed; `pnpm check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint), and `pnpm build` generated `/about`. No deployment in scope.

### 2026-09-27 — First-person About copy

- Changed: rewrote third-person narration on `/about` to the company's first-person voice, including the hero, history, four portfolio cards, alliance roles, business footprint, philosophy, metadata, and contact heading. Added the voice rule to the content guide.
- Decision/evidence: direct user request for `we` and `our` language; current About page and owner-directed business reference. The Macau consumer versus group B2B distinction and journey-specific vehicle/route qualification remain.
- Verified: local rendered `/about` contains the first-person hero and philosophy copy, omits `The group portfolio describes`, and has one contact form. `pnpm check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `pnpm build` generated `/about`.
- Follow-up: owner reconfirmation of group capacity, covered routes, dispatch hours, and alliance descriptions is still needed before production publication. No deployment in scope.

### 2026-09-27 — About company portfolio

- Changed: expanded `/about` from a short story/process page into a company portfolio with history, service areas, alliance roles, B2B coverage and scenarios, service philosophy, and a closing contact form. Updated its search description and the UX/content guides.
- Decision/evidence: user asked for a full company portfolio with as many sections as needed; content follows the owner-directed group profile and current six service routes. Avoided historical case studies, Hong Kong coverage, licence numbers, and numerical service-level promises.
- Verified: `pnpm check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `pnpm build` generated `/about`; local HTTP returned 200. Chrome at 1440 and emulated 390 px showed 7 sections, one inquiry form, four portfolio cards, three alliance cards, legible hero actions, and no mobile horizontal overflow. `git diff --check` passed.
- Follow-up: business owner should reconfirm group capacity, covered routes, dispatch hours, and alliance descriptions before production publication. Existing photograph usage rights still need verification. No deployment in scope.

### 2026-09-27 — Retire service pages absent from the footer

- Changed: removed `/services/hotel-transfer`, `/services/point-to-point`, `/services/hourly-charter`, `/services/sightseeing`, and `/services/corporate` from the generated service routes, plus their stale related-service references and the retired corporate-service inquiry branch. Updated the information architecture and design guide.
- Decision/evidence: user supplied the current footer as the public page list. Its Services column links only Airport Transfer, Cross Border Rides, Local Transfers, Local Chauffeur, Weddings, and City Tours.
- Verified: `pnpm typecheck` completed with 0 errors and 0 warnings; `pnpm build` generated exactly the six footer-linked service paths; local HTTP checks returned 200 for those six paths and 404 for each retired path. Focused Prettier and `git diff --check` passed. `pnpm test` passed 38/39; the unrelated admin-session test failed because local temporary admin access expired on 2026-09-22.
- Next action: plan two page-specific images for each of the 12 currently wired photographic public pages (Home, six service pages, three B2B pages, About, Contact), then generate after review.

### 2026-09-27 — Service-specific copy and search descriptions

- Changed: rewrote service metadata descriptions, hero summaries, overview copy, section headings, and three detail cards for each published service route. Replaced the repeated review/confirmation process cards with concrete journey scenarios. Updated the content guide.
- Decision/evidence: direct user feedback that repetitive review language did not explain the service or help search relevance; current service definitions and business-content boundaries.
- Verified: all 11 local service routes returned HTTP 200 with distinct service headings and metadata descriptions; none of those descriptions contained `review`, `confirm`, or `human`, and none rendered a `Review together` card. Local-transfer and hotel-transfer metadata were rechecked after the final copy edit. `astro check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `astro build`, focused Prettier check, and `git diff --check` passed.
- Not verified or follow-up: search ranking outcomes, physical-device reading, and business-owner validation of any future service expansions; no deployment in scope.

### 2026-09-27 — Mobile navigation dropdown refinement

- Changed: restyled the mobile menu trigger and dropdown to match the dark glass header navigation, improved group and selected-page states, and replaced the mobile Contact Us link with About Us. Updated the UX and navigation guides.
- Decision/evidence: direct user request; existing site tokens and desktop navigation styling.
- Verified: Chrome mobile viewport screenshots at 390 px (home with Point To Point submenu expanded) and 320 px (`/about`) showed the dark dropdown within the viewport with no horizontal page overflow. The 320 px page marked About Us current; rendered home, About, and Corporate routes had three groups, one About Us link, and no mobile Contact Us link. `astro check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `astro build`, focused Prettier check, and `git diff --check` passed.
- Not verified or follow-up: physical-device touch and screen-reader interaction; no deployment in scope.

### 2026-09-27 — Richer B2B programme information

- Changed: expanded corporate service scenarios and alliance roles; added agency and hospitality journey examples, portfolio capacity context, B2B contact links, and explicit human review language across the three business pages. Updated the content guide.
- Decision/evidence: owner-directed 2026-09-17 group-portfolio direction in `BUSINESS_INFORMATION.md`, the translated group portfolio, and the user's request for richer B2B information. The three pages still have one inquiry form and two supporting sections each.
- Verified: all three local B2B routes returned HTTP 200 and contained the expected new content, one inquiry form, and two supporting sections. `astro check` reported 0 errors and 0 warnings (one unrelated deprecated `FormEvent` hint); `astro build`, focused Prettier check, and `git diff --check` passed.
- Not verified or follow-up: responsive visual and physical-device review, plus business-owner reconfirmation of current operational and commercial claims before production publication; no deployment in scope.

### 2026-09-27 — Public logo updated from owner-supplied image

- Changed: copied the supplied transparent PNG into the public image assets and used it for the public header and footer logo links. The site logo reference now points to that asset; responsive CSS sets its display size.
- Decision/evidence: direct user request and supplied `New Project (4).png` image. The copied file matches the source hash.
- Verified: local home page and PNG both returned HTTP 200; the page contains two references to the new asset. `astro check` reported 0 errors and 0 warnings, with one unrelated deprecated `FormEvent` hint.
- Not verified or follow-up: visual viewport inspection could not be completed in this run. The favicon and operator workspace branding still use their existing assets; no deployment was performed.

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

### 2026-09-21 — Temporary local dashboard login

- Changed: provisioned one local-only Better Auth operator account in D1, configured its secret and allowlist in ignored `.dev.vars`, removed the one-time setup token, and set a 24-hour access cutoff. The admin middleware now imports the Worker environment only for admin requests so static prerendering still builds in Node.
- Decision/evidence: direct user request to show the dashboard with a temporary login. Cloudflare Access remains the preferred production gate; this does not authorize production provisioning.
- Verified: local auth migration already applied; fresh sign-in returned 200, `/admin` and protected summary API returned 200, and the in-app browser displayed loaded dashboard KPIs and recent bookings. Full tests passed (39/39), strict typecheck and production build passed, and targeted formatting and `git diff --check` passed.
- Not verified or follow-up: production Access policy and offboarding, remote D1 and Resend, physical-device admin UX. The local account record persists after its access cutoff until explicitly removed.

For the next meaningful change, update the header and relevant sections above, then append:

```md
### YYYY-MM-DD — Short change title

- Changed:
- Decision/evidence:
- Verified:
- Not verified or follow-up:
```
