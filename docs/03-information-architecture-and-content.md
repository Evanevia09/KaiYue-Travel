# 03 — Information Architecture and Content

## Sitemap

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Explain offer, establish trust, start booking | Book now |
| `/services/[slug]` | Five chauffeur service pages with the shared home booking flow, plus the dedicated City Tour catalogue below | Request this service |
| `/services/city-tours` | Dedicated City Tour catalogue with Markdown-managed package cards; no embedded hero form | Browse packages |
| `/services/city-tours/[id]` | Package page: hero booking widget, then a product block with gallery, title, From price, description, and terms | Request this tour |
| `/corporate` | Corporate solution inquiry | Corporate inquiry |
| `/business/travel-agency` | Travel agency partner inquiry | Agency inquiry |
| `/business/hotels-resorts` | Hotel and resort guest-transport inquiry | Property inquiry |
| `/about` | Company portfolio: history, services, alliance, business footprint, philosophy, and inquiry | Contact us |
| `/contact` | General and business inquiries | Send an inquiry |
| `/faq` | Answer common questions without a hero or form | Contact link where relevant |
| `/login` | Account availability notice; customer accounts not enabled | Return home or contact |
| `/booking/confirmation` | Confirm receipt and reference | Contact support / return home |
| `/privacy`, `/terms` | Approved legal information | — |
| `/admin/*` | Protected staff area | Operational actions |

`/services` redirects to `/services/airport-transfer`. There is no services index page.

City Tours is a header and mobile-menu dropdown with three packages: Special offer, Half day (6 hours), and Full day (10 hours). Each includes a car and driver. The homepage shows one card per package, using that package’s feature image, with Book now opening the package page. The footer Services column lists City Tours as its own group, with Special offer, Half day, and Full day. The catalogue does not embed a booking form. Each package hero embeds the shared booking widget with City tours and that package already selected. The widget uses pickup, date and time, and passengers, without a destination or return. Package English Markdown bodies have explicit locale fallback; optional translated labels and the existing page-context language switch remain available. See [authoring instructions](12-city-tour-packages.md).

The published service routes are `/services/airport-transfer`, `/services/cross-border-rides`, `/services/local-transfers`, `/services/local-chauffeur`, `/services/weddings`, and `/services/city-tours`. Older service slugs are not generated.

## Navigation

- Primary header: Point To Point, By The Hour, and Business dropdowns (Travel agency, Corporate solution, Hotels & resorts). The public logo uses the owner-supplied Kai Yue Travel Group image.
- Footer groups the service links, Company (About Us, Contact, FAQ, Privacy, Terms), and B2B Solution (Hotels & Resorts, Travel Agency, Corporate Solutions), with the business phone and address beside the brand.
- Desktop header keeps the translucent globe language control and WhatsApp General Enquiry action. On mobile, the language control replaces that action; About Us appears in the mobile menu after the service and Business groups. English, Macau Portuguese (`pt-PT`), and Traditional Chinese (`zh-Hant`) have public routes, with the switcher keeping visitors on the corresponding page. The homepage and consumer service pages embed Journey and open Communication in one shared modal. Only booking-enabled pages offer a mobile sticky booking control.

Public English routes remain at their existing paths. Portuguese and Traditional Chinese use `/pt` and `/zh-Hant` prefixes. The localization layer translates public page copy, metadata, navigation, booking and inquiry forms, and form feedback. Public form submissions carry the selected locale and localized source path. Protected admin pages and APIs are outside this public translation scope. Translation drafts require native-language and business-owner review before production publication, especially for group-scale, cross-border, legal, and payment claims.
- Corporate is visible but does not compete visually with the consumer booking action.
- On mobile, use a compact menu; never show booking triggers or mount the booking modal on inquiry, FAQ, legal, or account pages.

The former `/booking`, `/fleet`, and `/pricing` pages are retired. Do not link to them; unknown routes use the site's 404 page.

## Content model

Release 1 can use typed Markdown/MDX or Astro content collections stored in Git. A CMS is not required unless non-developers must publish frequently.

### Service

- `title`, `slug`, `summary`, `description`
- `use_cases[]`, `included[]`, `not_included[]`
- `service_area`, `lead_time_note`, `pricing_note`
- `hero_image`, `seo_title`, `seo_description`
- `booking_defaults` such as service type
- `status`: draft or published

### Vehicle

- `name`, `slug`, `category`, `summary`
- `passenger_capacity`, `luggage_guidance`
- `features[]`, `images[]`, `availability_note`
- `display_order`, `status`

Vehicle capacity and series/model claims must be verified before publication.

### FAQ

- `question`, `answer`, `category`, `display_order`, `status`

### Site settings

- Brand/business name and approved logo/assets
- Contact channels and business hours
- Operating/service area
- Booking notice and confirmation language
- Social links, legal links, default SEO and share image

## Page content outlines

### Home

1. Hero: outcome-led headline, brief support, and compact Journey bar, without a redundant line below the widget.
2. Image-led introduction to the two journey formats.
3. Separate Point To Point and By The Hour service groups.
4. How requests work: request → review → confirmation.
5. FAQ preview with a link to all questions.

Consumer service pages use the same Journey → Communication flow and modal as home, with service-specific copy and at most two supporting sections. Point-to-point and hourly pages have different section headings, content, and visual order. The service type may be preselected, but the booking interaction is shared. Corporate programmes use `/corporate` and its inquiry form.

Service metadata, hero text, and overview sections should identify the journey type, Macau location, typical origins/destinations, and useful use cases in natural language. The three detail cards describe service-specific journey scenarios rather than repeating a generic request/review/confirmation sequence. Explain the booking status where the visitor takes action and in relevant FAQs or confirmation messages; do not spend each service's search description on that same caveat. Avoid unsupported promises about vehicle availability, waiting, cross-border eligibility, guiding, or inclusions.

### Corporate

B2B pages follow the owner-approved Kai Yue Group portfolio: alliance (Kai Yue Travel Group Limited + Mingmen Tourism + Mingmen Technology), dual-plate Greater Bay Area coverage, 200+ Alphard 40 Series, 7×24 dispatch, Venetian wording, programme commitments, and group-portfolio phones. The website form remains an inquiry; a person follows up. Do not imply that this site itself provides live GPS, instant assignment, or online payment.

Travel agency and hotels & resorts pages reuse the same source, tailored to partner and property coordinators.

The corporate page presents all four portfolio scenarios: VIP reception, long-term official cars, events, and meetings/team travel. Its second section gives the Macau company history, explains the three alliance roles, and gives the B2B contact route. The travel-agency and hotels/resorts pages give their respective coordinators concrete journey examples, the information needed for programme review, and the B2B contact number. Capacity, routes, and service terms are always subject to a human review; the portfolio fleet figure does not promise that a specific vehicle is available. Keep the two-section page limit and one inquiry form per page.

Source for this B2B copy is the owner-directed group portfolio summarized in `BUSINESS_INFORMATION.md`; its claims have not been independently verified. Before production publication, the business owner should reconfirm current fleet scale, dual-plate routes, dispatch hours, B2B phone ownership, partner roles, and the Venetian relationship. Do not extend these group claims to B2C pages.

Corporate, Travel Agency, Hotels & Resorts, and Contact use a two-column desktop hero with copy and one inquiry form (stacked on mobile), followed by no more than two detail sections. About is a full company portfolio with a story-led hero, history, service areas, alliance roles, B2B footprint, philosophy, and one inquiry form in the closing section. These pages do not mount the booking widget. FAQ, Privacy, and Terms have plain content without a photographic hero or any form; legal copy remains draft pending review.

The About portfolio uses the owner-directed group profile for company history and B2B scope. Keep individual Macau services separate from group-level Macau–Mainland capacity. Alliance members are presented as cooperating roles, not legal subsidiaries. Do not add historical site case studies, Hong Kong coverage, numerical service-level guarantees, or licence details without current owner validation.

Public About copy should sound like Kai Yue speaking naturally. Use `we` and `our` where they add warmth, with varied sentence openings, the company or partner names where clarity helps, and service-led descriptions in cards. State documented history and B2B capabilities directly while retaining journey-specific route and vehicle qualification; keep source-verification notes in project documentation rather than narrating them to visitors.

The inquiry card contains only the heading, paired short fields (name/company and phone/email when space permits), inquiry type, message, acknowledgement, and submit action. Business contact numbers and operating explanations belong in page content if useful, not in the form card.

### Contact

Separate urgent/booking guidance from general inquiries. Fields: name, phone, optional email/company, inquiry type, message, and privacy acknowledgement where legally required.

## SEO and metadata

- Unique title, description, canonical URL, open graph fields, and social image per indexable page.
- Use semantic headings and descriptive internal links.
- Add Organization/LocalBusiness and Service structured data only with verified facts; do not add fake ratings.
- Generate sitemap and robots policy. Admin, preview, and confirmation-detail URLs must not be indexed.
- Redirect retired routes and maintain a single canonical host.

## Content workflow

Draft in Git → factual/business review → legal/privacy review where relevant → approval → merge/deploy. Record content owner and last-reviewed date for policies and operational claims.

## Required content before launch

- Approved business identity, contacts, operating area/hours, services, fleet facts, booking rules, corporate offer, privacy notice, terms/cancellation wording, and notification/response expectations.
- Approved images with usage rights.
- Error, empty, success, acknowledgement, and maintenance copy—not only marketing copy.


