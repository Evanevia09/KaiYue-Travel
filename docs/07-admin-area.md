# 07 — Admin Area Specification

## Goal and access

The admin area is a small operational workspace, not a CRM. Cloudflare Access remains the preferred production identity gate for `/admin/*`. The current local development alternative uses Better Auth email/password sessions in D1, with an explicit `ADMIN_EMAILS` allowlist. Admin UI pages and API handlers both require a valid identity. Production access policy and operator provisioning still require owner review.

Local first-account setup requires a one-time token and is disabled outside `ENVIRONMENT=development`; remove the token after setup. `TEMP_ADMIN_EXPIRES_AT` can close temporary local dashboard access at a fixed timestamp without deleting records or changing the secret. This does not provision a production operator or replace Cloudflare Access.

## Navigation

- **Dashboard** — operational snapshot.
- **Bookings** — filterable list and detail.
- **Calendar** — booking schedule.
- **Contacts** — general/corporate inquiries.
- **Drivers & vehicles** — staff-managed dispatch inventory and contact details.

## Dashboard

Show only actionable summary data:

- new bookings today;
- upcoming assigned bookings;
- completed and cancelled bookings this month;
- new inquiries;
- recent submissions/status changes;
- notification failures requiring attention.

Counts link to pre-filtered lists. Define “today” using the approved business timezone. Avoid vanity charts in Release 1.

## Bookings list

- Columns/card fields: reference, pickup date/time, pickup/destination summary, customer name, service type, passenger count, status, received time.
- Filters: date range, status, service type; text lookup by exact/limited reference or approved customer fields.
- Default sort: nearest relevant pickup first, with overdue/new items visibly flagged.
- Pagination is server-side. Empty, loading, partial-error, and no-result states are distinct.
- The implemented list uses a stable `(pickup_at, id)` cursor so equal pickup times are not skipped; the UI has Previous/Next controls and a total count.
- Staff may add a booking enquiry manually from the bookings view. It uses the same server validation and idempotent persistence path as public enquiries.

## Calendar

- Month and agenda/list views are required; week/day views are optional after staff validation.
- Events show time, short journey/service label, and status without exposing unnecessary contact data.
- Selecting an event opens booking detail.
- Color is supplemented by label/icon. Cancelled bookings remain visible by default but visually de-emphasized.
- The calendar reads booking data; drag-to-reschedule is out of scope for Release 1.
- The implemented month view uses the React Calendar component with a day agenda. Pickup dates are grouped in Macau time.

## Booking detail

- Reference/status and timeline.
- Pickup/destination, dates/times with timezone, passenger/luggage information, preference/notes.
- Contact details with safe copy actions.
- Status update constrained to valid transitions.
- Internal notes and minimal audit history.
- Notification state and safe retry if implemented.
- Operators may edit journey and contact details, with validation and a revision check; edits record only changed field names in the audit trail, not personal data.
- Operators may assign an active driver and vehicle together, or clear both. Vehicle capacity must cover the current passenger count. Availability and scheduling conflicts still require manual review.

Booking workflow: `enquiry` → `assigned` → `completed`, with `cancelled` available from active stages. Do not imply that status changes contact the customer unless a corresponding email workflow is explicitly implemented and shown before confirmation.

## Contacts

- List fields: received time, name/company, inquiry type, status.
- Detail: approved contact fields, original plain-text message, notes, and event history.
- Status updates: `new` → `replied` → `closed`; reopening should be explicit and audited if supported.
- Email client links may be provided, but full outbound messaging is outside Release 1.

## Dispatch inventory

- Driver records: name, phone, optional email and internal remarks, active/inactive flag.
- Vehicle records: plate, make/model, passenger capacity, optional partner contact and internal remarks, active/inactive flag.
- Contact details are visible only behind admin API authorization. No public driver or vehicle endpoints exist.
- Changes are audited without copying contact values into the audit trail. Deactivation preserves existing bookings and does not delete records.

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

Customer/driver accounts, automated dispatch or conflict detection, live location, payments, invoices, bulk messaging, complex reporting, and record deletion.


