# 06 — Booking Widget Specification

## Purpose

Build one booking experience that can render:

- embedded in the desktop home-page hero;
- inside a mobile bottom sheet/modal from any page;
- optionally on a dedicated fallback route for accessibility, sharing, or environments without enhanced JavaScript.

The variants share fields, validation, request payload, analytics names, error handling, and confirmation behavior. Only the container and layout change.

## Proposed form steps

Use a single screen if the final field count remains short. Otherwise use these three steps:

1. **Journey:** Transfer / By the Hour, From, To, pickup date/time, optional return, passengers. Primary action is **Get a quote** (not live prices). Pickup/return use the shared custom calendar and time popover, not the native `datetime-local` control. Return is collected on this step (add return → combined pickup/return chip); it is not repeated on Details.
2. **Details:** optional return (if not already set), luggage count, optional vehicle preference, optional notes.
3. **Contact and review:** name, phone, optional email/company, privacy acknowledgement, summary, submit.

Conditional fields must be driven by the selected service type and approved business rules—not duplicated per page.

## State model

```text
closed
  → open.pristine
  → open.editing
  → open.validating
  → open.submitting
      → success
      → error.recoverable
      → error.unknown_outcome
```

- `error.recoverable`: validation, network not sent, or known server response; preserve data and allow correction/retry.
- `error.unknown_outcome`: request may have reached the server. Reuse the same idempotency key and tell the user not to create duplicates.
- Only a confirmed `201`/matching idempotent response enters `success`.

## Shared component contract

```ts
type BookingEntryContext = {
  mode: "embedded" | "bottom-sheet" | "page";
  sourcePage: string;
  sourceTrigger: string;
  initialServiceType?: string;
};
```

Proposed component boundaries:

- `BookingLauncher` opens the shared flow with entry context.
- `BookingProvider` owns the current draft and open/close commands.
- `BookingForm` owns steps, schema validation, submission, and result state.
- `BookingSheet` supplies mobile dialog/focus/scroll/history behavior.
- `BookingEmbedded` supplies desktop layout while consuming the same form.

Do not render two independently stateful forms on the same page. Responsive CSS should switch containers, or both shells should consume one authoritative draft store.

## Draft and lifecycle behavior

- Generate one idempotency key when a new draft starts; retain it through retries.
- Preserve the draft while navigating between form steps and switching responsive layout.
- Default recommendation: keep a non-sensitive draft in memory and `sessionStorage` for the tab, with a short expiry. Obtain approval before storing contact/journey data; allow the site to operate without persistence.
- Clear the draft only after confirmed success or explicit discard.
- Pre-fill service type from service-page CTAs while keeping it editable.
- Never pre-fill consent.

## Open/close behavior

- Any approved CTA can call the launcher with its page and trigger identifiers.
- On mobile, show a bottom sheet; at wider compact sizes it may become a centered dialog.
- Use `role="dialog"`, `aria-modal="true"`, accessible title/description, focus trap, Escape handling, background inertness, and trigger-focus restoration.
- If the draft is dirty, closing offers “Keep editing” and “Discard”; if session retention is approved, “Save and close” may replace the prompt.
- A direct dedicated route remains usable when scripts fail; core form HTML should be progressively enhanced where practical.

## Validation and submission

- Client and server use equivalent shared schemas, but the server is authoritative.
- Date/time errors explain the required timezone and notice window.
- The date picker disables past days; 24-hour notice is still enforced by shared schema validation on submit.
- Submission button disables only while a request is in flight and exposes a live status message.
- On success, display the booking reference, what happens next, expected response language only if approved, and support contact.
- Email failure must not tell the customer that booking creation failed. Show the stored reference and allow staff notification retry.

## Analytics events

Collect only consent-compliant, non-sensitive metadata:

- `booking_opened` with mode/page/trigger;
- `booking_step_viewed` and `booking_validation_failed` with field name or error category, never field value;
- `booking_submitted`, `booking_succeeded`, `booking_failed` with category and request ID;
- `booking_abandoned` only when measurement rules allow it.

Do not send names, phones, email addresses, locations, notes, or booking references to general analytics.

## Acceptance criteria

- Every key public page can open the widget.
- Embedded and sheet modes produce the same validated API payload.
- Orientation/viewport changes do not erase data.
- Keyboard, screen-reader, touch, zoom, reduced-motion, slow-network, retry, and duplicate-submit paths pass testing.
- The user always knows whether the request is confirmed received, rejected, or uncertain.


