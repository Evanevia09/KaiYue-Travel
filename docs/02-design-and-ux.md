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

## Page layout

- **Header:** overlay on the hero with no bar background, sitting in front of the photograph and spanning the viewport (logo left, pill nav center, language + Sign in right). Wordmark is **Kai Yue** plus a gold geometric mark. Desktop uses a dark glass pill nav (Airport ride, City rides dropdown, Hourly, Help, Business dropdown). Business links to Travel agency, Corporate solution, and Hotels & resorts. Right actions are a globe language control (English in this release) and a white Sign in chip. Booking is not repeated in the header. Customer account authentication is not implemented; `/login` explains that a booking request does not need an account.
- **Heroes:** every public page uses a 100vh, full-width background photograph with a dark cinematic overlay. The homepage centers the headline, support line, compact booking bar, and a Macau-honest trust line. Inner pages center the title and lede only; they do not repeat a Book now button in the hero.
- **Desktop home hero:** full-bleed background; centered copy; Transfer / By the Hour toggle left-aligned above a From / To / date / add return / passengers / Get a quote bar that is wider than the earlier compact cap (about 64rem, 68rem with return) but not full-bleed. The ride-type toggle keeps at least 4px inner padding around the selected chip. Nav and booking-bar type are smaller than body copy.
- **Mobile homepage:** stacked copy then the same booking card over the full-bleed hero. No persistent bottom booking bar on the homepage.
- **Other mobile pages:** compact header plus persistent bottom booking CTA where it does not obscure content. The CTA opens the reusable bottom sheet.
- **Content sections:** short introduction, services, process, business teaser, FAQ, and final CTA.
- **Footer:** dark background, service links, company links, contact details, legal name, and a note that B2C bookings are Macau quote-after-review while B2B pages follow the group portfolio.


## Core components

- Buttons: primary, secondary, text, destructive (admin only), loading, disabled.
- Form fields: text, phone, email, date, time, select/combobox, passenger stepper, textarea, checkbox. Booking bar uses inline outline icons (map pin, calendar, car, clock, plus) in grayscale.
- **Date and time:** the journey bar uses a custom dual-month calendar (Monday-first, selected days as black circles) with a footer pickup/return date row and a 24h time popover (hour, minute, Save; optional 12h with AM/PM). One-way shows a boxed pickup field plus **Add return**; a chosen return collapses into one pickup → return field with a clear control. Display uses 24-hour time (`Wed, Sep 23 · 14:45`). Draft values remain local `YYYY-MM-DDTHH:mm` strings.
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

- Opens from any in-content `Book now` trigger and retains the origin for analytics. Inner-page heroes do not include a duplicate Book now button.
- On open: lock background scroll, set accessible dialog semantics, move focus to the sheet heading/first invalid field, and provide an obvious close button.
- On close: restore focus to the trigger. If the form is dirty, ask before discarding unless the draft is retained.
- Use near-full height on small screens with an internal scroll region and sticky action area.
- The back button should close the sheet before navigating away when practical.

## Content and asset rules

- Use real, approved vehicle imagery; label representative imagery honestly.
- Provide meaningful alternative text, image dimensions, and responsive formats.
- Do not invent awards, reviews, availability, service areas, prices, or fleet specifications.
- Keep copy concrete: what the service is, who it is for, what happens next, and how to get help.


