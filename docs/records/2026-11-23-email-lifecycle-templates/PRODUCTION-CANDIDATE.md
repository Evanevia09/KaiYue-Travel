# Production promotion candidate from official-staging `ef70396`

**Status:** source candidate prepared. **HOLD** for parent technical review and staging browser QA.  
**Not** a `main` merge. **Not** uploaded. **Not** activated. **Not** a production D1 write. **Do not** merge PR #61 (`f774f69`) or held #51–#53 / CodeMode #63.

**Authority (not OPEN):** Owner t315u 20 Nov 2026 11:20 Macau, answering *Which inbox should receive staff booking and enquiry notifications in production?* → **the admin email. daniel@**. Same-day instructions and PR #61 `f774f69` / `22ee115` encode `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`. That is **notification inbox approval**, not admission-only. Do not re-ask. Do not reopen tourist-board / MGTO 15 Nov widget approval.

**Tree:** live `official-staging` `ef703969381894597f0ed5db3d8023232253862c` (KY##### persist, lifecycle-mail claim, WeChat JPEG). Overlay shape taken from the reviewed PR #61 dest/sender encoding, applied onto this tree. Staging owner-only lock is **unchanged**.

Canonical overlay: `deploy/production/wrangler.jsonc` (also snapshotted as `wrangler.production-lifecycle-candidate.jsonc`).

## Live production today (must stay until an authorized promote)

Worker `kaiyue-travel` `5eebf7b6` @100% / `main` `ff119f2c` / deployment `494bc151`. Mail **off**. No `EMAIL`. No `NOTIFY_STAFF_TO`. D1 `06cf879d-8fea-4088-8881-7d382e1b8c11` schema `0001`–`0010` only. WhatsApp on live HTML `+85328338882`. WeChat JPEG not on live HTML.

## Git candidate (this branch; not live)

| Item | Candidate | Must not copy from staging |
| --- | --- | --- |
| Worker / account | `kaiyue-travel` / `33ecc75158a1cdd23ba1a62eb70c5103` | staging Worker name |
| D1 | **`06cf879d-8fea-4088-8881-7d382e1b8c11`** | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` |
| R2 | `kaiyue-offers-production` | `kaiyue-offers-staging` |
| `EMAIL` | sender-only `bookings@notify.kaiyuemacau.com` | `allowed_destination_addresses` / staging dest lock |
| `NOTIFY_STAFF_TO` | **`daniel@kaiyuemacau.com`** (t315u) | `scalingsmb@gmail.com` |
| `NOTIFY_ALLOWED_RECIPIENTS` | **absent** (guest acks) | staging lock |
| `NOTIFICATIONS_ENABLED` | `true` (activation source) | — |
| `NOTIFY_FROM_EMAIL` / `NAME` | `bookings@notify.kaiyuemacau.com` / `Kai Yue Travel` | — |
| `WHATSAPP_NUMBER` | `+85363128081` | — |
| Office tel | `site.phone` `+853 2833 8882` unchanged | — |
| WeChat JPEG | `apps/web/public/images/wechat-qr.jpg` SHA-256 `3877f629…` | — |
| MCP | **off** (no `MCP_STAGING_DIRECT_WRITES`) | staging MCP flag |
| `ADMIN_EMAILS` | **absent** | staging admission list |

Runtime pin (this tree): production `NOTIFY_STAFF_TO` must be `daniel@kaiyuemacau.com` or send fails closed; a production recipient lock fails closed so guests can be acked. Staging dest remains `scalingsmb@gmail.com`; staging cannot staff-To Daniel.

## Schema `0011` on production PIN `06cf879d` (operator step; not this VM)

Apply `migrations/0011_chauffeur_booking_serial.sql` to **`06cf879d-8fea-4088-8881-7d382e1b8c11` only**, before activating a Worker that allocates `KY#####`.

- Additive. Inserts `chauffeur_booking_serial` id=1 **`last_issued=0`**.
- Do **not** copy staging `last_issued` or staging booking rows.
- Do **not** rewrite legacy `KY-xxxxxxxx` rows. Contacts stay `INQ-`.
- CD does not apply migrations. SELECT-only readback before traffic: `d1_migrations` includes `0011_chauffeur_booking_serial.sql`; `last_issued=0`.

## Promotion checkpoints (parent / owner after this HOLD)

1. Parent staging browser QA / actual send on dest `scalingsmb@gmail.com` only. Quote widget SKIPPED; never `KY-PYPM8Y3E`.
2. Independent technical review of **this PR HEAD** (overlay + policy pin + tests). Self-test is not review.
3. Apply `0011` to `06cf879d`; SELECT-only confirm `last_issued=0`.
4. Build with `PUBLIC_SITE_URL=https://kaiyuemacau.com`.
5. Upload + activate `kaiyue-travel` using `deploy/production/wrangler.jsonc` (same D1/R2 IDs). Do not upload git `wrangler.jsonc`. Do not merge #61 as the vehicle.
6. Read-back: version @100%; `EMAIL` sender-only; no dest lock; `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`; `NOTIFICATIONS_ENABLED=true`; WA `+85363128081`; MCP absent; D1 still `06cf879d`; `0011` `last_issued=0`.
7. Owner: **one** live booking from https://kaiyuemacau.com/ (t338u). Not from this VM.

This writer does not deploy production, merge `main`, apply production D1, or send mail.
