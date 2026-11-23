# Production promotion candidate from official-staging `ef70396`

**Status:** overlay candidate `3baf3f6` — independent config review PASS; parent staging **visual** browser QA PASS 23 Nov 15:11 Macau. **HOLD** production upload/`0011`/`main`. Parent still resolving staging **inbox** proof on dest `scalingsmb@gmail.com`.  
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

## Parent staging visual QA (23 Nov 15:11 Macau)

PASS on live https://staging.kaiyuemacau.com/ (`ef70396` / Worker `256f1788`). EN / PT / zh-Hant, desktop + 390 + 320: no overlap, overflow, console errors, or mixed content. New WA `+85363128081` and real WeChat JPEG verified. Independent technical **config** review PASS of exact `3baf3f6` (no important defect); CI green. This is **not** staging inbox proof and **not** a 171-file `main` audit.

## Read-only production EMAIL preflight (2026-11-23T07:16Z, GET only)

Account `33ecc75158a1cdd23ba1a62eb70c5103`, MCP `whoami` `scalingsmb@gmail.com`. No send, no purchase, no access change.

| Surface | Live result |
| --- | --- |
| `GET /accounts/…/email/sending/limits` | `recipient_mode=arbitrary`; quota `200`/`day`; usage `sent=8`, `over_quota=false`; resets `2026-11-24T04:30:40Z` |
| `GET /accounts/…/email/sending/reputation` | `status=healthy` |
| Zone `kaiyuemacau.com` `fb84210cb8175ff4412b444805e1a6a5` | active; website plan `Free Website` (zone plan ≠ Email Sending entitlement) |
| `GET /zones/…/email/sending/subdomains` | `notify.kaiyuemacau.com` tag `843a1e29a8a04b2697b43e4858e649e4`, **`enabled=true`**, created 2026-11-16T11:35:37Z |
| `GET …/subdomains/…/dns/status` | **`status=ready`**, `errors=[]`, 6 notify-only records (bounce MX/SPF/DKIM/DMARC) |
| `GET /accounts/…/email/routing/addresses` | **0** destination addresses (`total_count=0`). `daniel@kaiyuemacau.com` is **not** a verified routing dest |
| `GET /zones/…/email/routing` | `enabled=false`, `status=unconfigured` |
| `GET /accounts/…/email/sending/suppressions` | **0** entries |
| Staging Worker EMAIL | dest lock `scalingsmb@gmail.com` + sender `bookings@notify.kaiyuemacau.com` (unchanged) |
| Production Worker EMAIL | **absent**; `NOTIFICATIONS_ENABLED=false`; D1 still `06cf879d`; version still `5eebf7b6` / `494bc151` |
| `GET /accounts/…/subscriptions` | **403** Billing Read (not inferred as Free) |
| Workers account-settings | `default_usage_model=standard` |

Current Cloudflare docs (`send-bindings`, updated 2026-11-17): **no destination restriction** + onboarded domain ⇒ send to any recipient. `allowed_sender_addresses` only restricts From. `allowed_destination_addresses` would block guests (`E_RECIPIENT_NOT_ALLOWED`). `recipient_mode=verified_only` would block anyone not in routing dests (`E_RECIPIENT_PLAN_RESTRICTED`). Docs also: arbitrary-recipient sending requires Workers Paid; live **entitlement field** here is `recipient_mode=arbitrary`.

**Conclusion (entitlement, not a send):** existing account Email Sending **does** support intended production staff `daniel@kaiyuemacau.com` **and** arbitrary guest acks with a **sender-only** binding, because the domain is onboarded/DNS-ready and `recipient_mode` is `arbitrary`. Daniel does **not** need to be added as an Email Routing destination (and was not). Staging dest-lock delivery is **not** this proof. Production Worker still has no `EMAIL` until an authorized upload. This is not a production send.

## Exact `main` promotion / merge-diff verification (171 files)

Do **not** treat the narrow PR #65 review of `3baf3f6` as a full `main` audit.

| Compare | Tip | Files | Meaning |
| --- | --- | --- | --- |
| `origin/main` | `ff119f2c18f075fe5103821d6541625d49986b38` | — | live production git |
| `origin/main...origin/official-staging` | `ef70396` | **165** | already on live staging, not yet on `main` |
| `origin/main...HEAD` (this PR branch) | `3baf3f6` | **171** | cumulative staging + dest-correction overlay/policy |
| `origin/official-staging...HEAD` | PR #65 only | **14** | overlay/policy/docs/tests only |

`main` is a fast-forward base of official-staging (0 unique `main` commits). 15 commits on official-staging not in `main`. `.github/workflows/production.yml` stays fail-closed: **`main` merge does not activate production**.

Verification plan before any `main` merge:

1. Independent review of the **171-file** `origin/main...` candidate (or 165 on `ef70396` plus the 14 PR #65 files after they land on official-staging). Cover MCP/plugin (8 files, production overlay must keep MCP off), admin/auth, notifications, `migrations/0011`, both overlays, WeChat JPEG.
2. Confirm production overlay D1 pin `06cf879d`, no staging dest lock, no `MCP_STAGING_DIRECT_WRITES`, `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`, EMAIL sender-only.
3. Do not merge #61 / #51–#53 / #63 as the vehicle.
4. After `main` lands: operator `0011` on `06cf879d` (`last_issued=0`), then explicit production overlay upload/activate, then read-back. Owner one live booking.

## Promotion checkpoints (parent / owner)

1. ~~Staging visual browser QA~~ **PASS** 23 Nov 15:11 (EN/PT/zh, desktop/390/320). Inbox proof still parent.
2. ~~Independent config review of `3baf3f6`~~ **PASS**. Full 171-file `main` audit still required.
3. Parent finishes staging lifecycle inbox proof (`scalingsmb@gmail.com` only). Quote widget SKIPPED; never `KY-PYPM8Y3E`.
4. Apply `0011` to `06cf879d`; SELECT-only confirm `last_issued=0`.
5. Build with `PUBLIC_SITE_URL=https://kaiyuemacau.com`.
6. Upload + activate `kaiyue-travel` using `deploy/production/wrangler.jsonc`. Do not upload git `wrangler.jsonc`. Do not merge #61.
7. Read-back: version @100%; `EMAIL` sender-only; no dest lock; `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`; `NOTIFICATIONS_ENABLED=true`; WA `+85363128081`; MCP absent; D1 still `06cf879d`; `0011` `last_issued=0`.
8. Owner: **one** live booking from https://kaiyuemacau.com/ (t338u). Not from this VM.

This writer does not deploy production, merge `main`, apply production D1, or send mail.
