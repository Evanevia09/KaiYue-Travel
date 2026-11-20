# Production mail path — prepared cutover (not activated)

**As-of:** 2026-11-20T03:30Z  
**Scope:** owner t315u named the production staff inbox; this PR prepares overlay, policy guards, and mocked tests. Live production is still mail-off. No send, no overlay upload, no merge.

Owner t315u 20 Nov 11:20 Macau: production staff inbox is **the admin email**. Canonical verified identity is `daniel@kaiyuemacau.com`. Customer request-received acks (not confirmed bookings) were already requested (Nov 15 both customer/admin; Nov 16 make email working on the paid kaiyue Cloudflare account). Fail-closed mail-off was temporary until verified + release, not a permanent product exclusion.

Mail-on remains **pending**. `NOTIFICATIONS_ENABLED` stays `"false"` until remaining PM gates and a later operator activation.

## 1. Live production today (Worker `kaiyue-travel`)

Independent Cloudflare GET `/accounts/33ecc…/workers/scripts/kaiyue-travel/settings` at 2026-11-20T02:23:37Z (not re-read this increment).

| Item | Live value |
| --- | --- |
| Annotation | `production 696c2bd8 / main ff119f2c` |
| Version | `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% (deployment `494bc151` since 2026-11-16) |
| `NOTIFICATIONS_ENABLED` | `"false"` |
| `EMAIL` / `send_email` | **absent** on live |
| `NOTIFY_*` | **absent** on live |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` |
| `WHATSAPP_NUMBER` | `+85328338882` (old number until a later operator upload) |

Public booking and contact persist to D1 first. Live `resolveMailPolicy` still returns `skipped` / `notifications_disabled`. No Cloudflare Email Service call occurs on live production.

## 2. Prepared production overlay (source only — not uploaded)

`deploy/production/wrangler.jsonc` now contains the reviewed cutover **source**. `keep_vars: false`. Official account `33ecc`. Sending subdomain `notify.kaiyuemacau.com` already onboarded. No Google apex MX / Routing / DNS change. No API keys. No new service.

| Knob | Prepared value | Why |
| --- | --- | --- |
| `NOTIFICATIONS_ENABLED` | `"false"` | Activation switch. Upload of this file still does not send. |
| `EMAIL` | name `EMAIL`; `allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"]`; **no** `destination_address` / `allowed_destination_addresses` | CF send-bindings: sender lock only. Omitting destination restriction is required so guest acks can leave the Worker. Copying the staging single-inbox lock would make guest acks fail with `E_RECIPIENT_NOT_ALLOWED`. |
| `NOTIFY_FROM_EMAIL` | `bookings@notify.kaiyuemacau.com` | Existing approved native sender |
| `NOTIFY_FROM_NAME` | `Kai Yue Travel` | Existing approved display name |
| `NOTIFY_STAFF_TO` | `daniel@kaiyuemacau.com` | Owner t315u |
| `NOTIFY_ALLOWED_RECIPIENTS` | **absent** | A production lock would block guest destinations in code (`production_recipient_lock_forbidden`) |
| Staging knobs | **absent** | No `MCP_STAGING_DIRECT_WRITES`, `STAGING_QUOTE_EMAIL_ENABLED`, `ADMIN_EMAILS`, `scalingsmb@gmail.com` |

Current Cloudflare Email Sending Workers API: `env.EMAIL.send({ to, from, subject, html, text, replyTo })`. Errors throw `Error` with `.code` (`E_RATE_LIMIT_EXCEEDED`, `E_SENDER_NOT_VERIFIED`, `E_RECIPIENT_NOT_ALLOWED`, `E_DELIVERY_FAILED`, …). App persist-first; thrown send → `failed`/`partial`; D1 is not rolled back.

## 3. Code guards

| Guard | Behaviour |
| --- | --- |
| Production staff pin | `NOTIFY_STAFF_TO` must equal `VERIFIED_PRODUCTION_STAFF_TO` (`daniel@kaiyuemacau.com`) or policy is `failed` / `production_staff_mismatch` |
| Production recipient lock | Any `NOTIFY_ALLOWED_RECIPIENTS` on production is `failed` / `production_recipient_lock_forbidden` |
| Staging isolation | Staging `NOTIFY_STAFF_TO=daniel@…` is `skipped` / `production_staff_on_staging`. Staging also refuses that address as a customer destination even if the lock is widened. |
| Staging lock | Official-staging overlay unchanged: destination + `NOTIFY_*` lock `scalingsmb@gmail.com`; ordinary mail `NOTIFICATIONS_ENABLED=false` |
| Quote | `sendStagingQuote` remains staging-admin + staging-quote only. Production site cannot enable it. |
| WhatsApp bookings | Still do not call `sendNotifications` |

## 4. What each path does

| Path | After this PREP upload (switch still false) | After a later mail-on (`NOTIFICATIONS_ENABLED=true`) |
| --- | --- | --- |
| Staff booking notice (email channel) | Persist; skipped `notifications_disabled` | Staff HTML+text to `daniel@kaiyuemacau.com`; `replyTo` = guest; no `[Staging test]`; logo `https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png` |
| Customer booking ack | skipped | Guest request-received / not a confirmation, localized |
| WhatsApp-channel booking | Persist; no `sendNotifications` | Still no email |
| Staff inquiry | Persist; skipped | Staff notice to Daniel |
| Customer inquiry ack | skipped | Guest ack when email present |
| Quote email | **FORBIDDEN** on production hosts | Still unavailable. Not part of this cutover |

## 5. Staging remains the owner-test lock

Official-staging overlay is unchanged: `NOTIFY_STAFF_TO` / `NOTIFY_ALLOWED_RECIPIENTS` / `EMAIL.allowed_destination_addresses` = `scalingsmb@gmail.com`. Ordinary notifications stay off unless a separate staging delivery test is explicitly approved. Staging must not send to Daniel.

## 6. Remaining activation (not this commit)

1. PM 10th `send_quote_email` actual workflow + Gmail receipt (still **UNSENT**; t315u answered staff inbox, not the quote widget). Treat native quote question as skipped, not yes.
2. Independent human review of this mail PREP (code-reviewer: Approve with nits; CodeRabbit CLI unauthenticated).
3. Merge PR #58 to `official-staging`, then reviewed PR to `main`.
4. Operator upload of `deploy/production/wrangler.jsonc` only (build `PUBLIC_SITE_URL=https://kaiyuemacau.com`). Candidate-view: production D1/R2, `EMAIL` sender lock, no destination lock, no staging knobs, `NOTIFICATIONS_ENABLED=false`.
5. Separate mail-on: flip `NOTIFICATIONS_ENABLED` to `"true"` after that upload is verified. t316u: notify once **all** changes are live. t308–t311 still require all stage checks first.

Do not send from this writer. Do not mutate live production config. Do not copy staging destination lock.

## 7. This writer will not (still)

- Set live `NOTIFICATIONS_ENABLED=true`.
- Upload or activate production.
- Merge PR #58.
- Send mail, REST-substitute, Resend, or card-bypass the 10th quote.
- Expand production MCP / revive OAuth PRs #51–#53.
