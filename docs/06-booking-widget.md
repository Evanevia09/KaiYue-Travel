# 06 — Booking Widget Specification

## Purpose

Build one booking experience that can render:

- Journey embedded in the home and consumer service-page heroes;
- Communication in one shared modal after the hero Journey step (a bottom sheet on mobile);
- the optional mobile booking trigger on booking-enabled consumer service pages through the same shared draft.

The variants share fields, validation, request payload, analytics names, error handling, and confirmation behavior. Only service-page content and optional initial service type change. B2B, Contact, About, FAQ, legal, and account pages do not mount this widget.

## Booking form steps

Use these two steps:

1. **Journey:** Point to point / By the Hour. Point to point collects From, To, pickup date/time, optional return, and passengers. Hourly charter collects Location, pickup date/time, duration (integer hours, minimum and default 2, maximum 12), and passengers (no destination, no return). Primary action is **Get a quote** (not live prices). Pickup/return use the shared custom calendar and time popover, not the native `datetime-local` control. Return is collected on this step for point-to-point only (add return → combined pickup/return chip); below 880px Add return sits under the pickup date. It is not repeated on Details.
2. **Communication:** choose WhatsApp or Email. WhatsApp offers an optional WhatsApp number and message, stores the enquiry, then opens a prefilled WhatsApp deep link containing the journey fields, the number when supplied, and any message supplied. Email asks for required name and email, optional phone, and an optional message; the stored enquiry triggers a Resend staff notification when configured. Email notification failure does not roll back the stored enquiry.

Email fields use “Your Name” and “Your Email” labels; WhatsApp shows “Your WhatsApp Number (optional).” The shared message field reads “Your Message (optional).” An empty message is valid for either channel and is omitted from formatted WhatsApp and email notification details. Name and email remain required for Email. Both phone inputs use the same existing validated/persisted phone field; WhatsApp number is omitted from the deep link when blank.

The communication step keeps the question as its visible heading without a duplicate kicker. In the step-2 sheet, place the Journey → Communication progress indicator in the white header beside the X close control, not again inside the form. Keep a screen-reader-only “Booking request” dialog title. Both channels have a short description: WhatsApp recommends a quick reply for people with WhatsApp, while Email notes the usual 24-hour reply window. The selected channel uses the black primary-action color. Regular action buttons and channel choices use softly rounded rectangular corners rather than pill shapes. Keep the consent explanation.

Descriptions beneath the communication tabs use smaller helper text. Home and consumer service heroes render Journey only: after Get a quote, step 2 uses the same modal on desktop and mobile. While the modal is open, unmount the hero form so two forms cannot be shown simultaneously. If it closes with a step-2 draft, show a Continue request action in the hero to reopen that modal.

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
- Pre-fill service type from consumer service pages while keeping it editable.
- Never pre-fill consent.

## Open/close behavior

- Any approved CTA can call the launcher with its page and trigger identifiers.
- On mobile, show a bottom sheet; at wider compact sizes it may become a centered dialog.
- On the homepage at any viewport width, continuing beyond Journey moves the shared draft into the booking modal. On mobile it rises as a bottom sheet; the date/time picker also presents from the bottom edge on narrow screens.
- Use `role="dialog"`, `aria-modal="true"`, accessible title/description, focus trap, Escape handling, background inertness, and trigger-focus restoration.
- If the draft is dirty, closing offers “Keep editing” and “Discard”; if session retention is approved, “Save and close” may replace the prompt.
- The retired `/booking` page is no longer a fallback. If the embedded form cannot load, it directs the visitor to Contact; progressive enhancement remains a follow-up.

## Validation and submission

- Client and server use equivalent shared schemas, but the server is authoritative.
- Date/time errors explain the required timezone and notice window.
- Hourly charter requires duration in whole hours from 2 to 12.
- The date picker disables past days; 24-hour notice is still enforced by shared schema validation on submit.
- Selecting a new calendar day does not assign a default time. The visitor must explicitly use the standard 24-hour hour/minute controls and save before the calendar Confirm action becomes available. Confirm closes the picker after all enabled journey legs have complete date/time values.
- On mobile, pickup and return open as separate one-month bottom sheets. Each sheet shows only its active leg's date/time footer; choosing a day opens a separate 24-hour time sheet with Back and close controls. Confirm closes the active leg once its date/time is complete (and a same-day return must be later than pickup). Mobile text-entry controls are at least 16px to avoid iOS focus zoom. The booking sheet has a labelled icon-only close control.
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


