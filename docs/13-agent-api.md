# Agent access to the admin API

An AI agent works the booking and inquiry queues through the **same admin API, account, and gates as a staff member in the browser**. The machine-readable contract is [`api/admin-agent-v1.openapi.yaml`](api/admin-agent-v1.openapi.yaml). A test checks that every documented path exists in the Worker router.

## What it is not

- No API keys, bearer tokens, MCP server, or new role. The agent has exactly the permissions of its admin account.
- No password in a URL, and no password sent on every request.
- No direct D1 access.
- No authentication on marketing hosts. `www`, apex, and the staging marketing host return 403 for admin APIs.
- No bypass. `DEV_ADMIN_BYPASS` is local-only and is rejected by the staging and production gates.

## Account

The owner creates or chooses an admin account for the agent in **Users**, normally with the `staff` role. Staff can read and work bookings and inquiries; only a super admin can manage users. Disable the account in Users to revoke access immediately: the Worker re-checks the account and session in D1 on every request. A password change ends existing sessions. Store the password only in the agent's secret store.

## Session flow

1. Sign in on the admin host with `POST /api/auth/sign-in/email` and a JSON body `{ "email", "password" }`. Send an `Origin` header equal to the admin origin, for example `https://admin-staging.kaiyuemacau.com`.
2. Keep every cookie from the response in a cookie jar and send them on each `/api/v1/admin/*` call.
3. On each `POST` or `PATCH`, send the same `Origin` header.
4. On `401`, sign in once again. Sessions last up to 8 hours. Sign-in attempts are rate limited.
5. Call `POST /api/auth/sign-out` when done.

```bash
ORIGIN=https://admin-staging.kaiyuemacau.com
curl -sS -c jar -H "Origin: $ORIGIN" -H 'content-type: application/json' \
  --data @credentials.json "$ORIGIN/api/auth/sign-in/email"   # file kept out of shell history
curl -sS -b jar "$ORIGIN/api/v1/admin/bookings?q=chan&status=enquiry"
curl -sS -b jar -H "Origin: $ORIGIN" -X POST "$ORIGIN/api/auth/sign-out"
```

## Finding work

| Need | Request |
| --- | --- |
| New enquiries | `GET /api/v1/admin/bookings?status=enquiry` |
| Find a guest or reference | `GET /api/v1/admin/bookings?q=<2-100 chars>` (reference, name, email, phone) |
| Find an inquiry | `GET /api/v1/admin/contacts?q=<text>` (adds company) |
| Changes since the last poll | `...?updatedSince=2026-11-16T10:00:00Z` (time zone required) |

`q` is a case-insensitive substring match; `%` and `_` are treated literally. Results are paged with `limit` and the opaque `nextCursor`. An omitted or non-finite limit defaults to 20. Finite numbers are truncated to integers and clamped to 1–50. Bookings are sorted by pickup time; inquiries are newest first with a tie-break on id, for stable ordering when records stay unchanged. Invalid search, timestamp, and cursor values return `422 VALIDATION_FAILED`.

## Endpoints and responses

| Action | Request | Success body |
| --- | --- | --- |
| List bookings | `GET /api/v1/admin/bookings` | `{ items, nextCursor, total }` |
| Create booking | `POST /api/v1/admin/bookings` + `Idempotency-Key` | `201 { reference, status: "enquiry", receivedAt, nextStep }` |
| Booking detail | `GET /api/v1/admin/bookings/{reference}` | `{ booking, notes, events }` |
| Edit booking | `PATCH /api/v1/admin/bookings/{reference}` | `{ booking }` |
| Assign / clear | `PATCH /api/v1/admin/bookings/{reference}/assignment` | `{ booking }` |
| Change status | `PATCH /api/v1/admin/bookings/{reference}/status` | `{ booking }` |
| Add note | `POST /api/v1/admin/bookings/{reference}/notes` | `201 { id, entityType, entityId, body, createdBy, createdAt }` |
| List inquiries | `GET /api/v1/admin/contacts` | `{ items, nextCursor }` (no `total`) |
| Inquiry detail | `GET /api/v1/admin/contacts/{id}` | `{ contact, notes, events }` |
| Inquiry status | `PATCH /api/v1/admin/contacts/{id}/status` | `{ contact }` |
| Drivers | `GET` / `POST /api/v1/admin/drivers`, `PATCH /api/v1/admin/drivers/{id}` | `{ items }` / `{ item }` |
| Vehicles | `GET` / `POST /api/v1/admin/vehicles`, `PATCH /api/v1/admin/vehicles/{id}` | `{ items }` / `{ item }` |

`notes` and `events` inside detail responses use stored snake_case names (`created_by`, `event_type`, `from_value`, `to_value`, `created_at`); everything else is camelCase.

Staff-entered bookings use `communicationChannel: "admin"`, `sourceTrigger: "admin-manual"`, `sourceMode: "page"`, and `sourcePage: "/admin/bookings"`, exactly like the admin UI. That channel sends no email. The same validation, rate limit, and idempotency rules as the public form apply. Send one random `Idempotency-Key` (8-128 characters) per intended booking and reuse it only to retry that booking.

## Changing records

- Booking status: enquiry → assigned or cancelled; assigned → completed or cancelled. Inquiry status: new → replied or closed; replied → closed. Other moves return `409 INVALID_TRANSITION`.
- A booking edit is a full replacement: send every journey and contact field from the latest read with your changes applied. Omitted contact fields, destination, return time, and message are cleared. Edit errors return a message without per-field details.
- Booking edits and assignment require `expectedUpdatedAt` from the latest read. A `409 CONFLICT` means someone else changed the record: re-read it, then decide. Never retry a 409 blindly.
- Assignment takes both `driverId` and `vehicleId`, or both `null`. Both must be active and the vehicle must seat `passengerCount`. Assignment does not change status.
- Every change, including driver and vehicle changes, is audited under the agent's account.
- Never tell a guest a booking is confirmed from the API alone. Confirmation stays a human decision on WhatsApp or email.

## Recommended client

Use a small direct HTTP client over this contract; it needs nothing on the server beyond what staff already use.

1. Sign in once, keep the cookie jar in memory, and send `Origin` on every write.
2. On `401`, sign in once more and repeat the request; if it fails again, stop and alert a human.
3. Treat `422` as an input problem, `409` as "re-read and decide", and `429`/`503` as "back off and retry later".
4. Poll with `updatedSince` set to the newest `updatedAt` seen minus a few seconds, follow `nextCursor` to the end, and de-duplicate by reference and `updatedAt`.
5. Sign out when the run ends.

A local MCP wrapper over the same calls is only worth adding if the agent host accepts nothing but MCP tools. It adds no capability and is another place holding the password.

## Known limitations

- Status changes, notes, and driver/vehicle updates have no `expectedUpdatedAt`. Transition rules still block invalid status moves, but two writers can race on otherwise valid changes.
- The public booking endpoint also accepts `communicationChannel: "admin"` when `sourceTrigger` is `admin-manual`, so a public request can look staff-entered. Treat `communicationChannel` and `sourceTrigger` as informational, not as proof of who created a booking.
- Only the `email` channel triggers notifications; `whatsapp` and `admin` bookings appear only in the admin list, so poll for them.
- Authentication is the cookie session only. There is no bearer or service token.

## Data handling

Responses contain guest personal data. Do not log full responses, put them in URLs, or send them to third-party tools beyond what the task needs.
