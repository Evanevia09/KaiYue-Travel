# Cloudflare form-notification plan — inventory only

**Task id:** `kai-yue-cloudflare-form-notifications-20261115`  
**Owner request (15 Nov 2026 06:24 Asia/Macau):** later create email notifications for form submissions using Cloudflare mail.  
**Branch:** `cursor/cloudflare-form-notifications-plan-2cad` from live-equivalent closeout `a631f0b` (freeze `cd33cf8c`; **not** `origin/main` `037b93ad`).  
**Status:** `plan` only. **Not** implemented. **Not** onboarded. **Not** sent. **Not** deployed. **Not** merged.  
**Writer run:** `bc-38ae08ab-8286-5b33-ac65-b28874582cad`. Parent Lab event id unavailable; not invented.  
**Do not:** write notification code; onboard/DNS; send mail; submit public forms; expand credentials; auto-email customers; overwrite live `f3169afb` or staging `61bc5a03`; merge PR #35/#34; retry/cancel `41386f` Builds; enable Email Routing; change apex Google Workspace MX/SPF/DMARC; bypass 403 onboarding APIs in browser/keys.

Official retrieval 2026-11-15 (Cloudflare Email Service skill + `docs` MCP):
[Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/),
[send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/),
[get started / domain onboard](https://developers.cloudflare.com/email-service/get-started/send-emails/),
[limits](https://developers.cloudflare.com/email-service/platform/limits/),
[local sending](https://developers.cloudflare.com/email-service/observability/local-development/sending/).

This writer did **not** run `wrangler email sending list` and did **not** call onboarding APIs.

Live-release closeout remains on PR #35 (`cursor/promote-staff-dashboard-ux-from-live-2cad`). Status-label correction there: report delivered 06:29 is **not** `user_accepted`. This notification branch is **not** rebased onto that correction.

## PM read-only prerequisite (15 Nov 2026 06:33 Asia/Macau)

Recorded as given. Not re-probed here.

| Item | Result |
|---|---|
| Zone | `kaiyuemacau.com` `fb84210cb8175ff4412b444805e1a6a5` |
| DNS | Full Cloudflare DNS, **active** |
| Email Sending `cf-bounce` MX / SPF | **Absent** |
| `cf-bounce._domainkey` DKIM | **Absent** |
| Onboarding / limits APIs | **403** (connector + OAuth `2036` unauthorized) |
| Zone plan vs Workers | Zone is **Free**. That is not the Workers plan. **Workers Paid entitlement unknown** |
| Apex Google Workspace MX / SPF / DMARC | **Must stay unchanged** |
| Email Routing | **Do not enable** (conflicts with Google MX) |
| Bypass | **Do not** use in-browser/keys to enable or to work around 403 |

**Onboard is not verified.** `cf-bounce` records absent means Email Sending is not onboarded. Official onboard docs add `cf-bounce` MX/SPF/DKIM **and** a `_dmarc` TXT; that `_dmarc` step is a **conflict risk** with the required-unchanged apex Workspace DMARC. Do not resolve that in code. PM is researching a supported dashboard route, then will seek owner decision for blocked-connector browser/setup.

## From / recipient config (actual source only)

No live mailbox is recorded in git. Values below are quoted from files; none is a chosen production from/to.

| Source | From | Staff to | Reply-To | API key |
|---|---|---|---|---|
| `apps/web/wrangler.jsonc` (local) | `Kai Yue Travel <notifications@example.invalid>` | `ops@example.invalid` | `""` | not set in vars |
| `.env.example` | same `.invalid` from | same `.invalid` to | empty | empty (`RESEND_API_KEY=`) |
| `tests/helpers/memory-d1.ts` | same `.invalid` from | same `.invalid` to | — | test helper only |
| Root `wrangler.jsonc` | **absent** | **absent** | **absent** | **absent** |
| Production overlay `docs/records/wrangler.production-artifact.jsonc` | **absent** | **absent** | **absent** | **absent** (`--keep-vars`) |
| `apps/web/src/lib/server/notifications.ts` | `env.RESEND_FROM` | `env.RESEND_STAFF_TO` | `input.replyTo` or `env.RESEND_REPLY_TO` | skip if `RESEND_API_KEY` missing |
| `BUSINESS_INFORMATION.md` | no email addresses | — | — | — |
| `docs/01-product-scope.md` | open decision: “Notification recipients and reply-to address” | — | — | — |

Not staff-mail config (do not reuse as from/to):

- Root git `ADMIN_EMAILS=admin-test@kaiyue.test` — preview/test operator allowlist; overlay tests **forbid** encoding it (and `uat-admin-20261114@kaiyue.test`, `daniel@kaiyuemacau.com`) in the production overlay.
- Overlay `WHATSAPP_NUMBER=+85328338882` — WhatsApp deep link, not email.
- Live Worker vars: closeout readback reported no temporary admin vars/secrets. Whether `RESEND_API_KEY` / from / to exist on 33ecc was **not** listed. This writer did not list live secrets.

**No production from or staff recipient is inferable.** Owner must name them after onboard is possible. Do not invent `@kaiyuemacau.com` mailboxes.

## Existing form types (source)

**Bookings** `POST /api/v1/bookings` — `communicationChannel`: `email` \| `whatsapp` \| `admin`.

- Staff email attempted **only** for `email`, after D1 insert. Guest email is required on that channel; booking `replyTo` uses guest email.
- `whatsapp`: persist + deep link; `notification_state` `skipped`. Overlay/local WhatsApp number `+85328338882`.
- `admin`: staff-manual create; not emailed unless `sourceTrigger === "admin-manual"` (channel still `admin` → skip).
- Surfaces: Home, consumer service pages, special-offer enquiry (shared widget). Service types in contracts: `airport_transfer`, `hotel_transfer`, `point_to_point`, `hourly_charter`, `city_tour`, `sightseeing`, `corporate`, `custom`. Source modes: `embedded` / `bottom-sheet` / `page`.

**Contacts** `POST /api/v1/contacts` — `inquiryType`: `general` \| `corporate` \| `partnership` \| `media`.

- Staff email attempted on **every** create. Current body is summary + reference only (no name/phone/message/`replyTo` passed).
- Surfaces: `/contact`, `/about` (`defaultType` general); `/corporate`, `/business/travel-agency`, `/business/hotels-resorts` (`BusinessInquiry` `defaultType` corporate). Company required when `corporate`.

**Not mail today:** admin booking/contact status changes; customer acknowledgements (architecture: Release 1 status emails off; customer ack is still an open product decision).

Code: `apps/web/src/lib/server/notifications.ts` (Resend HTTP, **html only**). Callers: `bookings.ts`, `contacts.ts`. No retry worker. Admin KPI counts `notification_state IN ('failed','pending')`. Resend idempotency `${kind}-staff/${reference}`. **No** `send_email` binding in this tree.

## Desired safeguards (keep; do not implement yet)

From existing code/docs:

- Persist D1 first; notification failure must not roll back a stored booking/contact or tell the guest the request failed.
- Skip when sending is unconfigured (`RESEND_API_KEY` absent today); fail when from/to missing or provider errors; record `notification_state`.
- Public APIs create only. Apex/www `/admin` `/login` stay 403. Do not port staging 6-char / temp-admin.
- Logs: request/reference IDs via `logSafe`; no contact or journey bodies. Escape HTML in mail. Treat email content as untrusted.
- Idempotency on public submits. Honeypot `website` max-empty. Privacy accepted on contacts.
- Overlay-only later Worker config; never upload git `wrangler.jsonc` (obsolete D1 `069aa442` + `admin-test@kaiyue.test`). Overlay tests must keep forbidding those test addresses.

From this PM result + Email Service docs (still plan-only):

- **Staff-only** staff notifications. No customer auto-emails.
- **No dual provider:** when Email Service is later implemented, use the Workers binding instead of Resend — do not send through both.
- **Keep existing booking `replyTo`** (guest email when present).
- **Keep existing contact body** (summary + reference only; no inquiry-field expansion).
- Do **not** enable Email Routing. Do **not** change apex Google Workspace MX/SPF/DMARC. Any later `cf-bounce` records must not rewrite those apex records; `_dmarc` clash is an owner/PM gate.
- Do **not** bypass 403 onboarding/limits APIs (connector / OAuth `2036`) with extra keys or in-browser enablement. PM owns dashboard-route research + owner decision.
- When (and only when) onboard is verified: overlay `send_email` with `destination_address` / `allowed_destination_addresses` locked to the **named** staff inbox; `from` on the onboarded domain; `html` **and** `text`; map binding errors to `failed`; local `wrangler dev` simulation only (`remote: true` sends real mail).
- Workers Paid is **unknown**. Docs: arbitrary-recipient sending needs Workers Paid; sends to verified destination addresses can be free before domain onboard. Do not assume Paid.
- No live/staging runtime overwrite until separately authorized. No public form submits for tests.

## Best native approach (blocked until onboard)

Prefer Workers binding `env.EMAIL.send()` over REST/SMTP and over a new Resend key — **after** 33ecc Email Sending onboard is verified without touching Workspace MX and without Email Routing. Not started. No notification code before domain verified.

## Scope defaults (not open questions)

- Booking Reply-To: keep current guest-email behavior.
- Contact mail: keep reference-only body.
- Provider: Email Service only (no dual Resend+Cloudflare sending).
- Audience: staff only.

## Genuine missing choices (not inferable)

1. Owner/PM: dashboard onboard path that adds `cf-bounce` **without** changing apex Workspace MX/SPF/DMARC (and whether `_dmarc` in the official onboard flow is skipped or incompatible).
2. Connector/OAuth 403 unblock (owner decision; not this writer).
3. Workers Paid entitlement on account 33ecc.
4. Production **from** address (source has only `.invalid`). Owner choice; do not invent.
5. Production **staff recipient(s)** (source has only `.invalid`). Owner choice; binding restriction needs the exact address.

## Out of scope now

Notification code, DNS/onboard/enablement, Email Routing, apex MX/SPF/DMARC edits, credential expansion, sends, form submits, live package rebuild, `main` merge, manual Builds, customer acknowledgements.

## Next action

Wait for PM dashboard-route research and owner decision on blocked-connector browser/setup. Keep plan/inventory only until Email Sending onboard is verified **and** from/to are named from owner, not inferred.
