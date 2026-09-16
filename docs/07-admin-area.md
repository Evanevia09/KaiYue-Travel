# 07 — Admin Area Specification

## Goal and access

The admin area is a small operational workspace, not a CRM. Cloudflare Access is the preferred identity gate for `/admin/*`. Admin API handlers must also verify Access identity/claims and restrict allowed users/groups according to an approved policy.

## Navigation

- **Dashboard** — operational snapshot.
- **Bookings** — filterable list and detail.
- **Calendar** — booking schedule.
- **Contacts** — general/corporate inquiries.

## Dashboard

Show only actionable summary data:

- new bookings today;
- upcoming confirmed bookings;
- new inquiries;
- recent submissions/status changes;
- notification failures requiring attention.

Counts link to pre-filtered lists. Define “today” using the approved business timezone. Avoid vanity charts in Release 1.

## Bookings list

- Columns/card fields: reference, pickup date/time, pickup/destination summary, customer name, service type, passenger count, status, received time.
- Filters: date range, status, service type; text lookup by exact/limited reference or approved customer fields.
- Default sort: nearest relevant pickup first, with overdue/new items visibly flagged.
- Pagination is server-side. Empty, loading, partial-error, and no-result states are distinct.

## Calendar

- Month and agenda/list views are required; week/day views are optional after staff validation.
- Events show time, short journey/service label, and status without exposing unnecessary contact data.
- Selecting an event opens booking detail.
- Color is supplemented by label/icon. Cancelled bookings remain visible by default but visually de-emphasized.
- The calendar reads booking data; drag-to-reschedule is out of scope for Release 1.

## Booking detail

- Reference/status and timeline.
- Pickup/destination, dates/times with timezone, passenger/luggage information, preference/notes.
- Contact details with safe copy actions.
- Status update constrained to valid transitions.
- Internal notes and minimal audit history.
- Notification state and safe retry if implemented.

Do not imply that status changes contact the customer unless a corresponding email workflow is explicitly implemented and shown before confirmation.

## Contacts

- List fields: received time, name/company, inquiry type, status.
- Detail: approved contact fields, original plain-text message, notes, and event history.
- Status updates: `new` → `replied` → `closed`; reopening should be explicit and audited if supported.
- Email client links may be provided, but full outbound messaging is outside Release 1.

## Authorization and audit

- Proposed Release 1 role: one `staff` access group with the same operational permissions. Add roles only when a real separation-of-duties need is confirmed.
- Capture Access user identifier, action, entity, old/new status, timestamp, and request ID for changes.
- Do not place customer data in URLs, client logs, analytics, or broad error reports.
- Session timeout, offboarding, and allowed identity domains are Cloudflare Access configuration decisions requiring owner approval.

## Admin UX requirements

- Desktop-first but usable on a phone for urgent review.
- Keyboard-accessible tables, filters, dialog/drawer, and calendar alternatives.
- Confirm destructive/terminal actions; keep status updates reversible only when business policy allows.
- Optimistic UI may be used only when failure rollback is unambiguous; status changes should prefer confirmed server responses.
- Never show a success message before the server confirms persistence.

## Not included

Customer/driver accounts, dispatch board, driver assignment, live location, payments, invoices, bulk messaging, complex reporting, record deletion, and arbitrary booking-field edits.


