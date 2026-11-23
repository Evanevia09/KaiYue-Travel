# 07 — Admin Area Specification

## Goal and access

The admin area is a small operational workspace, not a CRM. One Worker still serves public marketing pages and the staff dashboard. Host role, not `ENVIRONMENT` alone, decides whether staff login is offered:

| Role | Hosts | Staff `/admin` and `/login` |
|---|---|---|
| Production marketing | `kaiyuemacau.com`, `www.kaiyuemacau.com`, `kaiyue-travel.scalingsmb.workers.dev`, official UAT `kaiyue-travel-staging.kai-yue.workers.dev` | Fail-closed 403. Do not loosen this to make the old workers.dev URL a login host. |
| Production admin | `admin.kaiyuemacau.com` | Better Auth email/password when both Access env vars are absent. Source-supported; this increment does not attach DNS or treat it as a production release. `/` redirects to staff sign-in the same way as staging admin. |
| Staging marketing | `staging.kaiyuemacau.com` | Staff login is not offered (403). Public marketing only. `/plugin` and `/plugin.txt` are `text/plain` agent instructions (`X-Robots-Tag: noindex, nofollow, noarchive`); they are not an AI-only security boundary. |
| Staging admin | `admin-staging.kaiyuemacau.com` | Staff sign-in and dashboard. Better Auth email/password when both Access env vars are absent. Access is not a prerequisite. Visiting `/` redirects to `/login` (or `/admin` when Access is fully configured). Other marketing paths on this host do not render the public site. Overlay `run_worker_first` is boolean `true` so the request enters the Worker; that does not stop `@astrojs/cloudflare` from `ASSETS.fetch` of prerendered `index.html` before middleware. The Wrangler entry wrap (`createWorkerFetch`) gates dedicated-admin `/` and `/index.html` before that fallback. Dedicated-admin HTML is `no-store` with `Vary: Host`. Public marketing and hashed `/_astro/` assets still serve. |

Cloudflare Access JWT is used only when **both** `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set on a dedicated admin host. Either var alone is treated as broken config and fails closed. Both absent is the supported password path on `admin-staging.kaiyuemacau.com` and, later, `admin.kaiyuemacau.com`. The isolated trial host `kaiyue-travel-admin-trial.kai-yue.workers.dev` must not be added to any production-host list. Password sign-in on `/api/auth/sign-in/email` and staging MCP `/api/v1/admin/mcp-session` share one D1 lock: three failed attempts, then five minutes (`429` + `Retry-After`) for that normalized account and source IP. Locked requests do not check the password or extend the window. A successful sign-in clears both buckets. `/login` shows a generic wait message with the Retry-After minutes. Wrong, unknown, disabled, and unprovisioned attempts use one generic `401`. On hosted Cloudflare the Worker uses `CF-Connecting-IP`; it does not trust client `X-Forwarded-For` when that header is absent. The only local/test exception is hostname `localhost` / `127.0.0.1` / `::1`. `.workers.dev` does not trust client `X-Forwarded-For`.

An `ADMIN_EMAILS` allowlist is not a super-admin role. Once `admin_operator` is provisioned, that sidecar is the login and privilege source of truth: roles are exactly `super_admin` and `staff`. There is no third admin role and no `user.role` column on Better Auth `0004`. Empty `admin_operator` is not implicit super-admin elevation. On live production hosts (`admin.kaiyuemacau.com` and the production marketing hosts) `requireAdmin` admits only an enabled operator row; an unprovisioned or disabled account fails closed, and `ADMIN_EMAILS` / `ADMIN_PRIMARY_EMAIL` neither admit nor exclude anyone there (2026-11-16). Off production hosts, the legacy env allowlist plus `ADMIN_PRIMARY_EMAIL` still gates the dashboard until an explicit provision SQL is applied. User-management APIs stay 403 until a super-admin row exists. Account email is the authorization target, not a hardcoded global superadmin. Self-service `POST /api/v1/admin/profile/role` remains 403.

Staff chrome is English or Traditional Chinese (`zh-Hant`). A language switch on `/login`, `/setup-admin`, and the admin header persists the choice in the `kaiyue-admin-locale` cookie (and localStorage). Default is English. Public offer titles stay as staff entered them; bilingual offer fields are a follow-up. `/admin/settings` lets a signed-in password operator change their own password (current password required, confirmation). Production hosts (`kaiyuemacau.com`, `www.kaiyuemacau.com`, `admin.kaiyuemacau.com`) stay at a hardcoded minimum of 12 characters. On `admin-staging.kaiyuemacau.com` only, Worker var `ADMIN_STAGING_TEST_PASSWORD_MIN` may lower that floor to a whole number from 6 through 11 for login, password change, and create/reset. The var has no effect on production-admin or marketing hosts even if it is present. Do not gate this on `ENVIRONMENT=production`. Other sessions are deleted in D1 immediately. Password `requireAdmin` then checks that the Better Auth `"session"` row still exists, so a signed cookie-cache token cannot authorize after revoke, role change, disable, or re-enable. Cloudflare Access identities do not use this form.

Local first-account setup requires a one-time token and is disabled outside `ENVIRONMENT=development`; remove the token after setup. `/setup-admin` and `/api/auth/sign-up/email` are not production provisioners. Production CREATE uses `scripts/provision-primary-admin.mjs` after a fresh preflight (exclusive 0600 SQL, CHECK(ok = 1) postcondition, no wrangler). Cloudflare Vault cannot export a generated login password into that CLI or write Worker bindings. A later native user-secret request may place a user-provided password in the local process. Parent configures Worker secrets after the package route is validated. `TEMP_ADMIN_EXPIRES_AT` can close temporary local or preview dashboard access. It does not apply on dedicated admin hosts (`admin.kaiyuemacau.com`, `admin-staging.kaiyuemacau.com`) and must not inherit the staging UAT 2026-11-24 expiry. Isolated admin trial uses a separate Worker/D1/R2 plan, never official UAT `043cd0ff`.

## Navigation

- **Dashboard** — operational snapshot.
- **Bookings** — filterable list and detail.
- **Calendar** — booking schedule.
- **Contacts** — general/corporate inquiries.
- **Drivers & vehicles** — staff-managed dispatch inventory and contact details.
- **Users** — super-admin-only operator directory. `/admin/users`. Staff do not see this nav item.
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

- Columns/card fields: **Reference number**, pickup date/time, pickup/destination summary, customer name, service type, passenger count, status, received time. Special-offer enquiries also show the published package title (and id on the detail page) from `offer_title` / `offer_id`. New chauffeur rows use `KY` + exactly five digits (`KY00042`). Legacy `KY-xxxxxxxx` rows stay unchanged and remain lookup keys. Table nowrap is restricted to the reference; long addresses wrap at 390px and 320px stacked layouts.
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

- **Reference number** / status and timeline. The English eyebrow is exactly `Reference number`. Traditional Chinese: `參考編號`.
- Pickup/destination, dates/times with timezone, passenger/luggage information, preference/notes.
- Contact details with safe copy actions.
- Status update constrained to valid transitions.
- Internal notes and minimal audit history. Adding a note also writes a `note_added` audit event (without copying the note body).
- Notification state and safe retry if implemented.
- Operators may edit journey and contact details, with validation and a revision check; edits record only changed field names in the audit trail, not personal data.
- Operators may assign an active driver and vehicle together, or clear both. Saving with no driver and no vehicle when nothing is assigned is rejected with a visible validation error; the UI must not show a success state for that no-op. Vehicle capacity must cover the current passenger count. Availability and scheduling conflicts still require manual review.

Booking workflow: `enquiry` → `approved` → `confirmed` → `assigned` → `completed`, with `denied` and `cancelled` from the allowed stages. Email-channel bookings send a guest confirmation after the first authorized transition to workflow `confirmed`, and a guest cancellation after the first authorized transition to workflow `cancelled`. WhatsApp-channel and admin-created rows do not send those lifecycle mails. Denied does not send cancellation mail. Status is persisted first; mail failure does not roll back the status. Repeat PATCH of the same terminal status is `INVALID_TRANSITION`. Failed or unsent guest mail is retried with `POST /api/v1/admin/bookings/{reference}/lifecycle-mail` (`kind: confirmed|cancelled`) without changing status. `pending` means delivery is unconfirmed and must not be resent. This is not automatic confirmation and is not exactly-once without provider idempotency.

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

- Release 1 operator model after explicit provision: two persisted roles (`super_admin`, `staff`) in `admin_operator`. Staff keep the operational dashboard and cannot call user-management APIs or escalate. Super admins list/create staff, edit role, enable/disable, and reset credentials. Create is staff-only; promotion is a super-admin PATCH. Partial PATCH writes only the requested field(s) and state-CAS on the observed `role`/`enabled`/`updated_at` (not ABA-proof versioning). Audit and session revoke are owned by a unique `updated_by` write token, not clock equality, so a failed CAS cannot attach side effects to another write even when `updated_at` collides. A lost update is 409 without audit or session revoke. The last enabled super admin cannot be demoted or disabled; `0010_admin_operator_last_super.sql` enforces that with BEFORE UPDATE/DELETE `RAISE(ABORT)` triggers so concurrent count-then-update cannot remove every super_admin. Disabling, resetting, or changing privilege deletes that user's D1 sessions and writes the operator audit in the same D1 batch (fail-closed). Password `requireAdmin` rejects a cookie-cache hit when the session row is gone. Hashes and secrets are never returned. No invite email is sent.
- Production live hosts require an enabled operator row (`super_admin` or `staff`); the env primary no longer admits or excludes there. Production first super-admin: `scripts/provision-primary-admin.mjs` `--preflight-operators`, migrations `0009`+`0010`, `--write-sql` (CREATE, 12+ password, no `BETTER_AUTH_SECRET` needed), then `--write-bootstrap-sql` (inserts only into an empty directory, audits once, replay is a no-op). `POST /api/v1/admin/profile/role` is always 403; password-change bodies cannot set `role`. Staging bootstrap is isolated SQL for existing user `f0af3b28-7b2c-47d5-b619-9239a29c41f9` IFF email is `scalingsmb@gmail.com` and operator prestate is empty or that owner is already the only enabled matching super_admin; it is not applied from this increment and is not a production first-user or allowlist elevation.
- Capture operator identifier, action, entity, old/new status, timestamp, and request ID for changes.
- Do not place customer data in URLs, client logs, analytics, or broad error reports.
- Session timeout uses Better Auth (8 hours, 60-second signed cookie cache). Offboarding is D1 session delete plus password change; authorization still requires a live `"session"` row, so cached cookies do not keep access after revoke.

## Admin UX requirements

- Desktop-first but usable on a phone for urgent review. At typical phone widths (~375px) the nav wraps or scrolls instead of clipping labels, header actions wrap, and KPI cards stack. Bookings and offers tables stay inside the main pane; at narrow widths they stack into labelled rows so TITLE and ACTIONS remain on-screen. Official staging browser checks passed at real Chrome width ~485–500px; 375px and <480px remain unverified.
- Keyboard-accessible tables, filters, dialog/drawer, and calendar alternatives.
- Published special offers do not keep a “Ready to publish” badge. Public offer list cards use the selected main photo (full image URL, thumbnail as srcset) and show MOP with the stored price.
- Confirm destructive/terminal actions; keep status updates reversible only when business policy allows.
- Optimistic UI may be used only when failure rollback is unambiguous; status changes should prefer confirmed server responses.
- Never show a success message before the server confirms persistence.

## Not included

Customer/driver accounts, automated dispatch or conflict detection, live location, payments, invoices, bulk messaging, complex reporting, and record deletion.


