# Production mail path audit (read-only — not activated)

**As-of:** 2026-11-20T02:23Z  
**Scope:** map what live production does today, what PR #58 / `official-staging` `04d98ae0` would do after a later overlay upload, and what is still a missing owner decision.  
**Not done:** no `EMAIL` binding added, no `NOTIFICATIONS_ENABLED` flip, no recipient invented or expanded, no send.

This is the committed pointer for the production-mail gap. Code promotion and mail activation are **separate**. Shipping branded templates with mail off is **not** an operational email workflow.

## 1. Live production today (Worker `kaiyue-travel`)

Independent Cloudflare GET `/accounts/33ecc…/workers/scripts/kaiyue-travel/settings` at 2026-11-20T02:23:37Z.

| Item | Live value |
| --- | --- |
| Annotation | `production 696c2bd8 / main ff119f2c` |
| Version | `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% (deployment `494bc151` since 2026-11-16) |
| `NOTIFICATIONS_ENABLED` | `"false"` |
| `EMAIL` / `send_email` | **absent** |
| `NOTIFY_FROM_EMAIL` / `NOTIFY_FROM_NAME` / `NOTIFY_STAFF_TO` / `NOTIFY_ALLOWED_RECIPIENTS` | **absent** |
| `STAGING_QUOTE_EMAIL_ENABLED` | **absent** |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` |
| `WHATSAPP_NUMBER` | `+85328338882` (old number until a later operator upload) |

Public booking and contact **persist to D1 first**. Mail is a side effect. With the live overlay, `resolveMailPolicy` returns `{ ok:false, state:"skipped", reason:"notifications_disabled" }` before the binding check. `sendNotifications` logs `notification_skipped` and returns `skipped`. Rows store `notification_state=skipped`. No Cloudflare Email Service call occurs.

## 2. Why the binding is missing and the switch is false

Documented decisions, not guesses:

1. **2026-11-16 production operator release** (`docs/records/2026-11-16-production-operator-release.md`): “Mail switch. Notifications send only when `NOTIFICATIONS_ENABLED` is exactly `true` … The production overlay sets `false`.” Closeout: “Config: mail off.” “Production mail remains off; enabling it is a separate reviewed gap.” Production mail was **not verified** at activation (owner waived further tests at 18:46; not `user_accepted`).
2. **2026-11-16 agent API + native email plan** (`docs/records/2026-11-16-agent-api-notifications-plan.md`, owner 19:32): staging only. Staging recipients **only** `scalingsmb@gmail.com`. “Production stays `"false"`, and the production overlay is unchanged.” Sender `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`. Apex Google mail / MX unchanged. Email Routing is not used.
3. **Production overlay comments** (`deploy/production/wrangler.jsonc`): “`NOTIFICATIONS_ENABLED` stays `"false"` until delivery is reviewed and validated. Do not add `send_email` here until a reviewed production mail cutover.”
4. **Staging vs production overlays:** official-staging **has** `EMAIL` locked to destination `scalingsmb@gmail.com` / sender `bookings@notify.kaiyuemacau.com`, with `NOTIFICATIONS_ENABLED=false` (booking/inquiry staff+ack still off) and `STAGING_QUOTE_EMAIL_ENABLED=true` (MCP quote send on admin-staging only). That binding and those `NOTIFY_*` vars were never copied into production.

So the missing production `EMAIL` binding is **intentional fail-closed**, not an accidental omit from PR #58.

## 3. What each notification does after current PR #58 (if later uploaded, mail still off)

PR #58 overlay still has `NOTIFICATIONS_ENABLED="false"` and **no** `send_email`. Branded HTML+text templates (`notification-templates.ts`, green `#008c5e` / gold `#f3a600`, logo from `PUBLIC_SITE_URL`) **ship as code**. Runtime send stays inert.

Assume operator upload of `deploy/production/wrangler.jsonc` only, built with `PUBLIC_SITE_URL=https://kaiyuemacau.com`, after remaining PM gates. Then:

| Path | Trigger | After PR #58 overlay (mail off) | If mail were later turned on correctly (not this PR) |
| --- | --- | --- | --- |
| Staff booking notice | `POST` public booking with `communicationChannel=email` (`bookings.ts`) | Persist; `sendNotifications` → **skipped** (`notifications_disabled`) | Staff HTML+text to `NOTIFY_STAFF_TO`; `replyTo` = guest email; no `[Staging test]` prefix; logo `https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png` |
| Customer booking ack | same, when guest supplied an email | skipped | Guest “request received / not a confirmation” ack, localized |
| WhatsApp-channel booking | `communicationChannel=whatsapp` | Persist; **`sendNotifications` is not called** | Still no email (code only emails the email channel) |
| Staff inquiry notice | every `POST /api/v1/contacts` | Persist; skipped | Staff notice to `NOTIFY_STAFF_TO` |
| Customer inquiry ack | inquiry with guest email | skipped | Guest ack when email present |
| Quote email | MCP `send_quote_email` → `POST /api/v1/admin/quotes/email` → `sendStagingQuote` | **FORBIDDEN** on production hosts (`resolveHostRole !== "staging-admin"`). Staging-quote policy also requires `mailSite==="staging"` and `STAGING_QUOTE_EMAIL_ENABLED` | Still unavailable on production. There is **no** production quote-mail product path in this candidate |

`keep_vars: false` on the production overlay drops leftover staging vars on upload. Staging knobs (`MCP_STAGING_DIRECT_WRITES`, `STAGING_QUOTE_EMAIL_ENABLED`, `NOTIFY_*` scalingsmb lock, `ADMIN_EMAILS`) do not leak if the operator uses this overlay file.

## 4. Documented recipient policy (do not invent)

| Address / identity | Documented role | Production mail destination? |
| --- | --- | --- |
| `scalingsmb@gmail.com` | Owner-approved **staging test inbox** (plan 2026-11-16; staging overlay lock; quote allowlist). Premerge quote receipt Gmail `1a1f6a2b076efed7` | **No.** Staging lock only. Must not be copied to production staff mail. |
| `bookings@notify.kaiyuemacau.com` | Approved **sender** on Email Sending subdomain `notify.kaiyuemacau.com` (staging `allowed_sender_addresses`; docs/08) | Sender candidate if owner re-confirms for production. Not a staff inbox. |
| `daniel@kaiyuemacau.com` | `VERIFIED_PRODUCTION_PRIMARY_EMAIL` — production **operator identity** / first super_admin (`admin-primary.ts`). Also listed in staging `ADMIN_EMAILS` | **Not** a documented mail destination. Do not treat as `NOTIFY_STAFF_TO`. |
| Guest emails on bookings/inquiries | Customer ack recipients in code | Only if production mail is on **and** the `send_email` destination policy allows arbitrary guests |

**There is no documented, owner-approved production `NOTIFY_STAFF_TO` in this repository.** `BUSINESS_INFORMATION.md` does not name a production staff inbox. This writer must not invent one.

Production policy (`notification-policy.ts`): on `mailSite==="production"`, `NOTIFY_ALLOWED_RECIPIENTS` may be empty (`allowedRecipients=null` → no code allowlist). A missing or invalid `NOTIFY_FROM_EMAIL` / `NOTIFY_STAFF_TO` is `failed` (not skipped) **if** the enable switch and binding are already on. Staging always requires a non-empty lock.

## 5. Existing capabilities vs missing owner decisions

### Already in place (do not redo)

- Cloudflare Email Sending on account `33ecc`; sender domain `notify.kaiyuemacau.com` used by staging.
- Worker `EMAIL.send` implementation (`notifications.ts`, `quotes.ts`).
- Branded templates (staff, customer ack, staging quote).
- Fail-closed switches: exact `"true"`, binding present, production `PUBLIC_SITE_URL` hosts only (`kaiyuemacau.com` / `www.kaiyuemacau.com`), never `ENVIRONMENT`.
- Staging quote path isolated to admin-staging.

### Minimum steps to activate **normal** staff+customer mail (future, owner-authorized)

These are the existing code/config levers. None are executed now.

1. Owner names a production **staff inbox** for `NOTIFY_STAFF_TO` (missing decision).
2. Owner chooses destination policy for the production `send_email` binding (missing decision):
   - Staff-only: lock `allowed_destination_addresses` to that staff inbox → customer acks **cannot** send to guests.
   - Staff + guest acks: the binding cannot reuse the staging single-address lock; destinations must allow guest addresses (or customer acks stay off).
3. Operator adds `send_email` name `EMAIL` on Worker `kaiyue-travel` with `allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"]` (or another owner-approved sender on `notify.kaiyuemacau.com`).
4. Overlay vars: `NOTIFY_FROM_EMAIL=bookings@notify.kaiyuemacau.com`, `NOTIFY_FROM_NAME=Kai Yue Travel`, `NOTIFY_STAFF_TO=<owner-chosen>`, `NOTIFICATIONS_ENABLED="true"`. Optional production `NOTIFY_ALLOWED_RECIPIENTS` only if owner wants a lock (would block guest acks if it lists only staff).
5. Separate reviewed overlay upload (not the current PR #58 file as written). Candidate-view must show production D1/R2, new `EMAIL` binding, no staging knobs.
6. One owner-approved test send. Then monitor `notification_state` on real rows.

Required approvals: owner recipient + destination-policy decision; reviewed overlay change; human review for privacy/mail (AGENTS.md). Not peer self-approval. Not this HOLD PR.

### Meaningful missing owner decisions (cannot be filled from repo)

1. Production staff inbox.
2. Whether customers receive acks on production, and how Cloudflare destination restriction is set so that is possible.
3. Whether production quote email should exist at all (`sendStagingQuote` is staging-admin only by design).
4. Whether WhatsApp-channel bookings should also email staff (they currently do not).

## 6. What “all changes to production after all tests PASS” still is not

Owner t308u–t311u authorizes promoting the **approved staging candidate** (WA `+85363128081`, QR, branded **code**, MCP staging-only gates that stay inert on production hosts) after PM 10-tool + quote-inbox PASS.

That promote, with the current production overlay, leaves mail **inert**. It is not a complete production notification workflow. Claiming live customer/staff/quote email from that upload would be false.

Staging quote to `scalingsmb@gmail.com` (bot gate) does not authorize production mail.

## 7. This writer will not

- Add `send_email` to `deploy/production/wrangler.jsonc`.
- Set `NOTIFICATIONS_ENABLED=true` on production.
- Copy `scalingsmb@gmail.com` or assume `daniel@kaiyuemacau.com` as `NOTIFY_STAFF_TO`.
- Merge PR #58 or upload production from this audit.
