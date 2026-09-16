# 03 — Information Architecture and Content

## Sitemap

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Explain offer, establish trust, start booking | Book now |
| `/services` | Compare service types | Select service / book |
| `/services/[slug]` | Explain a specific service and requirements | Book this service |
| `/fleet` | Show approved vehicles/capacity | Book a vehicle/service |
| `/corporate` | Present B2B offer and qualification | Corporate inquiry |
| `/about` | Business story, standards, service area | Book or contact |
| `/faq` | Resolve conversion objections | Book now |
| `/contact` | General inquiry and contact methods | Send inquiry |
| `/booking/confirmation` | Confirm receipt and reference | Contact support / return home |
| `/privacy`, `/terms` | Approved legal information | — |
| `/admin/*` | Protected staff area | Operational actions |

Dedicated service routes should exist only for confirmed, sufficiently distinct services. Otherwise, keep a single services page.

## Navigation

- Primary header (from the homepage mocks): Home, Services, Corporate, About, Contact.
- Fleet and FAQ remain published routes and appear in the footer.
- Persistent action: gold “Need Help?” phone pill in the desktop header; Book now on inner pages and as a mobile sticky control except on the homepage, where the form is inline.
- Corporate is visible but does not compete visually with the consumer booking action.
- On mobile, use a compact menu and a separate persistent booking trigger except on the homepage.

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

1. Hero: outcome-led headline, brief support, primary booking widget, concise reassurance.
2. Key services.
3. Fleet/comfort proof.
4. How booking works: request → review → confirmation.
5. Verified reasons to choose Kai Yue Travel.
6. Corporate teaser.
7. FAQ subset.
8. Final booking CTA.

### Corporate

State supported use cases, service approach, coverage, contact expectations, and the information needed for follow-up. Avoid implying contracted response times or capabilities until approved.

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


