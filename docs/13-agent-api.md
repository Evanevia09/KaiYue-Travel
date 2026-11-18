# Agent access to the admin API

An AI agent works the booking and inquiry queues through the **same admin API, account, and gates as a staff member in the browser**. The machine-readable contract is [`api/admin-agent-v1.openapi.yaml`](api/admin-agent-v1.openapi.yaml). A test checks that every documented path exists in the Worker router.

## What it is not

- The HTTP API uses the existing staff session and account roles.
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

`q` is a case-insensitive substring match; `%` and `_` are treated literally. Results are paged with `limit` (1-50) and the opaque `nextCursor`. Bookings are sorted by pickup time; inquiries are newest first with a tie-break on id, so pagination is stable while matching records stay unchanged. Invalid parameters return `422 VALIDATION_FAILED`.

## Changing records

- Booking approvals can progress from enquiry to approved, confirmed, assigned, and completed. Denied and cancelled are distinct terminal statuses. Staff can keep using the existing enquiry-to-assigned path. Inquiry status can progress from new to replied to closed.
- Booking edits, assignment, and MCP status changes use `expectedUpdatedAt` from the latest read. A `409 CONFLICT` means someone else changed the record: re-read it, then decide.
- Every change is audited under the agent's account.
- Never tell a guest a booking is confirmed from the API alone. Confirmation stays a human decision on WhatsApp or email.

## Data handling

Responses contain guest personal data. Do not log full responses, put them in URLs, or send them to third-party tools beyond what the task needs.

## Connect an agent on staging

Open [Kai Yue Travel agent tools](https://staging.kaiyuemacau.com/plugin). Share that link with an agent or staff member. It links to a machine-readable capability list and the connection instructions.

1. The staff user signs in at the staging admin site in their browser and opens **Connect a staging agent**.
2. Add `https://admin-staging.kaiyuemacau.com/api/v1/admin/mcp` using Streamable HTTP and enter the generated token in the MCP client's secure bearer-token setting. The token expires after 30 minutes and depends on the existing staff session. The staff password stays in the browser sign-in.
3. On connection, the MCP server supplies the working instructions and the ten tool schemas. When a write tool returns a review link, the same staff user reviews and approves the exact change in the browser. Then the agent retries the same tool call.

### What the ten tools can do

| Tool | Use |
| --- | --- |
| `list_bookings` | List enquiries or other bookings by status and date, with assignment IDs |
| `get_booking` | Read the schedule, status, assigned driver, and assigned vehicle |
| `list_inquiries` | List general inquiries by status or last update |
| `get_inquiry` | Read a specific general inquiry by reference |
| `list_inventory` | See drivers, vehicles, and vehicle capacities |
| `edit_booking` | Update itinerary fields or passenger count |
| `change_booking_status` | Approve, confirm, deny, assign in the workflow, complete, or cancel |
| `assign_booking` | Assign an active inventory driver and vehicle with enough seats |
| `draft_quote` | Preview the email for a staff-supplied fixed amount or hourly rate and duration |
| `send_quote_email` | Submit the approved quote to the designated staging test inbox |

Tool results omit contact details, trip addresses, plates, messages, and internal notes. Editing an itinerary preserves its existing contact fields. Active inventory indicates dispatch eligibility. Confirm schedule availability separately. A booking status change records the staff decision, and a quote submission records provider acceptance. Guest communication is a separate action.

### Local Codex option

The [local Codex plugin](../plugins/kaiyue-travel-staging/) uses the same tools over MCP stdio on macOS. To build and install from this repository:

```bash
pnpm install --frozen-lockfile
npm --prefix plugins/kaiyue-travel-staging ci
npm --prefix plugins/kaiyue-travel-staging run build
npm --prefix plugins/kaiyue-travel-staging test
codex plugin marketplace add "$PWD"
codex plugin add kaiyue-travel-staging@kaiyue-travel-local
```

Use a generic password item in the macOS login keychain with the service name `Kai Yue Travel Staging Plugin` and account `kaiyue-staging-agent`. The password field holds a JSON object with the approved staff account's `email` and `password`. Enter the values in Keychain Access. For local booking writes, the MCP client needs to support a human confirmation form. Quote approval uses the same browser review as hosted MCP.
