# 02 — Design System and UX Patterns

## Experience direction

The public site’s visual source of truth is the Transfeero-inspired booking-first layout in `docs/design-refs/transfeero-desktop.jpg` and `docs/design-refs/transfeero-mobile.png`: cinematic dark photography, overlay header, white centered hero copy, a compact From/To booking bar, and black primary actions. Positioning is Macau private chauffeur, not worldwide marketplace. Do not copy Transfeero claims such as 100+ countries, Trustpilot scores, fixed price, or free cancellation. Visual polish must support clarity rather than add friction. The booking action is the dominant interaction; corporate content remains visible but secondary.

## Design tokens

Final brand values still require owner approval. Current public-site tokens are derived from the Transfeero-inspired direction and are not a substitute for that approval.

```css
:root {
  --color-brand: #111111;
  --color-accent: #d4af37;
  --color-surface: #ffffff;
  --color-surface-muted: #f6f6f7;
  --color-surface-dark: #0b0b0d;
  --color-text: #111111;
  --color-text-muted: #5c6370;
  --color-border: #ececef;
  --color-success: #18794e;
  --color-warning: #9a6700;
  --color-danger: #b42318;
  --radius-sm: 0.75rem;
  --radius-md: 1rem;
  --radius-lg: 1.5rem;
  --shadow-raised: 0 22px 50px rgb(0 0 0 / 18%);
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
}
```

- Use Inter / Noto Sans TC with system fallbacks; limit the weight set. Hero headlines are bold white sans-serif, not teal.
- Use a consistent 4 px spacing base and restrained corner radius/shadow scale.
- Meet WCAG 2.2 AA contrast. Color never carries status alone.
- Gold is reserved for the logo mark and small highlights. Primary actions are black or white, not gold.
- Standard action buttons and booking-flow choices use consistent softly rounded rectangular corners; the selected communication channel uses the black primary-action color with white text. Calendar day markers remain circular.

## Page layout

- **Header:** overlay on the hero with no bar background, sitting in front of the photograph and spanning the viewport (logo left, pill nav center, language + General Enquiry right). Wordmark is **Kai Yue** plus a gold geometric mark. Desktop has dark glass service/Business navigation, a subtly rounded translucent globe language control, and a WhatsApp General Enquiry action. Mobile replaces that action with the language control and includes Contact Us in the menu. English is the only live locale; Portuguese and Traditional Chinese are visible but unavailable until translated routes exist. Booking is not repeated in the header.
- **Heroes:** home and consumer service pages use the photographic booking hero and the same embedded Journey component; the service page changes copy and may preset the service type. Corporate Service, B2B, Contact, and About have a two-column desktop hero with copy beside one inquiry form, stacked on mobile. FAQ, Privacy, Terms, and the account notice use plain content without a photographic hero or form.
- **Desktop home hero:** full-bleed background; centered copy; Point to point / By the Hour toggle left-aligned above the booking bar. Point to point shows From / To / date / add return / passengers / Get a quote. By the Hour shows Location / pickup date / duration (2–12 hours, default 2) / passengers / Get a quote (no destination, no return). The bar is about 64rem (68rem with return), not full-bleed. The ride-type toggle keeps at least 4px inner padding around the selected chip. Nav and booking-bar type are smaller than body copy. Do not show a redundant trust/status line beneath the widget.
- **Mobile homepage:** stacked copy then the same booking card over the full-bleed hero. Point to point puts **Add return** on its own row under the pickup date. No persistent bottom booking bar on the homepage.
- **Other mobile pages:** a compact header; only booking-enabled consumer service pages may show a persistent bottom booking CTA. Inquiry and informational pages do not mount the booking sheet.
- **Content sections:** consumer service and inquiry pages use at most two page-specific sections below the hero. Home is the exception: an image-led introduction, separate Point To Point and By The Hour service cards, a request process, and a FAQ preview. FAQ and legal pages use plain content.
- **Inquiry form:** one compact hero card on Contact, About, and B2B pages. Pair name/company and phone/email where the card has enough width; inquiry type, message, acknowledgement, and submit remain full width. Keep group phones, hours, and operational caveats out of the form card. At very narrow widths the paired fields stack.
- **Supporting visuals:** use the existing local Macau/vehicle photographs and small inline icons for service and programme explanations; retain a text equivalent for every icon. Image rights remain a launch gate.
- **Footer:** dark background with service links, Company (About Us, Contact, FAQ, Privacy, Terms), B2B Solution (Hotels & Resorts, Travel Agency, Corporate Solutions), phone/address by the brand, legal name, and a note that B2C bookings are Macau quote-after-review while B2B pages follow the group portfolio.


## Core components

- Buttons: primary, secondary, text, destructive (admin only), loading, disabled.
- Form fields: text, phone, email, date, time, select/combobox, passenger stepper, hourly duration stepper, textarea, checkbox. Booking bar uses inline outline icons (map pin, calendar, car, clock, plus) in grayscale.
- **Date and time:** the journey bar uses a custom calendar (Monday-first, selected days as black circles) with a footer pickup/return date row and a 24h time popover (hour, minute, Save; optional 12h with AM/PM). Pickup-only (hourly, or point-to-point before Add return) shows one month. Adding a return switches to a dual-month range calendar. One-way shows a boxed pickup field plus **Add return**; below 880px Add return sits under the pickup date. A chosen return collapses into one pickup → return field with a clear control. Hourly charter hides Add return and the return date. Display uses 24-hour time (`Wed, Sep 23 · 14:45`). Draft values remain local `YYYY-MM-DDTHH:mm` strings.
- Feedback: inline validation, form-level error summary, toast for non-critical admin actions, persistent success state for submissions.
- Content: service cards, vehicle cards, trust/proof blocks, process steps, FAQ accordion, contact cards.
- Admin: status badge, filter bar, table/list, calendar event, detail drawer/page, empty/loading/error states.

## Interaction patterns

- Use direct labels; placeholders supplement rather than replace labels.
- Validate after blur and on submit. Preserve valid entries when errors occur.
- Never close the booking sheet because of an outside click after the user has entered data.
- Confirmation copy must say the request was received and awaits confirmation.
- Links look like links; buttons perform actions.
- Booking bar From / To cells, the date chip, and Add return show a light gray rounded hover/focus fill. From / To inputs do not use a gold focus ring while typing; the cell fill is the focus cue. Motion is brief (about 150–250 ms), respects `prefers-reduced-motion`, and never blocks completion.

## Responsive behavior

- Start mobile-first; test at 320 px and zoomed layouts, not only named breakpoints.
- Desktop embedded form and mobile sheet use the same React form component with different containers.
- Cards reflow rather than shrink unreadably. Tables become labeled rows/cards on small admin screens.
- Avoid horizontal page scrolling and content hidden under sticky UI.

## Bottom-sheet UX

- Opens from booking-enabled pages only. Home and consumer service pages embed Journey, then open the one shared Communication modal. Do not render a second hero booking form while the modal is open.
- On open: lock background scroll, set accessible dialog semantics, move focus to the sheet heading/first invalid field, and provide an obvious close button.
- On close: restore focus to the trigger. If the form is dirty, ask before discarding unless the draft is retained.
- Use near-full height on small screens with an internal scroll region and sticky action area.
- The back button should close the sheet before navigating away when practical.

## Content and asset rules

- Use real, approved vehicle imagery; label representative imagery honestly.
- Provide meaningful alternative text, image dimensions, and responsive formats.
- Do not invent awards, reviews, availability, service areas, prices, or fleet specifications.
- Keep copy concrete: what the service is, who it is for, what happens next, and how to get help.


