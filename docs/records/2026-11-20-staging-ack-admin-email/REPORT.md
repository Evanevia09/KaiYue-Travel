# Staging acknowledgement + admin notifications enable

**task_id:** `kaiyue-staging-ack-admin-email-20261120`  
**Status:** **LIVE ENABLED** on official staging. `NOTIFICATIONS_ENABLED="true"` with delivery locked to `scalingsmb@gmail.com`. Not `user_accepted`. Production **off**. Inbox proof not done (this writer did not send).  
**As-of:** 2026-11-20 13:13 Asia/Macau (CF GET after CD)

Owner t320u/t321u/t322u + parent: switch on **staging** staff notifications and customer request-received acks, delivery locked to `scalingsmb@gmail.com`. Production mail stays off until tests pass. Quote widget remains SKIPPED; this writer does not send.

## Continuity

| Item | Value |
| --- | --- |
| Writer | this agent only (`bc-efa1f054` RUNNING). No other RUNNING writers. |
| PR #59 | squash-merged `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2` into `official-staging` (head was `e3fd2d1a768c59fb62311c92350383b0c959169f`) |
| CD | [official-staging.yml 44679278925](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/44679278925) SUCCESS (checks → upload → verify → activate + smoke) |
| PR #58 checkpoint | `b0f9f4016621db0e390785847e1bac99270575ab` clean, left unmerged (production mail PREP). Not included. |
| Held | PRs #51/#52/#53 OPEN. OAuth not revived. Production Worker untouched. |

## Live result (CF GET 2026-11-20T05:13Z, account `33ecc75158a1cdd23ba1a62eb70c5103`)

Live Worker `kaiyue-travel-staging` version `3b9240e7-2f67-408c-a16c-92fa9645974d` @100% / deployment `4ffbb3e7-9a10-40b0-8cac-594a48db509a` (created 2026-11-20T05:13:26Z). Hosts `staging.kaiyuemacau.com` and `admin-staging.kaiyuemacau.com`.

| Knob | Live value |
| --- | --- |
| `PUBLIC_SITE_URL` | `https://staging.kaiyuemacau.com` |
| `NOTIFICATIONS_ENABLED` | **`"true"`** |
| `NOTIFY_STAFF_TO` | `scalingsmb@gmail.com` |
| `NOTIFY_ALLOWED_RECIPIENTS` | `scalingsmb@gmail.com` |
| `NOTIFY_FROM_EMAIL` | `bookings@notify.kaiyuemacau.com` |
| `EMAIL.allowed_destination_addresses` | `["scalingsmb@gmail.com"]` only |
| `EMAIL.allowed_sender_addresses` | `["bookings@notify.kaiyuemacau.com"]` |
| Hosts | `staging.kaiyuemacau.com`, `admin-staging.kaiyuemacau.com` |
| D1 / R2 | `043cd0ff` / `kaiyue-offers-staging` |
| Secret names | `BETTER_AUTH_SECRET` only |

Never Daniel / real customers from staging: overlay `NOTIFY_ALLOWED_RECIPIENTS` + `EMAIL.allowed_destination_addresses` both `scalingsmb@gmail.com` only. Recipients outside that lock are skipped.

Live production `kaiyue-travel` version `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% / deployment `494bc151-3081-4a26-9d1c-40428e0025e3` (unchanged since 2026-11-16): `NOTIFICATIONS_ENABLED=false`, **no** `EMAIL`, no `NOTIFY_*`, D1 `06cf879d`, R2 `kaiyue-offers-production`.

## Source change (staging overlay only)

`deploy/official-staging/constants.json` `vars.NOTIFICATIONS_ENABLED` `"false"` → `"true"`. Overlay regenerated. Guard already allows `"true"`. Candidate test expects `"true"` and still pins the scalingsmb lock. No app send-path rewrite. Production overlay not in this diff. Next official-staging CD will keep `"true"`.

Independent review (`bc-64bb1bfc`): Approve with nits (docs nits applied). Would not send to anyone other than `scalingsmb@gmail.com`. Production not enabled.

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

- Inbox proof of staff+ack is a later PM send card. This writer does not send.
- 10th `send_quote_email` still SKIPPED.
- PR #58 / production mail PREP remains HOLD. Production mail remains **OFF**.
