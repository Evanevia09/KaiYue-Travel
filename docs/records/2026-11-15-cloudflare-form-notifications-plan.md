# Cloudflare form-notification plan — inventory only

**Task id:** `kai-yue-cloudflare-form-notifications-20261115`  
**Owner request (15 Nov 2026 06:24 Asia/Macau):** later create email notifications for form submissions using Cloudflare mail.  
**Branch:** `cursor/cloudflare-form-notifications-plan-2cad` from live-equivalent closeout `a631f0b` (freeze `cd33cf8c`; **not** `origin/main` `037b93ad`).  
**Status:** `plan` only. **Not** implemented. **Not** onboarded. **Not** sent. **Not** deployed. **Not** merged.  
**Writer run:** `bc-38ae08ab-8286-5b33-ac65-b28874582cad`. Parent Lab event id unavailable; not invented.  
**Do not:** write notification code; onboard/DNS; send mail; submit public forms; expand credentials; auto-email customers; overwrite live `f3169afb` or staging `61bc5a03`; merge PR #35/#34; retry/cancel `41386f` Builds.

Official retrieval 2026-11-15 (Cloudflare Email Service skill + `docs` MCP):
[Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/),
[send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/),
[get started / domain onboard](https://developers.cloudflare.com/email-service/get-started/send-emails/),
[limits](https://developers.cloudflare.com/email-service/platform/limits/),
[local sending](https://developers.cloudflare.com/email-service/observability/local-development/sending/).

Email Sending is transactional, Workers Paid for arbitrary recipients. Cloudflare DNS is required. Dashboard path: **Compute → Email Service → Email Sending → Onboard Domain** (adds `cf-bounce` MX/SPF/DKIM and `_dmarc`). This writer did **not** run `wrangler email sending list` (would use whatever Cloudflare login this VM holds, likely old `41386f`, and would expand credentials). PM is checking domain onboard separately.

## Existing triggers (live-equivalent source)

| Trigger | When mail is attempted today | Persistence | Skip / fail |
|---|---|---|---|
| Public booking `POST /api/v1/bookings` | Only `communicationChannel === "email"` **after** D1 insert | Booking row first (`pending`); `notification_state` updated after | WhatsApp → `skipped` (deep link only). Admin-manual (`communicationChannel === "admin"`) → not emailed. Missing `RESEND_API_KEY` → `skipped`. Missing from/to → `failed`. Resend error → `failed`. Persist errors do **not** roll back a stored booking. |
| Public contact `POST /api/v1/contacts` | **Every** create | Contact row first; then notify | Same skip/fail rules. Staff body is **summary + reference only** (no name/phone/message/`replyTo` passed). |
| Booking/contact status changes | **No** mail | Admin audit only | Release 1: no customer/status emails. |

Form surfaces that hit those APIs:

- Booking: Home + consumer service pages + special-offer enquiry (shared widget). Email channel includes journey details and `replyTo` = guest email. WhatsApp is not email.
- Contact: `/contact` and `/about` (`defaultType` general). B2B `/corporate`, `/business/travel-agency`, `/business/hotels-resorts` via `BusinessInquiry` (`defaultType` corporate). Inquiry types: `general` / `corporate` / `partnership` / `media`.

Code: `apps/web/src/lib/server/notifications.ts` (Resend HTTP). Callers: `bookings.ts`, `contacts.ts`. No retry worker. Admin dashboard counts `notification_state IN ('failed','pending')`. Resend idempotency key `${kind}-staff/${reference}`. Current Resend payload is **html only** (no `text`).

## Existing from/to config (not live secrets)

| Source | What it encodes |
|---|---|
| Root git `wrangler.jsonc` | **No** `RESEND_*`. Unsafe live Worker name + obsolete D1 `069aa442` + `ADMIN_EMAILS=admin-test@kaiyue.test`. Do not upload. |
| Production overlay `docs/records/wrangler.production-artifact.jsonc` | **No** `RESEND_FROM` / `RESEND_STAFF_TO` / `RESEND_REPLY_TO`. No `send_email`. `--keep-vars` on live. |
| `apps/web/wrangler.jsonc` (local) | Placeholders `notifications@example.invalid` / `ops@example.invalid` |
| Live Worker vars (closeout readback) | No temporary admin vars/secrets reported. Whether `RESEND_API_KEY` / from / to exist on 33ecc was **not** independently listed here. |

**No** `send_email` binding anywhere in this tree.

## Best native approach (when prerequisites pass)

Prefer Cloudflare Email Service **Workers binding** (`env.EMAIL.send()`), not REST/SMTP and not a new Resend key:

- Add `send_email` in the **production overlay only** (never git top-level `kaiyue-travel` 069aa442 file).
- Restrict with `destination_address` or `allowed_destination_addresses` once staff recipient is chosen (`allowed_sender_addresses` optional for from).
- `from` must be on the onboarded domain.
- Keep persist-first; map binding throw/`code` (`E_SENDER_DOMAIN_NOT_AVAILABLE`, `E_RATE_LIMIT_EXCEEDED`, `E_DAILY_LIMIT_EXCEEDED`, `E_RECIPIENT_NOT_ALLOWED`, `E_RECIPIENT_SUPPRESSED`, …) to `notification_state` `failed`; keep skip when sending is not configured.
- Include both `html` and `text` (docs; current Resend path has html only).
- Local: default `wrangler dev` **simulates** (console/files, no send). `remote: true` sends **real** mail — do not enable until a test recipient is chosen.
- Limits that matter later: 50 recipients combined; 25 MiB message; 998-char subject; new accounts have a conservative daily quota. Sends to **verified destination addresses** are free of quota even before domain onboard.
- Do not use Email Service for marketing.

**Do not write this code until domain onboard on account 33ecc is verified.**

## Genuine missing choices (not inferable)

1. **Sending domain onboarded on 33ecc?** Unknown. Required: Cloudflare DNS on `kaiyuemacau.com` (or chosen send domain); dashboard onboard; `cf-bounce` + DMARC present. PM check.
2. **From address** (e.g. `notifications@kaiyuemacau.com` vs another mailbox). Overlay and live secrets do not record a real from. Local file uses `.invalid`.
3. **Staff recipient(s).** `RESEND_STAFF_TO` is placeholder. Owner must name the live ops inbox. Binding `destination_address` needs that exact address.
4. **Reply-To:** booking email currently uses guest email when present; contact path passes none. Confirm keep/drop.
5. **Whether live already has `RESEND_API_KEY`.** If yes, replacing Resend vs dual-running is an owner choice; not inferred.
6. **Contact email body:** keep reference-only vs include inquiry fields (PII in mail).
7. **Verified destination addresses** before domain onboard (sends only to verified destinations, free of quota) vs after onboard (any recipient).

## Prerequisite gaps before implementation

- Domain onboard on **Kai Yue account 33ecc**, not 41386f.
- DNS: Cloudflare-hosted zone; `cf-bounce` SPF/DKIM/MX; `_dmarc`.
- Chosen from + staff to; no customer auto-mail.
- Overlay-only `send_email` (and later `wrangler types`); no live/staging runtime overwrite until separately authorized.
- Local tests must use simulation or a designated test inbox — no public form submits.
- Workers paid plan for Email Sending (docs) if sending beyond verified destinations.
- Keep persist-first and 403 admin gate. Do not port staging 6-char admin policy.

## Out of scope now

Customer acknowledgements, status-change mail, WhatsApp as email, DNS/onboarding by this writer, sends, live package rebuild, `main` merge.

## Next action

Wait for PM domain-onboard / sender-recipient confirmation. Then a **separate** implementation task may add overlay `send_email` + persist-first staff mail. Do not start that here.
