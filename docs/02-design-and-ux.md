# 02 — Design System and UX Patterns

## Experience direction

The public site’s visual source of truth is the homepage mocks at `docs/design-refs/homepage-desktop.png` and `docs/design-refs/homepage-mobile.png`: bright teal-and-gold, sans-serif type, a light Macau plaza scene, and a booking card with a teal header and gold primary action. Visual polish must support clarity rather than add friction. The booking action is the dominant interaction; corporate content remains visible but secondary.

## Design tokens

Final brand values still require owner approval. Current public-site tokens are derived from the homepage mocks and are not a substitute for that approval.

```css
:root {
  --color-brand: #039a9e;
  --color-accent: #e3a531;
  --color-surface: #ffffff;
  --color-surface-muted: #f4fafc;
  --color-text: #1f2933;
  --color-text-muted: #5c6b76;
  --color-border: #e4e8ee;
  --color-success: #18794e;
  --color-warning: #9a6700;
  --color-danger: #b42318;
  --radius-sm: 0.5rem;
  --radius-md: 0.875rem;
  --radius-lg: 1.25rem;
  --shadow-raised: 0 12px 32px rgb(0 0 0 / 12%);
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
}
```

- Use Inter / Noto Sans TC with system fallbacks; limit the weight set. Headlines are bold sans-serif teal, not serif.
- Use a consistent 4 px spacing base and restrained corner radius/shadow scale.
- Meet WCAG 2.2 AA contrast. Color never carries status alone.

## Page layout

- **Header:** colorful geometric K mark, gold “KAI YUE TRAVEL GROUP / 凱悅旅遊集團” lockup, concise primary navigation, and a gold “Need Help?” phone pill. Desktop inner pages also keep a Book now control; the homepage does not, because the form is already visible.
- **Desktop hero:** light sky Macau scene; teal headline and service line on the left; vehicle photography lower-left; embedded booking widget overlaying the right. Keep the primary form visible without requiring a scroll at common laptop sizes.
- **Mobile homepage:** stacked copy, vehicle photo, then the same booking card. No persistent bottom booking bar on the homepage.
- **Other mobile pages:** compact header plus persistent bottom booking CTA where it does not obscure content. The CTA opens the reusable bottom sheet.
- **Content sections:** short introduction, services, fleet, reasons to trust, process, testimonial/proof only when verified, FAQ, and final CTA.
- **Footer:** business contact details, service area, corporate route, legal links, and copyright.

## Core components

- Buttons: primary, secondary, text, destructive (admin only), loading, disabled.
- Form fields: text, phone, email, date, time, select/combobox, passenger stepper, textarea, checkbox.
- Feedback: inline validation, form-level error summary, toast for non-critical admin actions, persistent success state for submissions.
- Content: service cards, vehicle cards, trust/proof blocks, process steps, FAQ accordion, contact cards.
- Admin: status badge, filter bar, table/list, calendar event, detail drawer/page, empty/loading/error states.

## Interaction patterns

- Use direct labels; placeholders supplement rather than replace labels.
- Validate after blur and on submit. Preserve valid entries when errors occur.
- Never close the booking sheet because of an outside click after the user has entered data.
- Confirmation copy must say the request was received and awaits confirmation.
- Links look like links; buttons perform actions.
- Motion is brief (about 150–250 ms), respects `prefers-reduced-motion`, and never blocks completion.

## Responsive behavior

- Start mobile-first; test at 320 px and zoomed layouts, not only named breakpoints.
- Desktop embedded form and mobile sheet use the same React form component with different containers.
- Cards reflow rather than shrink unreadably. Tables become labeled rows/cards on small admin screens.
- Avoid horizontal page scrolling and content hidden under sticky UI.

## Bottom-sheet UX

- Opens from any `Book now` trigger and retains the origin for analytics.
- On open: lock background scroll, set accessible dialog semantics, move focus to the sheet heading/first invalid field, and provide an obvious close button.
- On close: restore focus to the trigger. If the form is dirty, ask before discarding unless the draft is retained.
- Use near-full height on small screens with an internal scroll region and sticky action area.
- The back button should close the sheet before navigating away when practical.

## Content and asset rules

- Use real, approved vehicle imagery; label representative imagery honestly.
- Provide meaningful alternative text, image dimensions, and responsive formats.
- Do not invent awards, reviews, availability, service areas, prices, or fleet specifications.
- Keep copy concrete: what the service is, who it is for, what happens next, and how to get help.


