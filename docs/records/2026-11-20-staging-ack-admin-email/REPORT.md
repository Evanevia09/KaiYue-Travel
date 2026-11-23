# Staging acknowledgement + admin notifications enable

**task_id:** `kaiyue-staging-ack-admin-email-20261120`  
**Status:** source overlay switch prepared; live `NOTIFICATIONS_ENABLED` still `"false"` until official-staging CD. Not `user_accepted`. Production **off**.  
**As-of:** 2026-11-20 13:10 Asia/Macau

Owner t320u/t321u/t322u + parent: switch on **staging** staff notifications and customer request-received acks, delivery locked to `scalingsmb@gmail.com`. Production mail stays off until tests pass. Quote widget remains SKIPPED; this writer does not send.

## Continuity

| Item | Value |
| --- | --- |
| Writer | this agent only (`bc-efa1f054` RUNNING). No other RUNNING writers. |
| PR #58 checkpoint | `b0f9f4016621db0e390785847e1bac99270575ab` clean, left unmerged (production mail PREP). Not included here. |
| Base | `official-staging` `04d98ae0b2e3d71f93b5db881affeabbfe327080` |
| Branch | `cursor/staging-ack-admin-email-f58e` |
| Held | PRs #51/#52/#53 OPEN. OAuth not revived. Production Worker untouched. |

## Fresh lock proof (CF GET 2026-11-20T05:05Z, account `33ecc`)

Live Worker `kaiyue-travel-staging` version `8ac4fe0e-b90e-441a-be21-7e3cbdfef7dc` @100% / deployment `6023ba11-9c0e-4852-b321-3fc8982aa59a`.

| Knob | Live value |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://staging.kaiyuemacau.com` |
| `NOTIFICATIONS_ENABLED` | `"false"` (before this CD) |
| `NOTIFY_STAFF_TO` | `scalingsmb@gmail.com` |
| `NOTIFY_ALLOWED_RECIPIENTS` | `scalingsmb@gmail.com` |
| `NOTIFY_FROM_EMAIL` | `bookings@notify.kaiyuemacau.com` |
| `EMAIL.allowed_destination_addresses` | `["scalingsmb@gmail.com"]` only |
| `EMAIL.allowed_sender_addresses` | `["bookings@notify.kaiyuemacau.com"]` |
| D1 / R2 | `043cd0ff` / `kaiyue-offers-staging` |
| Secret names | `BETTER_AUTH_SECRET` only |

Never Daniel / real customers: overlay `NOTIFY_ALLOWED_RECIPIENTS` + `EMAIL.allowed_destination_addresses` both `scalingsmb@gmail.com` only. Recipients outside that lock are skipped.

Live production `kaiyue-travel`: `NOTIFICATIONS_ENABLED=false`, **no** `EMAIL`, no `NOTIFY_*`. Unchanged by this task.

## Source change (staging overlay only)

`deploy/official-staging/constants.json` `vars.NOTIFICATIONS_ENABLED` `"false"` → `"true"`. Overlay regenerated. Guard already allows `"true"`. Candidate test now expects `"true"` and still pins the scalingsmb lock. No app policy rewrite. Production overlay not in this diff.

Next official-staging CD must not revert the switch because the committed overlay is `"true"`.

## Preview messages (not submitted)

Rendered with current `renderStaffMessage` / `renderCustomerAck` (`mailSite=staging`). Both destinations `scalingsmb@gmail.com`. Preview token `KY-STGACK01` is **not** a D1 row; a live POST would allocate `KY-[A-Z2-9]{8}`. Planned idempotency key `stg-ack-admin-20261120-001` unused.

Files: `preview-messages.json`, `staff.html`, `staff.txt`, `customer-ack.html`, `customer-ack.txt`.

| Message | To | From | Subject |
| --- | --- | --- | --- |
| Staff | `scalingsmb@gmail.com` | Kai Yue Travel `<bookings@notify.kaiyuemacau.com>` | `[Staging test] New booking request KY-STGACK01` |
| Customer ack | `scalingsmb@gmail.com` | same | `[Staging test] We received your request KY-STGACK01` |

Customer copy is request-received, **not** a booking confirmation. Locale: en (one synthetic email-channel booking).

No form submit, no REST substitute, no new quote mail.

## Residuals

- Live enable = official-staging merge + CD SUCCESS + independent CF GET `NOTIFICATIONS_ENABLED=true` with lock unchanged.
- Inbox proof of staff+ack is a later PM send card. This writer does not send.
- 10th `send_quote_email` still SKIPPED.
- PR #58 / production mail PREP remains HOLD.
