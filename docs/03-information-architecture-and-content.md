# 03 — Information Architecture and Content

## Sitemap

| Route | Purpose | Primary action |
|---|---|---|
| `/` | Explain offer, establish trust, start booking | Book now |
| `/services/[slug]` | Chauffeur service content with the shared home booking flow; Corporate Service uses B2B inquiry | Request this service |
| `/corporate` | Corporate solution inquiry | Corporate inquiry |
| `/business/travel-agency` | Travel agency partner inquiry | Agency inquiry |
| `/business/hotels-resorts` | Hotel and resort guest-transport inquiry | Property inquiry |
| `/about` | Business story and general inquiry | Contact us |
| `/faq` | Answer common questions without a hero or form | Contact link where relevant |
| `/login` | Account availability notice; customer accounts not enabled | Return home or contact |
| `/booking/confirmation` | Confirm receipt and reference | Contact support / return home |
| `/privacy`, `/terms` | Approved legal information | — |
| `/admin/*` | Protected staff area | Operational actions |

`/services` redirects to `/services/airport-transfer`. There is no services index page.

Dedicated service routes exist for each published chauffeur request type.

## Navigation

- Primary header: Point To Point, By The Hour, and Business dropdowns (Travel agency, Corporate solution, Hotels & resorts). Logo wordmark is Kai Yue.
- Footer groups the service links, Company (About Us, Contact, FAQ, Privacy, Terms), and B2B Solution (Hotels & Resorts, Travel Agency, Corporate Solutions), with the business phone and address beside the brand.
- Desktop header keeps the translucent globe language control and WhatsApp General Enquiry action. On mobile, the language control replaces that action; Contact Us appears in the mobile menu. English is currently the only published language. Português and 繁體中文 are listed as coming soon, without links to untranslated English routes. The homepage and consumer service pages embed Journey and open Communication in one shared modal. Only booking-enabled pages offer a mobile sticky booking control.
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

Consumer service pages use the same Journey → Communication flow and modal as home, with service-specific copy and at most two supporting sections. Point-to-point and hourly pages have different section headings, content, and visual order. The service type may be preselected, but the booking interaction is shared. Corporate Service is a B2B inquiry page instead.

### Corporate

B2B pages follow the owner-approved Kai Yue Group portfolio: alliance (Kai Yue Travel Group Limited + Mingmen Tourism + Mingmen Technology), dual-plate Greater Bay Area coverage, 200+ Alphard 40 Series, 7×24 dispatch, Venetian wording, programme commitments, and group-portfolio phones. The website form remains an inquiry; a person follows up. Do not imply that this site itself provides live GPS, instant assignment, or online payment.

Travel agency and hotels & resorts pages reuse the same source, tailored to partner and property coordinators.

Corporate, Travel Agency, Hotels & Resorts, Contact, and About use a two-column desktop hero with copy and one inquiry form (stacked on mobile), followed by no more than two detail sections. These pages do not mount the booking widget. FAQ, Privacy, and Terms have plain content without a photographic hero or any form; legal copy remains draft pending review.

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


