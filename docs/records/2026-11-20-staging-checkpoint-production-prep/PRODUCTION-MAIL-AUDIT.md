# Production mail path — source candidate (not uploaded)

**As-of:** 2026-11-20T05:30Z  
**Scope:** owner t324u “proceed until you can land all changes to production”. This candidate prepares overlay + policy + mocked tests with `NOTIFICATIONS_ENABLED="true"` in **source**. Live production is still mail-off. No send, no overlay upload, no merge to `main`.

Owner t315u 20 Nov 11:20 Macau: production staff inbox is **the admin email**. Canonical verified identity is `daniel@kaiyuemacau.com`. Customer request-received acks (not confirmed bookings) are in scope. Owner t324u 20 Nov 13:27: source must not stay `"false"` while calling all notifications live.

Quote widget remains **SKIPPED/CLOSED** (never called; not a gate for this source prep). Mail-on **upload** remains HOLD until staging delivery evidence and owner PASS.

## 1. Live production today (Worker `kaiyue-travel`)

Independent Cloudflare GET 2026-11-20T05:28Z, account `33ecc75158a1cdd23ba1a62eb70c5103`.

| Item | Live value |
| --- | --- |
| Version | `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% (deployment `494bc151` since 2026-11-16) |
| `NOTIFICATIONS_ENABLED` | `"false"` |
| `EMAIL` / `send_email` | **absent** on live |
| `NOTIFY_*` | **absent** on live |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` |
| `WHATSAPP_NUMBER` | `+85328338882` (old number until a later operator upload) |
| D1 / R2 | `06cf879d` / `kaiyue-offers-production` |

Public booking and contact persist to D1 first. Live `resolveMailPolicy` still returns `skipped` / `notifications_disabled`. No Cloudflare Email Service call occurs on live production.

Live staging (unchanged by this candidate): Worker `kaiyue-travel-staging` `3b9240e7` @100% / `4ffbb3e7`, `NOTIFICATIONS_ENABLED="true"`, dest/staff/allowed `scalingsmb@gmail.com` only.

## 2. Prepared production overlay (source only — not uploaded)

`deploy/production/wrangler.jsonc` is the reviewed cutover **source**. `keep_vars: false`. Official account `33ecc`. Sending subdomain `notify.kaiyuemacau.com` already onboarded. No Google apex MX / Routing / DNS change. No API keys. No new service.

| Knob | Prepared value | Why |
| --- | --- | --- |
| `NOTIFICATIONS_ENABLED` | `"true"` | Owner t324u: all-notifications-live in source. Upload still HOLD. |
| `EMAIL` | name `EMAIL`; `allowed_sender_addresses: ["bookings@notify.kaiyuemacau.com"]`; **no** `destination_address` / `allowed_destination_addresses` | CF send-bindings: sender lock only. Omitting destination restriction is required so guest acks can leave the Worker. Copying the staging single-inbox lock would make guest acks fail with `E_RECIPIENT_NOT_ALLOWED`. |
| `NOTIFY_FROM_EMAIL` | `bookings@notify.kaiyuemacau.com` | Existing approved native sender |
| `NOTIFY_FROM_NAME` | `Kai Yue Travel` | Existing approved display name |
| `NOTIFY_STAFF_TO` | `daniel@kaiyuemacau.com` | Owner t315u |
| `NOTIFY_ALLOWED_RECIPIENTS` | **absent** | A production lock would block guest destinations in code (`production_recipient_lock_forbidden`) |
| `WHATSAPP_NUMBER` | `+85363128081` | Owner enquiry number; office tel stays site.phone |
| Staging knobs | **absent** | No `MCP_STAGING_DIRECT_WRITES`, `STAGING_QUOTE_EMAIL_ENABLED`, `ADMIN_EMAILS`, `scalingsmb@gmail.com` |

Current Cloudflare Email Sending Workers API: `env.EMAIL.send({ to, from, subject, html, text, replyTo })`. Errors throw `Error` with `.code`. App persist-first; thrown send → `failed`/`partial`; D1 is not rolled back.

## 3. Code guards

| Guard | Behaviour |
| --- | --- |
| Production staff pin | `NOTIFY_STAFF_TO` must equal `VERIFIED_PRODUCTION_STAFF_TO` (`daniel@kaiyuemacau.com`) or policy is `failed` / `production_staff_mismatch` |
| Production recipient lock | Any `NOTIFY_ALLOWED_RECIPIENTS` on production is `failed` / `production_recipient_lock_forbidden` |
| Staging isolation | Staging `NOTIFY_STAFF_TO=daniel@…` is `skipped` / `production_staff_on_staging`. Staging also refuses that address as a customer destination even if the lock is widened. |
| Staging lock | Official-staging overlay unchanged: destination + `NOTIFY_*` lock `scalingsmb@gmail.com`; ordinary mail `NOTIFICATIONS_ENABLED="true"` (live after PR #59) |
| Quote | `sendStagingQuote` remains staging-admin + staging-quote only. Production site cannot enable it. |
| WhatsApp bookings | Still do not call `sendNotifications` |

## 4. What each path does after a later operator upload of this overlay

| Path | After upload+activate of this source (`NOTIFICATIONS_ENABLED=true`) |
| --- | --- |
| Staff booking notice (email channel) | Staff HTML+text to `daniel@kaiyuemacau.com`; `replyTo` = guest; no `[Staging test]`; logo `https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png` |
| Customer booking ack | Guest request-received / not a confirmation, localized |
| WhatsApp-channel booking | Persist; still no email |
| Staff inquiry | Staff notice to Daniel |
| Customer inquiry ack | Guest ack when email present |
| Quote email | **FORBIDDEN** on production hosts. Not part of this cutover |

Until that upload, live production remains skipped/`notifications_disabled`.

## 5. Staging remains the owner-test lock

Official-staging overlay and live Worker: `NOTIFY_STAFF_TO` / `NOTIFY_ALLOWED_RECIPIENTS` / `EMAIL.allowed_destination_addresses` = `scalingsmb@gmail.com`. Staging must not send to Daniel.

## 6. Remaining activation (not this commit)

1. Parent staging ack+admin native preview/approval + real-app delivery evidence. This writer does not POST or send.
2. Independent human review of this candidate vs current `official-staging` and `main`.
3. Merge this candidate to `official-staging` only after that review (not PR #58; that published branch is not rebased).
4. Reviewed PR `official-staging` → `main`.
5. Operator upload of `deploy/production/wrangler.jsonc` only (build `PUBLIC_SITE_URL=https://kaiyuemacau.com`). Candidate-view: production D1/R2, `EMAIL` sender lock, no destination lock, no staging knobs, `NOTIFICATIONS_ENABLED=true`.
6. Quote widget stays SKIPPED/CLOSED. Do not re-ask or treat it as a remaining send from this writer.

Do not send from this writer. Do not mutate live production config. Do not copy staging destination lock.

## 7. This writer will not (still)

- Upload or activate production.
- Merge this candidate or PR #58 until parent verification PASS.
- Send mail, REST-substitute, Resend, or reopen the closed quote question.
- Expand production MCP / revive OAuth PRs #51–#53.
