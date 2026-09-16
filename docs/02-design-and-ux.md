# 02 — Design System and UX Patterns

## Experience direction

The interface should feel premium, calm, dependable, and easy to act on. Visual polish must support clarity rather than add friction. The booking action is the dominant interaction; corporate content remains visible but secondary.

## Design tokens

Final brand values require approval. Until then, implement semantic tokens rather than hard-coded colors.

```css
:root {
  --color-brand: /* approved primary */;
  --color-accent: /* approved CTA */;
  --color-surface: #ffffff;
  --color-surface-muted: #f5f6f8;
  --color-text: #17191c;
  --color-text-muted: #5c626b;
  --color-border: #d9dde3;
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

- Use one approved display/body family with system fallbacks; limit the weight set.
- Use a consistent 4 px spacing base and restrained corner radius/shadow scale.
- Meet WCAG 2.2 AA contrast. Color never carries status alone.

## Page layout

- **Header:** logo, concise primary navigation, corporate link, contact route, and visually dominant “Book now”.
- **Desktop hero:** clear headline and reassurance on one side; embedded booking widget on the other. Keep the primary form visible without requiring a scroll at common laptop sizes.
- **Mobile:** compact header plus persistent bottom booking CTA where it does not obscure content. The CTA opens the reusable bottom sheet.
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


