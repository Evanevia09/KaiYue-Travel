# Agent access to the admin API

An AI agent works the booking and inquiry queues through the **same admin API, account, and gates as a staff member in the browser**. The machine-readable contract is [`api/admin-agent-v1.openapi.yaml`](api/admin-agent-v1.openapi.yaml). A test checks that every documented path exists in the Worker router.

## What it is not

- No API keys, bearer tokens, MCP server, or new role.
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

`q` is a case-insensitive substring match; `%` and `_` are treated literally. Results are paged with `limit` (1-50) and the opaque `nextCursor`. Bookings are sorted by pickup time; inquiries are newest first with a tie-break on id, so pages never repeat or skip a record. Invalid parameters return `422 VALIDATION_FAILED`.

## Changing records

- Booking status: enquiry → assigned or cancelled; assigned → completed or cancelled. Inquiry status: new → replied or closed; replied → closed.
- Booking edits and assignment require `expectedUpdatedAt` from the latest read. A `409 CONFLICT` means someone else changed the record: re-read it, then decide.
- Every change is audited under the agent's account.
- Never tell a guest a booking is confirmed from the API alone. Confirmation stays a human decision on WhatsApp or email.

## Data handling

Responses contain guest personal data. Do not log full responses, put them in URLs, or send them to third-party tools beyond what the task needs.
