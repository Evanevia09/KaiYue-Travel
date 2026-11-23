# Official-staging closeout — PR #64 squash `ef70396`

**Date:** 2026-11-23 15:00 Asia/Macau (UTC 07:00)  
**Authority:** Owner t337u / t339u; parent native GitHub merge of PR #64 (no admin bypass, no ruleset change).  
**This writer:** read-only Cloudflare + GitHub confirmation. No booking, status PATCH, or mail send from this VM. No production merge, deploy, or D1 write.

## Git

| Item | Value |
| --- | --- |
| Reviewed HEAD merged | `3823d48b20a73f699896d86e96590012e3b4b571` (PR #64 tip; squash replaced the branch commits) |
| Squash on `official-staging` | `ef703969381894597f0ed5db3d8023232253862c` |
| Parent of squash | `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2` |
| PR | https://github.com/Evanevia09/KaiYue-Travel/pull/64 `MERGED` |
| Merge | native GitHub squash, `merged: true`, 2026-11-23T06:56:41Z |

## CD

| Item | Value |
| --- | --- |
| Workflow | `official-staging` |
| Run | https://github.com/Evanevia09/KaiYue-Travel/actions/runs/45127576945 |
| Event | `push` of `ef70396` |
| Status | `completed` / `success` 2026-11-23T06:59:45Z |
| Jobs | checks, upload, verify, activate (incl. `official-staging-smoke.mjs`) all SUCCESS |
| Migrations | CD does **not** apply D1 migrations. `0011` was already present; counter was **not** reset. |

## Live official staging (read-only GET after CD)

| Item | Value |
| --- | --- |
| Public URL | https://staging.kaiyuemacau.com/ |
| Admin | https://admin-staging.kaiyuemacau.com/login |
| Worker | `kaiyue-travel-staging` |
| Account | `33ecc75158a1cdd23ba1a62eb70c5103` |
| Version | `256f1788-34f1-4012-bc32-e97367588c8a` (#27) created 2026-11-23T06:58:58Z |
| Traffic | **100%** |
| Deployment | `d178b6c2-6e74-4c3c-aa5b-f991be481971` 2026-11-23T06:59:39Z |
| Previous version replaced | `3b9240e7-2f67-408c-a16c-92fa9645974d` / `4ffbb3e7-9a10-40b0-8cac-594a48db509a` (2026-11-20) |

HTTP GET `https://staging.kaiyuemacau.com/` 200 (CDN `HIT` after activate; CD smoke already passed). Canonical `https://staging.kaiyuemacau.com/`. Hero island `BookingEmbedded`. WhatsApp `wa.me/85363128081`. WeChat JPEG `/images/wechat-qr.jpg` 200, 143228 bytes, source SHA-256 `3877f629e7dd6a91f9e644ec06da14fd6c444309d8bbe505a76a8d5138cc67dc`. Held quote `KY-PYPM8Y3E` not in HTML. No form submit from this VM.

## Config-safe proof (live Worker settings + D1 SELECT)

Target D1 **unchanged:** `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` (`kaiyue-travel-staging`). R2 `kaiyue-offers-staging`.

Owner-only staging mail dest **preserved** (not widened, not Daniel):

| Binding / var | Live value |
| --- | --- |
| `EMAIL` | present |
| `EMAIL.allowed_destination_addresses` | `scalingsmb@gmail.com` only |
| `EMAIL.allowed_sender_addresses` | `bookings@notify.kaiyuemacau.com` only |
| `NOTIFICATIONS_ENABLED` | `true` |
| `NOTIFY_STAFF_TO` | `scalingsmb@gmail.com` |
| `NOTIFY_ALLOWED_RECIPIENTS` | `scalingsmb@gmail.com` |
| `NOTIFY_FROM_EMAIL` | `bookings@notify.kaiyuemacau.com` |
| `WHATSAPP_NUMBER` | `+85363128081` |
| `MCP_STAGING_DIRECT_WRITES` | `true` (staging only) |
| `ADMIN_EMAILS` | includes `daniel@kaiyuemacau.com` as **operator admission**, not a mail dest |

D1 SELECT-only (`changed_db: false`, `rows_written: 0`):

| Query | Result |
| --- | --- |
| `d1_migrations` | `0001`–`0011` including `0011_chauffeur_booking_serial.sql` |
| `chauffeur_booking_serial` | id=1 **`last_issued=0`** (preserved, not reset) |
| `bookings` count | 13 (legacy; no new `KY#####` from this VM) |

## Production (unchanged; do not promote)

| Item | Value |
| --- | --- |
| URL | https://kaiyuemacau.com/ |
| Worker | `kaiyue-travel` version `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% |
| Deployment | `494bc151-3081-4a26-9d1c-40428e0025e3` since 2026-11-16T10:54:51Z |
| Annotation | `production 696c2bd8 / main ff119f2c` |
| Mail | `NOTIFICATIONS_ENABLED=false`; **no** `EMAIL`; **no** `NOTIFY_STAFF_TO` |
| D1 | `06cf879d-8fea-4088-8881-7d382e1b8c11` — `0001`–`0010` only; no `chauffeur_booking_serial` |
| WhatsApp on live HTML | `+85328338882` (office). Candidate WA `+85363128081` is **not** live. |
| WeChat JPEG | **not** on live production HTML |

`daniel@kaiyuemacau.com` is `VERIFIED_PRODUCTION_PRIMARY_EMAIL` (admission). It is **not** a production mail dest.

## Next (not this VM)

1. Parent BOX browser staging QA / actual send permission (dest `scalingsmb@gmail.com` only). Do not use skipped quote `KY-PYPM8Y3E`.
2. Production candidate plan (docs only): `PRODUCTION-CANDIDATE.md` in this folder. Do **not** merge prod PR #61. Do **not** deploy `main`. Do **not** write production D1 from this writer.
3. Owner: **one** live production booking after a verified production release of this feature.

Held: PRs #51–#53, CodeMode #63 `16e06ba`, prod #61 `f774f69`. Quote widget SKIPPED.
