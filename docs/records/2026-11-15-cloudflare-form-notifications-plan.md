# Cloudflare form-notification plan — inventory only

**Task id:** `kai-yue-cloudflare-form-notifications-20261115`  
**Owner request (15 Nov 2026 06:24 Asia/Macau):** later create email notifications for form submissions using Cloudflare mail.  
**Branch:** `cursor/cloudflare-form-notifications-plan-2cad` from live-equivalent closeout `a631f0b` (freeze `cd33cf8c`; **not** `origin/main` `037b93ad`).  
**Status:** `plan` only. **Not** implemented. **Not** onboarded. **Not** sent. **Not** deployed. **Not** merged. Workers Paid **not** activated (this writer has no purchase authority).  
**Writer run:** `bc-38ae08ab-8286-5b33-ac65-b28874582cad`. Parent Lab event id unavailable; not invented.  
**Do not:** write notification code until onboard verified; onboard/DNS; send mail; submit public forms; expand credentials; auto-email customers; overwrite live `f3169afb` or staging `61bc5a03`; merge PR #35/#34; retry/cancel `41386f` Builds; enable Email Routing; change apex Google Workspace MX/SPF/DMARC; buy/activate Workers Paid; create a new Worker/repo.

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

**Onboard is not verified.** `cf-bounce` records absent means Email Sending is not onboarded.

## Owner 12:09 (15 Nov 2026 Asia/Macau) — continue setup as far as possible

Recorded as given. Not re-probed; no Paid purchase; no DNS.

| Item | Result |
|---|---|
| 33ecc Email Sending UI | Requires **Workers Paid**. Account is **Free**. Domain **not** onboarded. |
| Checkout | No non-committing checkout reached. Paid **$5/month + usage**. Unauthorized dialog too. |
| Purchase authority | **Owner has none.** This writer must not activate Paid. |
| Sending domain | **`notify.kaiyuemacau.com` explicitly requested** (dedicated subdomain). |
| Staff recipient | **Not provided.** Parent is asking. Do not invent. |
| Apex mail | Keep Google Workspace MX/SPF/DMARC. **No Email Routing.** |
| Architecture | Native Kai Yue form notifications on **existing** `kaiyue-travel` Worker. Do **not** copy Rowmount into a new shared/non-durable Worker or repo. |

**Workers Paid activation is a gate, not the last step.** After Paid, domain onboard, DNS on `notify`, overlay binding, code, authorized deploy, and tests still remain.

### Rowmount reference only (not a copy)

Owner pointed at form-mailer `05c8b7bc` as DNS/send **pattern**: native `env.EMAIL.send()`, `send_email` binding, sender `no-reply@notify.rowmount.co.jp`, DNS `cf-bounce.notify` MX/SPF, `cf-bounce._domainkey.notify` DKIM, `_dmarc.notify`, apex mail preserved.

Kai Yue analog (plan only):

- Implement later **inside** `kaiyue-travel` on account `33ecc`, overlay-only — not a new form-mailer service.
- Onboard **subdomain** `notify.kaiyuemacau.com` ([subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/)): Cloudflare adds records on that subdomain, not apex Google MX.
- Expected names (not applied): `cf-bounce.notify` MX/SPF, `cf-bounce._domainkey.notify` DKIM, `_dmarc.notify`.
- From local-part is **not** named. Rowmount uses `no-reply@notify…`; treat as reference, not a Kai Yue mailbox until owner confirms.
- Official docs: Email Sending is Workers Paid; 3,000 included emails/month then $0.35/1,000. Workers Paid itself is $5/month + usage ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [Email pricing](https://developers.cloudflare.com/email-service/platform/pricing/)).

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

**Sending domain (owner 12:09):** `notify.kaiyuemacau.com`. **From local-part** not named (Rowmount reference `no-reply@notify…` only). **Staff recipient not provided** (parent asking). Do not invent either mailbox.

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

## Integration design (docs only; not implemented)

Keep persist-first in `bookings.ts` / `contacts.ts`. Later replace the Resend HTTP body in `notifications.ts` with `env.EMAIL.send()` **after** onboard:

- Skip when sending is unconfigured (today: no `RESEND_API_KEY`; later: no `EMAIL` binding / no from/to).
- `failed` if from/to missing or `send()` throws (`E_SENDER_DOMAIN_NOT_AVAILABLE`, `E_RECIPIENT_NOT_ALLOWED`, `E_RATE_LIMIT_EXCEEDED`, `E_DAILY_LIMIT_EXCEEDED`, `E_RECIPIENT_SUPPRESSED`, …). Persist errors do **not** roll back D1.
- Booking `email` channel only; WhatsApp/`admin` stay `skipped`. Contact: every create, reference-only body, no `replyTo`.
- Booking `replyTo` = guest email. Include `html` **and** `text`. Idempotency `${kind}-staff/${reference}` if the binding supports an equivalent; otherwise keep D1 idempotency as the public-submit guarantee.
- **No dual send.** Do not call Resend once Email Service is live.
- Overlay-only `send_email` on existing Worker `kaiyue-travel`. Never git root `wrangler.jsonc`. `destination_address` locked to the **named** staff inbox once provided. `allowed_sender_addresses` optional for the onboarded from.
- `wrangler types` after a real binding change. Local: default simulation. `remote: true` is a **real send** — only with a designated test inbox, never public forms.

Non-executable overlay fragment (**not** in `wrangler*.jsonc`; do not apply):

```jsonc
// FUTURE ONLY after notify.kaiyuemacau.com is onboarded on 33ecc.
// Do not add to git wrangler.jsonc or upload now.
"send_email": [
  {
    "name": "EMAIL",
    "destination_address": "<OWNER_STAFF_INBOX>"
  }
]
```

`<OWNER_STAFF_INBOX>` is unset. From mailbox unset.

## Test matrix (later; not run now)

| Case | Expect |
|---|---|
| Booking persist + email channel, sending unconfigured | 201; row stored; `notification_state=skipped`; guest still gets reference |
| Booking persist + email channel, send throws | 201; row stored; `failed`; no guest-facing mail error |
| Booking WhatsApp / admin-manual | stored; `skipped`; no `EMAIL.send` |
| Contact create, unconfigured / throw | 201; contact stored; `skipped` / `failed`; body remains reference-only |
| Idempotent replay | original 201 body; no second send |
| Dual provider | **forbidden** — one send path only |
| Local `wrangler dev` without `remote: true` | simulated (console/files); **no** real mail |
| Local `remote: true` | real mail to a **named test inbox only**; never public site |
| Apex `/admin` `/login` | still 403 after any later overlay change |
| Overlay tests | still forbid `admin-test@kaiyue.test` / staging D1 / `41386f` |

No public form submits. No recipient-verification emails. No seed/migrations.

## Checklist — remaining **before** Paid activation

This writer **cannot** do these (no billing authority; no recipient):

1. A **billing-authorized** person activates Workers Paid on **33ecc** ($5/month + Email Sending usage). Not this owner session; not this writer.
2. Owner (or parent) **names the staff recipient**.
3. Owner confirms from local-part on `notify.kaiyuemacau.com` (Rowmount `no-reply@` is reference only).

Docs/readiness **done** on this branch: inventory, scope defaults, subdomain choice, Rowmount-as-pattern, persist-first design, test matrix, Paid-is-not-last-step sequencing. No email code.

## Checklist — remaining **after** Paid activation (still not last)

Paid does **not** finish the work.

1. Onboard Email Sending for **`notify.kaiyuemacau.com`** on 33ecc (Compute → Email Service → Email Sending). **Not** apex. **Not** Email Routing. **Not** account 41386f.
2. Verify DNS added only on the notify subdomain: `cf-bounce.notify` MX/SPF, `cf-bounce._domainkey.notify` DKIM, `_dmarc.notify`. Apex Google MX/SPF/DMARC **unchanged**.
3. Separate authorized increment: overlay `send_email` + persist-first `EMAIL.send()` in existing Worker; `wrangler types`; tests in the matrix. **Skill: do not write that code until onboard is verified.**
4. Separate authorized **deploy** using the production overlay (`--keep-vars`, not git wrangler). Do not overwrite staging.
5. Local simulation, then one real send to a designated inbox. Confirm `sent`/`failed`/`skipped` in D1. Admin KPI still counts `failed`/`pending`.
6. Confirm live `/admin` `/login` 403; no customer auto-mail.

## Genuine missing choices (not inferable)

1. Billing person to activate Workers Paid on 33ecc.
2. Staff recipient address (parent asking).
3. From local-part on `notify.kaiyuemacau.com`.

Sending **domain** is owner-requested: `notify.kaiyuemacau.com`. Apex-vs-subdomain `_dmarc` clash is avoided by onboarding the subdomain, not apex.

## Out of scope now

Notification code, DNS/onboard, Email Routing, apex MX/SPF/DMARC edits, Paid purchase, credential expansion, sends, form submits, recipient verification, seed/migrations, live package rebuild, `main` merge, new Worker/repo, rebase onto PR #35 `5aa40dd`, manual Builds.

## Next action

Stop here until a billing-authorized person activates Workers Paid on 33ecc **and** a staff recipient is named. Then onboard `notify.kaiyuemacau.com` (still not this writer unless separately authorized). Do not treat Paid activation as go-live.
