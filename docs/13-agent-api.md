# Agent access to the admin API

An AI agent works the booking and inquiry queues through the **same admin API, account, and gates as a staff member in the browser**. The machine-readable contract is [`api/admin-agent-v1.openapi.yaml`](api/admin-agent-v1.openapi.yaml). A test checks that every documented path exists in the Worker router.

## What it is not

- The HTTP API uses the existing staff session and account roles.
- Staging MCP uses that same staff email and password. There is no separate API-key system.
- No password in a URL, and no password sent on every request after the short staging MCP session exchange.
- No direct D1 access.
- No authentication on marketing hosts. `www`, apex, and the staging marketing host return 403 for admin APIs.
- No bypass. `DEV_ADMIN_BYPASS` is local-only and is rejected by the staging and production gates.

## Account

The owner creates or chooses an admin account for the agent in **Users**, normally with the `staff` role. Staff can read and work bookings and inquiries; only a super admin can manage users. Disable the account in Users to revoke access immediately: the Worker re-checks the account and session in D1 on every request. A password change ends existing sessions. Store the password only in the agent's secret store.

## Session flow

1. Sign in on the admin host with `POST /api/auth/sign-in/email` and a JSON body `{ "email", "password" }`. Send an `Origin` header equal to the admin origin, for example `https://admin-staging.kaiyuemacau.com`.
2. Keep every cookie from the response in a cookie jar and send them on each `/api/v1/admin/*` call.
3. On each `POST` or `PATCH`, send the same `Origin` header.
4. On `401`, sign in once again. Sessions last up to 8 hours. Wrong, unknown, disabled, and unprovisioned passwords all return the same generic `401`. Three failed password sign-ins lock that account and source IP for five minutes on both `POST /api/auth/sign-in/email` and `POST /api/v1/admin/mcp-session`. The lock is stored in D1 `rate_limits` (not memory). A locked request returns `429` with `Retry-After` and does not check the password. `/login` shows a generic five-minute wait message, not “wrong password”. A successful sign-in clears the counters. Hosted Cloudflare uses `CF-Connecting-IP` only; client `X-Forwarded-For` is ignored there.
5. Call `POST /api/auth/sign-out` when done.

```bash
ORIGIN=https://admin-staging.kaiyuemacau.com
curl -sS -c jar -A 'KaiYue-staging-mcp/1.0' -H "Origin: $ORIGIN" -H 'content-type: application/json' \
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

Fetch [https://staging.kaiyuemacau.com/plugin](https://staging.kaiyuemacau.com/plugin) (canonical [https://staging.kaiyuemacau.com/plugin.txt](https://staging.kaiyuemacau.com/plugin.txt)). That URL is `text/plain; charset=utf-8` with `X-Robots-Tag: noindex, nofollow, noarchive`. It is public machine-readable instruction, not an AI-only security boundary. The JSON list is `/plugin/capabilities.json`.

Staging MCP uses the existing staff or `super_admin` email and password. There is no API-key system. The connected agent keeps that account’s normal permissions. This path exists only on `admin-staging.kaiyuemacau.com`. Production hosts, including `admin.kaiyuemacau.com`, do not offer it.

Browser vaults, including Grok Bot Vault, fill browser fields only. They cannot inject credentials into HTTP APIs. Generic agent clients are supported; this is not Grok-exclusive.

1. Map a secure secret field to environment password and email, or collect them in a secure in-chat form. Do not visit `/login` or `/admin/agent-connect`, and do not put the password in a URL.
2. Identify the client honestly. Send `User-Agent: KaiYue-staging-mcp/1.0` or `ClientName/version`. Do not impersonate a browser. Cloudflare Browser Integrity Check on this zone blocked `Python-urllib/3.13` (HTTP 403, source `bic`) on the same `POST /api/v1/admin/mcp-session` path that succeeded with `KaiYue-staging-mcp-auth-test/1.0`.
3. `POST` JSON `{ "email", "password" }` to `https://admin-staging.kaiyuemacau.com/api/v1/admin/mcp-session`. Origin is not required. Disabled or unprovisioned accounts fail closed. Three failed attempts lock the account and IP for five minutes (`429` + `Retry-After`); the same lock covers `/api/auth/sign-in/email`. The response token lasts 1800 seconds and stands in for that staff session.
4. Add `https://admin-staging.kaiyuemacau.com/api/v1/admin/mcp` using Streamable HTTP and send `Authorization: Bearer` with that token. Then `initialize`, `tools/list`, and a read tool.
5. When a write tool returns a review link, the same staff user reviews and approves the exact change in the browser. Then the agent retries the same tool call.

### Failure handling

| Status | Meaning | Client action |
| --- | --- | --- |
| `401` | Generic credential failure (wrong, unknown, disabled, or unprovisioned) | Stop. Do not brute-retry. Three failures lock five minutes. |
| `429` + `Retry-After` | Durable account+IP lockout | Wait the stated interval (five minutes). Do not retry during the lock. |
| `403` Cloudflare error `1010` | Edge Browser Integrity Check, before the Worker | Stop. Contact the owner. Do not retry the password. Do not spoof a browser User-Agent. |

A Worker JSON `403` is a host/origin gate, not error 1010.

### Operator BIC exception (applied 2026-11-19 — not source)

Verified cause (Cloudflare GraphQL `httpRequestsAdaptive`, official Kai Yue account `33ecc75158a1cdd23ba1a62eb70c5103`, zone `fb84210cb8175ff4412b444805e1a6a5`): both staging `POST /api/v1/admin/mcp-session` failures were HTTP 403, source `bic` / action `block`, User-Agent exact `Python-urllib/3.13` (22:08:23 ray `a5cfc9652fbb7c97`, 22:11:43 ray `a5cfce47dbc574d1`). The same path returned 200 at 21:21:10 with `KaiYue-staging-mcp-auth-test/1.0`. Honest application identification remains the client requirement.

Owner approved a narrow exception at 22:27 Macau. An operator applied it at 22:28:27 (`last_updated` `2026-11-19T14:28:27.210982Z`). It is **not** a git/Worker change.

- Ruleset `a8eec7c4fb8b4dfcba60c80255ec28fc` (`http_config_settings`), rule `40c580d7c4f747dd838ddb380ca534af`, ref `staging_mcp_bic_off`, enabled, `set_config` `bic: false` only.
- Expression: `(http.host eq "admin-staging.kaiyuemacau.com" and http.request.uri.path in {"/api/v1/admin/mcp-session" "/api/v1/admin/mcp-session/" "/api/v1/admin/mcp" "/api/v1/admin/mcp/"})`
- Zone `browser_check` stays **on**; `security_level` stays **medium**; no production host; no `/login`; no other product skip.

Post-apply urllib probe (no credentials): `GET` that session path returned **405** `Allow: POST` (`cf-ray` `a5cfe8b49c61ef68-IAD`); empty-body `POST` returned **403** `Cross-site POST form submissions are forbidden` (Astro form CSRF, not error 1010).

Rollback: disable or delete that one rule. Leave `browser_check` on.

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

Prefer `KAIYUE_STAGING_STAFF_EMAIL` and `KAIYUE_STAGING_STAFF_PASSWORD` from a secure secret field mapped to the environment. If those are unset, a generic macOS keychain item still works: service `Kai Yue Travel Staging Plugin`, account `kaiyue-staging-agent`, with a JSON object of the staff `email` and `password`. If neither is present, collect email and password in a secure in-chat form and set those environment variables. Do not visit the admin sign-in page. The local plugin sends `User-Agent: KaiYue-staging-mcp/1.0`. For local booking writes, the MCP client needs to support a human confirmation form. Quote approval uses the same browser review as hosted MCP.
