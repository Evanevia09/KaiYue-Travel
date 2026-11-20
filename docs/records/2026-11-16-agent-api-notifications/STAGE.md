# Agent API + native Cloudflare email — stage record

- **Task:** `kaiyue-agent-api-20261116` (staging only). Plan: [`../2026-11-16-agent-api-notifications-plan.md`](../2026-11-16-agent-api-notifications-plan.md).
- **Branch:** `cursor/agent-api-notifications-a72c`, based on `official-staging` `ff119f2c` plus PR #46 docs commit `91210655`.
- **Status:** `probe_complete` locally (mocked binding only). Not staged, not `task_verified`, not `user_accepted`, not released. No email has been sent.

## Part A — agent API (no new auth)

- `GET /api/v1/admin/bookings` and `/contacts` accept `q` (2–100 chars, case-insensitive substring, `%`/`_` literal via `ESCAPE`) and `updatedSince` (ISO 8601 with zone). Invalid values return `422 VALIDATION_FAILED`.
- The inquiry list now pages with an opaque `(created_at, id)` cursor, ordered `created_at DESC, id DESC`, so ties never repeat or skip. The admin UI does not use this cursor.
- Contract: [`../../api/admin-agent-v1.openapi.yaml`](../../api/admin-agent-v1.openapi.yaml). Guide: [`../../13-agent-api.md`](../../13-agent-api.md).
- Auth is unchanged: existing Better Auth email/password session cookie on admin hosts, the same roles, same-origin checks, live D1 session check, and audit trail. No API keys, bearer tokens, MCP, new role, or marketing-host auth.

## Part B — native email

### Infrastructure status (reported by ops, not verified from this VM)

- 2026-11-16 19:35:37 Asia/Macau: `notify.kaiyuemacau.com` onboarded for Email Sending on account `33ecc…` (subdomain id `843a1e29…649e4`). The provider published six notify-only DNS records; DNS ready at 19:36 with no errors.
- Google apex MX/SPF/DMARC reported byte-identical. Email Routing stays off; there are no destination addresses, no verification mail, and no test send.
- Limits: quota 200/day, recipient_mode arbitrary, over_quota false.
- Ops sanitized evidence is on the PM computer at `/workspace/kaiyue-notify-sending-onboard-20261116-1935/` (not in this repo).
- This is setup status only. It is **not** a completed email test.

### Code

- Resend removed: the dependency, `RESEND_*` vars, and code. The candidate check still forbids `RESEND_*` names, so there is no dual provider.
- A single `send_email` binding `EMAIL` is used. `notification-policy.ts` gates every send:
  1. The site is resolved from `PUBLIC_SITE_URL` only (`https://kaiyuemacau.com`/`www` = production, `https://staging.kaiyuemacau.com` = staging; anything else skips). `ENVIRONMENT` is ignored because official staging runs with `ENVIRONMENT=production`.
  2. `NOTIFICATIONS_ENABLED` must be exactly `true`.
  3. The `EMAIL` binding must exist.
  4. Staging requires a valid, non-empty `NOTIFY_ALLOWED_RECIPIENTS`. Every staff or customer recipient outside it is skipped and never sent.
- Messages: one staff notice (reply-to = guest) and one localized (en/pt/zh-Hant) customer acknowledgement stating "not a booking confirmation" (no reply-to; text and escaped HTML). Staging subjects carry `[Staging test] `.
- `notification_state`: staff sent + customer sent/skipped = `sent`; exactly one failed = `partial`; staff failed + customer not sent = `failed`; nothing attempted = `skipped`. D1 is written first; idempotent replays do not resend.

### Official staging config (generated overlay, guarded)

- `send_email: [{ name: "EMAIL", allowed_destination_addresses: ["scalingsmb@gmail.com"], allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"] }]`.
- Vars: `NOTIFICATIONS_ENABLED="true"` (owner t322u 20 Nov 2026 staging switch; lock unchanged), `NOTIFY_FROM_EMAIL=bookings@notify.kaiyuemacau.com`, `NOTIFY_FROM_NAME=Kai Yue Travel`, `NOTIFY_STAFF_TO=scalingsmb@gmail.com`, `NOTIFY_ALLOWED_RECIPIENTS=scalingsmb@gmail.com`.
- Live 2026-11-20T05:13Z after PR #59 CD 44679278925: Worker `kaiyue-travel-staging` `3b9240e7` @100% / `4ffbb3e7`, `NOTIFICATIONS_ENABLED="true"`, EMAIL dest still `scalingsmb@gmail.com` only. Live production `5eebf7b6` stays `"false"` / no `EMAIL` until a later operator upload.
- The guard pins the approved recipient and sender, the binding shape, and the lock vars. The candidate check requires exactly one `EMAIL` `send_email` binding and the exact lock vars. It rejects widened restrictions or a `destination_address` outside the approved set. Restriction fields may be omitted in the versions view; in that case the exact var lock is the visible layer.
- Production source overlay `deploy/production/wrangler.jsonc` now prepares `EMAIL` sender-only `bookings@notify.kaiyuemacau.com`, `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`, and `NOTIFICATIONS_ENABLED="true"` (owner t324u). A test asserts that shape. Live production is still `"false"` / no `EMAIL` until operator upload after staging delivery evidence. Do not copy the staging destination lock.
- `wrangler deploy --dry-run` (4.132.0) on the staging overlay lists `env.EMAIL (scalingsmb@gmail.com - senders: bookings@notify.kaiyuemacau.com) Send Email`.

### Residual risk to confirm only during the approved send

The Wrangler 4.132 schema describes `allowed_destination_addresses` as "verified addresses". Current Cloudflare docs (send bindings, updated 2026-10-15) describe it as a plain allowlist, and say that after domain onboarding any recipient is allowed. If the first approved send fails with a recipient error, stop. Do not create Email Routing destinations without owner approval.

## Send approval card (prepared, NOT sent)

**Bounded staging enable (historical card).** Owner t322u 20 Nov 2026 made the overlay `"true"` a durable staging on-switch (lock unchanged). Do not auto-revert to `"false"` after a test send unless the owner asks.

Historical one-shot steps (superseded for the revert):
1. Change only `vars.NOTIFICATIONS_ENABLED` to `"true"` in `deploy/official-staging/constants.json`, regenerate the overlay, update the committed-config test, and promote through the official-staging gates.
2. Submit exactly one booking with the request body below to `POST https://staging.kaiyuemacau.com/api/v1/bookings` (`Origin: https://staging.kaiyuemacau.com`, a fresh `Idempotency-Key`).
3. Read `notification_state` in admin.
4. ~~Set `NOTIFICATIONS_ENABLED` back to `"false"` the same way.~~ Not the 20 Nov owner instruction.

That produces exactly two messages, both to `scalingsmb@gmail.com`. `KY-XXXXXXXX` is the reference the Worker assigns at submit. The exact `text` and `html` bodies captured from the real handler are in [`send-fixture-messages.json`](send-fixture-messages.json).

Request body:

```json
{"serviceType":"airport_transfer","pickupLocation":"Macau International Airport","destination":"Synthetic Test Hotel","pickupAt":"2026-11-20T02:30:00.000Z","passengerCount":1,"communicationChannel":"email","contactName":"Staging Test Guest","email":"scalingsmb@gmail.com","message":"Synthetic staging email test. Not a real booking.","privacyAccepted":true,"sourcePage":"/","sourceTrigger":"hero-embed","sourceMode":"embedded","locale":"en"}
```

If the send happens after 2026-11-19 10:30 Asia/Macau, `pickupAt` must move later; the pickup line in both bodies changes to match.

### Message 1 — staff notice

- **From:** `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`
- **To:** `scalingsmb@gmail.com`
- **Reply-To:** `scalingsmb@gmail.com` (the guest email)
- **Subject:** `[Staging test] New booking request KY-XXXXXXXX`

```text
A new chauffeur booking request is waiting for review.

Name: Staging Test Guest
Email: scalingsmb@gmail.com
Phone: Not provided
Pickup: Macau International Airport
Destination: Synthetic Test Hotel
Pickup time: 20 Nov 2026, 10:30 (Asia/Macau)
Passengers: 1
Message: Synthetic staging email test. Not a real booking.

Reference: KY-XXXXXXXX
Review it in the Kai Yue admin dashboard. Reply to this email to answer the guest directly.
```

### Message 2 — customer acknowledgement

- **From:** `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`
- **To:** `scalingsmb@gmail.com`
- **Reply-To:** none
- **Subject:** `[Staging test] We received your request KY-XXXXXXXX`

```text
Hello Staging Test Guest,

Thank you for contacting Kai Yue Travel. We have received your booking request.

Your reference: KY-XXXXXXXX
Service: Airport transfer
Pickup time: Nov 20, 2026, 10:30 AM (Asia/Macau)

This is not a booking confirmation. Our team will check availability and contact you to confirm the details.

To change your request, contact us through staging.kaiyuemacau.com and quote your reference.

Kai Yue Travel

This is an automated message. Replies to this address are not monitored.
```

Portuguese and Traditional Chinese acknowledgement copy is in `notification-templates.ts`. It is not part of this card and needs owner wording review before production.

## Verification (this VM, local only)

| Check | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | 0 errors |
| `pnpm test` | 42 files, 291 tests pass |
| `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com pnpm build` | pass |
| `node scripts/official-staging-guard.mjs` / `overlay --check` | pass |
| `wrangler deploy --dry-run` staging overlay | bindings as above |

Not verified: any real send, deliverability, the staging upload or candidate check against a real version, synthetic staging API checks, or PM browser checks.
