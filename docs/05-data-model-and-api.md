# 05 — Data Model and API Contract

This is the Release 1 logical model. Exact SQL types and constraints belong in reviewed migrations.

## Tables

### `bookings`

| Field | Notes |
|---|---|
| `id` | Internal UUID/text primary key |
| `reference` | Unique public reference; non-sequential |
| `status` | `new`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| `service_type` | Validated service identifier |
| `pickup_location` | Required normalized text |
| `destination` | Required unless service type explicitly permits omission |
| `pickup_at` | ISO timestamp plus explicit source timezone handling |
| `return_at` | Optional; must be later than pickup |
| `passenger_count` | Positive bounded integer |
| `luggage_count` | Optional bounded integer |
| `vehicle_preference` | Optional, not a guarantee |
| `contact_name` | Required |
| `phone` | Required normalized value plus original display value if needed |
| `email` | Optional unless business rules require it |
| `company` | Optional |
| `notes` | Optional, length-limited plain text |
| `source_page`, `source_trigger` | Attribution without sensitive content |
| `locale` | Submitted locale |
| `notification_state` | e.g. `pending`, `sent`, `partial`, `failed` |
| `created_at`, `updated_at` | UTC |

Indexes: unique `reference`; `pickup_at`; `(status, pickup_at)`; `created_at`.

### `contacts`

`id`, `status` (`new`, `replied`, `closed`), `inquiry_type`, `name`, `phone`, optional `email`, optional `company`, `message`, `source_page`, `locale`, `notification_state`, `created_at`, `updated_at`.

Indexes: `(status, created_at)` and `created_at`.

### `admin_notes`

`id`, `entity_type`, `entity_id`, `body`, `created_by`, `created_at`. Notes are internal, plain text, and never returned by public endpoints.

### `audit_events`

`id`, `entity_type`, `entity_id`, `event_type`, `actor_id`, `from_value`, `to_value`, `request_id`, `created_at`. Store the minimum necessary; do not duplicate full customer data.

### Optional `idempotency_keys`

`key_hash`, `request_hash`, `response_reference`, `expires_at`, `created_at`. Use if idempotency is not stored directly on the booking/contact record.

## State rules

- New public booking → `new`.
- `new` → `confirmed` or `cancelled`.
- `confirmed` → `in_progress` or `cancelled`.
- `in_progress` → `completed` or, with explicit reason, `cancelled`.
- Reopening a terminal state is excluded from Release 1 or requires a deliberate privileged action and audit event.
- Every admin status change is atomic and audited.

## API conventions

- Base path: `/api/v1`.
- JSON requests/responses; UTF-8; ISO 8601 timestamps.
- Public create endpoints accept an `Idempotency-Key` header.
- Never expose internal database IDs when a public reference is sufficient.
- Standard error response:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Check the highlighted fields.",
    "fields": { "pickupAt": "Choose a future time." },
    "requestId": "req_..."
  }
}
```

## Public endpoints

### `POST /api/v1/bookings`

Creates a booking request. Returns `201` with `reference`, `status: "new"`, `receivedAt`, and safe next-step text. A repeated matching idempotent request returns the original successful result. Use `400/422` for invalid input, `409` for conflicting key reuse, `429` for throttling, and `503` for a temporary persistence failure.

### `POST /api/v1/contacts`

Creates a general or corporate inquiry. Returns `201` with a safe reference/receipt identifier and `receivedAt`.

### `GET /api/v1/config/public` (optional)

Returns non-sensitive form configuration such as approved service types and booking constraints. Prefer build-time content when changes do not need to be immediate.

## Protected admin endpoints

| Method and route | Purpose |
|---|---|
| `GET /api/v1/admin/summary` | Counts and upcoming/recent items |
| `GET /api/v1/admin/bookings` | Paginated/filterable list; date range, status, service |
| `GET /api/v1/admin/bookings/:reference` | Booking detail, notes, safe event history |
| `PATCH /api/v1/admin/bookings/:reference/status` | Validated status transition |
| `POST /api/v1/admin/bookings/:reference/notes` | Add internal note |
| `GET /api/v1/admin/contacts` | Paginated/filterable inquiry list |
| `GET /api/v1/admin/contacts/:id` | Inquiry detail |
| `PATCH /api/v1/admin/contacts/:id/status` | Update inquiry status |
| `POST /api/v1/admin/contacts/:id/notes` | Add internal note |

List endpoints use bounded `limit`, cursor pagination, stable sort, and whitelisted filters. CSV export, deletion, bulk actions, and record editing are out of scope unless approved.

## Validation and retention

- Normalize whitespace and phone formats; reject impossible dates and excessive lengths.
- Enforce server-side enumerations and booking notice rules.
- Honeypot, rate limiting/Turnstile if needed, and behavioral controls should avoid blocking legitimate customers.
- Retention and deletion/anonymization rules must be approved before launch. Backups and logs follow the same privacy boundary.


