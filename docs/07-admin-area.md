# 07 — Admin Area Specification

## Goal and access

The admin area is a small operational workspace, not a CRM. One Worker still serves public marketing pages and the staff dashboard. Host role, not `ENVIRONMENT` alone, decides whether staff login is offered:

| Role | Hosts | Staff `/admin` and `/login` |
|---|---|---|
| Production marketing | `kaiyuemacau.com`, `www.kaiyuemacau.com`, `kaiyue-travel.scalingsmb.workers.dev`, official UAT `kaiyue-travel-staging.kai-yue.workers.dev` | Fail-closed 403. Do not loosen this to make the old workers.dev URL a login host. |
| Production admin | `admin.kaiyuemacau.com` | Better Auth email/password when both Access env vars are absent. Source-supported; this increment does not attach DNS or treat it as a production release. `/` redirects to staff sign-in the same way as staging admin. |
| Staging marketing | `staging.kaiyuemacau.com` | Staff login is not offered (403). Public marketing only. |
| Staging admin | `admin-staging.kaiyuemacau.com` | Staff sign-in and dashboard. Better Auth email/password when both Access env vars are absent. Access is not a prerequisite. Visiting `/` redirects to `/login` (or `/admin` when Access is fully configured). Other marketing paths on this host do not render the public site. |

Cloudflare Access JWT is used only when **both** `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set on a dedicated admin host. Either var alone is treated as broken config and fails closed. Both absent is the supported password path on `admin-staging.kaiyuemacau.com` and, later, `admin.kaiyuemacau.com`. The isolated trial host `kaiyue-travel-admin-trial.kai-yue.workers.dev` must not be added to any production-host list.

An `ADMIN_EMAILS` allowlist is not a super-admin role. Primary operator authority is Worker env `ADMIN_PRIMARY_EMAIL` (plus `ADMIN_EMAILS` on the password path), not a D1 role column. Live D1 06cf879d at 2026-11-15 14:18 had no role column; a persisted `user.role` would be unused metadata, so there is no `0009` migration. `requireAdmin` enforces the env primary on password sessions and Cloudflare Access JWTs. There is no staff-management API and no self-service role change.

Staff chrome is English or Traditional Chinese (`zh-Hant`). A language switch on `/login`, `/setup-admin`, and the admin header persists the choice in the `kaiyue-admin-locale` cookie (and localStorage). Default is English. Public offer titles stay as staff entered them; bilingual offer fields are a follow-up. `/admin/settings` lets a signed-in password operator change their own password (current password required, confirmation). Production hosts (`kaiyuemacau.com`, `www.kaiyuemacau.com`, `admin.kaiyuemacau.com`) stay at a hardcoded minimum of 12 characters. On `admin-staging.kaiyuemacau.com` only, Worker var `ADMIN_STAGING_TEST_PASSWORD_MIN` may lower that floor to a whole number from 6 through 11 for login, password change, and create/reset. The var has no effect on production-admin or marketing hosts even if it is present. Do not gate this on `ENVIRONMENT=production`. Other sessions are deleted in D1 immediately; signed Better Auth cookie-cache tokens on other devices may remain valid for up to 60 seconds. Cloudflare Access identities do not use this form.

Local first-account setup requires a one-time token and is disabled outside `ENVIRONMENT=development`; remove the token after setup. `/setup-admin` and `/api/auth/sign-up/email` are not production provisioners. Production CREATE uses `scripts/provision-primary-admin.mjs` after a fresh preflight (exclusive 0600 SQL, CHECK(ok = 1) postcondition, no wrangler). Cloudflare Vault cannot export a generated login password into that CLI or write Worker bindings. A later native user-secret request may place a user-provided password in the local process. Parent configures Worker secrets after the package route is validated. `TEMP_ADMIN_EXPIRES_AT` can close temporary local or preview dashboard access. It does not apply on dedicated admin hosts (`admin.kaiyuemacau.com`, `admin-staging.kaiyuemacau.com`) and must not inherit the staging UAT 2026-11-24 expiry. Isolated admin trial uses a separate Worker/D1/R2 plan, never official UAT `043cd0ff`.

## Navigation

- **Dashboard** — operational snapshot.
- **Bookings** — filterable list and detail.
- **Calendar** — booking schedule.
- **Contacts** — general/corporate inquiries.
- **Drivers & vehicles** — staff-managed dispatch inventory and contact details.
- **Profile** — signed-in account and password change. `/admin/settings`.
- **Special Offers** — draft/publish catalogue with photos. `/admin/offers`. Phone photos up to 25 MB are copied from the file input (or a drop) before the input is cleared, then resized in the browser. The stored file must stay under 5 MB; a resize failure is shown as an error and the original is not uploaded. The editor shows upload progress and applies main-photo, delete, and publish changes immediately, rolling back if the server rejects them. Publish/unpublish button labels follow the target action (`Publishing…` / `Unpublishing…`), not the optimistic status. Mutating admin fetches use `keepalive`, and a leave warning is shown while a write is in flight. Publish writes the status update and audit in one D1 batch and skips a second load. `/admin` and `/admin/offers` render their first payload on the server so the island does not wait on a second round trip. Updated timestamps use Asia/Macau so server HTML and hydration match.

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

- Columns/card fields: reference, pickup date/time, pickup/destination summary, customer name, service type, passenger count, status, received time. Special-offer enquiries also show the published package title (and id on the detail page) from `offer_title` / `offer_id`.
- Filters: date range, status, service type; text lookup by exact/limited reference or approved customer fields.
- Default sort: nearest relevant pickup first, with overdue/new items visibly flagged.
- Pagination is server-side. Empty, loading, partial-error, and no-result states are distinct.
- The implemented list uses a stable `(pickup_at, id)` cursor so equal pickup times are not skipped; the UI has Previous/Next controls and a total count.
- Staff may add a booking enquiry manually from the bookings view. It uses the same server validation and idempotent persistence path as public enquiries. Manual entries store `communication_channel = admin` (with `source_trigger = admin-manual`) and are labelled Staff, not WhatsApp. Existing manual rows that were stored as WhatsApp still display as Staff when the source trigger is `admin-manual`.
- The status combobox writes `?status=` on `/admin/bookings` so dashboard KPI deep links and back/forward stay in sync.

## Calendar

- Month and agenda/list views are required; week/day views are optional after staff validation.
- Events show time, short journey/service label, and status without exposing unnecessary contact data.
- Selecting an event opens booking detail.
- Color is supplemented by label/icon. Cancelled bookings remain visible by default but visually de-emphasized.
- The calendar reads booking data; drag-to-reschedule is out of scope for Release 1.
- The implemented month view uses the React Calendar component with a day agenda. Pickup dates are grouped in Macau time. Agenda copy uses singular “1 passenger” when the count is one.

## Booking detail

- Reference/status and timeline.
- Pickup/destination, dates/times with timezone, passenger/luggage information, preference/notes.
- Contact details with safe copy actions.
- Status update constrained to valid transitions.
- Internal notes and minimal audit history. Adding a note also writes a `note_added` audit event (without copying the note body).
- Notification state and safe retry if implemented.
- Operators may edit journey and contact details, with validation and a revision check; edits record only changed field names in the audit trail, not personal data.
- Operators may assign an active driver and vehicle together, or clear both. Saving with no driver and no vehicle when nothing is assigned is rejected with a visible validation error; the UI must not show a success state for that no-op. Vehicle capacity must cover the current passenger count. Availability and scheduling conflicts still require manual review.

Booking workflow: `enquiry` → `assigned` → `completed`, with `cancelled` available from active stages. Do not imply that status changes contact the customer unless a corresponding email workflow is explicitly implemented and shown before confirmation.

## Contacts

- List fields: received time, name/company, inquiry type, status. The list uses the same toolbar, filter, table, empty, and loading treatment as bookings.
- Detail: approved contact fields, original plain-text message, notes, and event history, using the same card/aside layout as booking detail. Status is only changed by the existing Mark Replied / Mark Closed actions.
- Status updates: `new` → `replied` → `closed`; reopening should be explicit and audited if supported.
- Email client links may be provided, but full outbound messaging is outside Release 1.

## Dispatch inventory

- Driver records: name, phone, optional email and internal remarks, active/inactive flag.
- Vehicle records: plate, make/model, passenger capacity, optional partner contact and internal remarks, active/inactive flag.
- Contact details are visible only behind admin API authorization. No public driver or vehicle endpoints exist.
- Changes are audited without copying contact values into the audit trail. Deactivation preserves existing bookings and does not delete records.

## Authorization and audit

- Release 1 operator model: one env-configured primary operator (`ADMIN_PRIMARY_EMAIL`) on live admin hosts. Dashboard operational permissions are unchanged. This is not a staff directory, invite flow, or a DB RBAC platform. The profile page shows “Primary operator” from env match, not from a D1 role.
- Default deny: non-primary identities cannot password-login on the production dedicated host; `POST /api/v1/admin/profile/role` is always 403; password-change bodies cannot set `role`.
- Capture operator identifier, action, entity, old/new status, timestamp, and request ID for changes.
- Do not place customer data in URLs, client logs, analytics, or broad error reports.
- Session timeout uses Better Auth (8 hours, 60-second signed cookie cache). Offboarding is D1 session delete plus password change; other devices may remain valid for the cache window.

## Admin UX requirements

- Desktop-first but usable on a phone for urgent review. At typical phone widths (~375px) the nav wraps or scrolls instead of clipping labels, header actions wrap, and KPI cards stack. Bookings and offers tables stay inside the main pane; at narrow widths they stack into labelled rows so TITLE and ACTIONS remain on-screen. Official staging browser checks passed at real Chrome width ~485–500px; 375px and <480px remain unverified.
- Keyboard-accessible tables, filters, dialog/drawer, and calendar alternatives.
- Published special offers do not keep a “Ready to publish” badge. Public offer list cards use the selected main photo (full image URL, thumbnail as srcset) and show MOP with the stored price.
- Confirm destructive/terminal actions; keep status updates reversible only when business policy allows.
- Optimistic UI may be used only when failure rollback is unambiguous; status changes should prefer confirmed server responses.
- Never show a success message before the server confirms persistence.

## Not included

Customer/driver accounts, automated dispatch or conflict detection, live location, payments, invoices, bulk messaging, complex reporting, and record deletion.


