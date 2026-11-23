# Email lifecycle — final written spec (design approved; not full implementation)

**Task:** `kaiyue-email-lifecycle-design-20261120`  
**Status:** Owner t327u 20 Nov 2026 14:31 Asia/Macau approved the product shell, confirm/cancel mail, and a shared serial. **Owner t335u / t336u 23 Nov 2026 12:41–12:42 Asia/Macau supersede the IN/CF/CL display model.** One persistent chauffeur booking reference, labelled exactly **Reference number** in English, format **KY + exactly five digits with no hyphen** (example `KY00042`, range `KY00001`–`KY99999`). Same number through every status. No confirmation/cancellation aliases. No displayed original-enquiry history rows. **Owner t339u 23 Nov 2026 14:13 Macau:** overflow-widens (`KY100000`) is **superseded**; cap is strict five digits with controlled exhaustion.

This file on the template branch is the living approved spec. Historical PR #62 commit `106a217` remains the t327u checkpoint; do not treat its IN-KY / CF-KY / CL-KY table as current. **Not** a release waiver, merge, deploy, D1 implementation, or send authorization.

**Implemented on PR #64 (t337u execute-live):** D1 serial `0011`, persist allocation, MCP/admin lookup of `KY#####` plus legacy `KY-xxxxxxxx`, persist-first confirm/cancel customer mail. **Still out:** merge/deploy until independent review + CI + staging `0011` apply; fixture/business writes and real email from this VM; production overlay/`0011`; PRs #51–#53; CodeMode PR #63; prod PR #61; quote widget (SKIPPED); tourist-board production publication.

---

## 1. Approved product (unchanged except numbers)

- Shared branded shell: **white `#ffffff` header**, existing PNG logo **only** (`/images/kai-yue-travel-group-logo.png`, 250×49; alt may stay “Kai Yue Travel”), **gold `#f3a600` divider**. No extra company-name text beside the logo. Do not invent a logo. Body sign-off “Kai Yue Travel” stays. Dark `#1a1a1a` text on white.
- Filled enquiry details in a **2-column email-safe TABLE** (label | value). Omit empty fields. Readable in Gmail, Outlook, and phone. Matching plaintext `Label: value` with labels padded to a column. No CSS grid/flex. **nowrap the reference value only**; long addresses and freeform wrap.
- Request-received remains **not a confirmation**.
- **Customer** confirmation email on the first authorized staff transition **to workflow `confirmed`**.
- **Customer** cancellation email on the first authorized staff transition **to workflow `cancelled`**.
- Existing **staff** new-request alert stays. **No** extra staff lifecycle blasts. **No** new admin recipients. **No** auto-confirm. **No** payment, refund, or cancellation-term invention.
- Customer copy stays on existing locale machinery (`en` / `pt` / `zh-Hant`). Staff notices stay English. Staging `[Staging test]` prefix and recipient locks stay (`scalingsmb@gmail.com` only; Daniel is not a staging dest). Production mail stays off until a later operational handoff.
- **One persistent booking reference** for one chauffeur booking: `KY00042` at enquiry, receipt, confirmation, and cancellation. English table label is exactly `Reference number`. Portuguese `Número de referência`. Traditional Chinese `參考編號`. Contact form refs stay `INQ-xxxxxxxx` until explicitly in scope. Legacy existing refs **unchanged**.

This is **not** Option A (independent counters). This is **not** the t327u IN/CF/CL alias design.

---

## 2. Number model (one durable reference)

One persisted integer serial **per D1**, used only for **new chauffeur bookings** (public form and admin-created chauffeur rows). Display formatter: `KY` immediately followed by the decimal serial padded to **exactly five** digits. Range **1..99999**. No hyphen. No stage prefix. Serial `100000` is invalid and is never allocated.

| Serial | Display |
| --- | --- |
| 1 | `KY00001` |
| 42 | `KY00042` |
| 10000 | `KY10000` |
| 99999 | `KY99999` |
| 100000 | **not issued** (`503 UNAVAILABLE`) |

- `bookings.reference` is the **immutable booking reference** for new chauffeur rows (`KY` + digits). Existing `KY-xxxxxxxx` legacy rows keep that exact value forever. Never overwrite, delete, or renumber a stored reference.
- `lifecycle_serial` (integer, unique, null on legacy) is the numeric base. Allocate **once at persist** of a new chauffeur row (`migrations/0011_chauffeur_booking_serial.sql`).
- **No** `confirmation_number` / `cancellation_number` columns. **No** IN-/CF-/CL- aliases. **No** original-enquiry history row in mail or admin chrome for the new model.
- Primary **display** is always that one reference (or the untouched legacy `KY-xxxxxxxx`). Status-specific copy and titles remain; the number does not change.
- Cap: never truncate, wrap, reuse, or widen past five digits. `padStart(5, "0")`. After `last_issued = 99999`, create is refused; the counter is not decremented.
- Counters: one chauffeur serial per D1 (`chauffeur_booking_serial.last_issued`). Staging and production independent. Start at **1**. Never reset. Do not seed from the count of legacy `KY-` rows. Do not reuse `rate_limits`. Owner t339u strict-5 supersedes overflow-widens.
- Contacts stay `INQ-xxxxxxxx`. Do not convert contact refs to `KY#####`.

---

## 3. Allocation, transitions, retries

Key off **workflow** `nextStatus` (`decision_status` / latest `audit_events` `to_value` for `approved`/`confirmed`/`denied`), **not** the stored `bookings.status` column. Today `confirmed` is stored as `enquiry`; `denied` is stored as `cancelled`.

| Event | Reference | Mail |
| --- | --- | --- |
| New chauffeur persist | Allocate serial + format `KY#####` once | Existing staff + guest ack if **email-channel** policy already permits |
| First authorized transition **to `confirmed`** | **Reuse** the same reference; do not mint a second number | Customer confirm if email-channel policy permits |
| First authorized transition **to `cancelled`** | **Reuse** the same reference; do not mint a second number | Customer cancel if email-channel policy permits |
| `enquiry → assigned` skip | None | No confirmation |
| `denied` | None | No cancellation |
| `approved` / `completed` | None | None |
| Repeat PATCH of the same terminal status | None | `INVALID_TRANSITION`; does not resend |
| `POST …/lifecycle-mail` | None | Retry unsent or `failed` only; claim requires current workflow + `updated_at`; `pending`/`sent`/`skipped` do not send |

- Persist status **first**. Mail failure does not roll back status or consume a second number. Store status-mail outcome **separately** from create-time `notification_state`. Claim `pending` only when workflow still matches the intended kind and `updated_at` is unchanged; a stale claim conflicts without sending. The same guard applies to the first confirm/cancel delivery after status PATCH. `failed` is proven failure (retry OK); `pending` is ambiguous (do not blindly resend). Do not retract in-flight `pending` after a later cancel. No new queue/cron/Durable Object. Not exactly-once without provider idempotency.
- Booking create: unique `idempotency_keys` claim (`202`) before persist; bind `reference` in the booking insert batch; finish `201`. Concurrent identical keys create one booking. A `202` with a stored reference recovers without a second persist or notify.
- Concurrency: serial increment is `UPDATE chauffeur_booking_serial SET last_issued = last_issued + 1 WHERE id = 1 AND last_issued < 99999 RETURNING last_issued`; empty result is exhaustion. Unique `reference` / `lifecycle_serial` reject duplicates. Status PATCH keeps `updated_at` CAS; the loser gets `CONFLICT` and allocates nothing.
- Terminal states do not re-enter; no reconfirm path in current `BOOKING_TRANSITIONS`.
- Legacy rows have **no serial**. They keep `KY-xxxxxxxx`. They do **not** get a `KY#####` rewrite. If later confirmed or cancelled, mail (if policy permits) quotes the existing `KY-` reference. See §8.

---

## 4. Mail and channel policy

| Mail | Trigger | Recipients | Number shown |
| --- | --- | --- | --- |
| Staff new-request (existing) | Email-channel create | `NOTIFY_STAFF_TO` (staging: scalingsmb only) | `KY#####` (or legacy `KY-`) as **Reference number** |
| Guest request-received (existing) | Email-channel create, guest email present | Guest | Same number; copy still not a confirmation |
| Guest confirmation (new) | After successful workflow `confirmed` | Guest if **existing email-channel policy** permits | Same number once; no confirmation-number field |
| Guest cancellation (new) | After successful workflow `cancelled` | Guest if existing email-channel policy permits | Same number once; no cancellation-number or original-enquiry fields |

**Email-channel policy (existing):** `communicationChannel === "email"` and a guest email and `recipientAllowed`. WhatsApp-channel bookings: **no** create mail, **no** confirm/cancel mail, **no** invented WhatsApp status sends — even if an optional email was stored. Staging allowlist unchanged. No extra staff lifecycle messages.

Copy: no fares, payment, refunds, or cancellation-policy terms. New confirm/cancel sentences use the same locale keys pattern as `ACK_COPY`; native wording review is a later gate, not a design fork.

English field label is exactly `Reference number` on all four messages. Shared shell applies to staff create, guest ack, guest confirm, guest cancel. Quote HTML would inherit the shell if it remains on the shared renderer; the quote widget stays SKIPPED. Quote is **not** in the owner preview set.

---

## 5. Lookup compatibility

Find a chauffeur row by the **one** stored `reference` (`KY#####` for new rows, or legacy `KY-xxxxxxxx`). Contacts remain `INQ-` only. Do not add alias columns.

| Path | Required |
| --- | --- |
| `getBookingByReference` / admin GET+PATCH `/api/v1/admin/bookings/:reference` / notes / assignment | Resolve `KY#####` or legacy `KY-xxxxxxxx`; canonical URL stays `reference` |
| MCP `bookingReference` | Accept new `KY` + digits **and** legacy `KY-xxxxxxxx` (`isChauffeurBookingReference`) |
| Staging quote `KY-` / `INQ-` 8-char regex | Unchanged; quote widget stays SKIPPED |
| Public 201, guest success screen, WhatsApp prepared heading | The same `reference` |
| Admin list / detail chrome | Headline is **Reference number**; no original-enquiry secondary row |

Do not log PII. Access control on admin status PATCH is unchanged. Public APIs still create only.

---

## 6. What a person would see (illustrative; not a live send)

Serial **42** after counters have already issued 41 (owner’s format example):

1. Guest submits **email-channel** request → stored reference **`KY00042`**. Success page / WhatsApp heading: that number. Staff: `[Staging test] New booking request KY00042` + 2-col filled table, first row **Reference number** `KY00042`. Guest ack: received **KY00042**, **not a confirmation**, same label.
2. Staff marks **Confirmed** → still **`KY00042`**. Guest: confirmed, **Reference number** `KY00042`, filled fields. No extra staff blast. No confirmation-number field.
3. Staff later marks **Cancelled** → still **`KY00042`**. Guest: cancelled, **Reference number** `KY00042`. No refund language. No original-enquiry history.

Legacy **`KY-JWM6M8AT`**: never becomes `KY00000…`; confirm/cancel mail would still quote `KY-JWM6M8AT`.

---

## 7. Spec self-review

- **Contradiction:** Option A is **rejected**. t327u IN/CF/CL aliases are **superseded**. One durable `KY#####` labelled **Reference number**. Green header is **rejected**; approved shell is white + logo + gold divider.
- **Safety:** persist-first; no auto-confirm; no new recipients; staging allowlist; no PII in logs; no payment/refund copy; admin auth unchanged.
- **Overflow:** expand, never wrap/truncate/reuse.
- **Concurrency:** atomic serial increment (`UPDATE … RETURNING`) then insert; unique `reference` / `lifecycle_serial`; CAS at transition; retries do not increment.
- **Transition/retry:** workflow `confirmed`/`cancelled` only; assigned skip and denied do not send lifecycle mail; mail failure keeps the same number. There is no dedicated mail-retry endpoint in this increment.
- **Lookups:** one `reference` column; no alias OR.
- **Retention:** stored `reference` never overwritten. Legacy `KY-xxxxxxxx` never rewritten.
- **Stored vs actual state:** allocation and mail key off workflow status, not the compatibility `bookings.status` column.
- **Per-D1 counters:** one chauffeur serial per database; never copy staging→production.
- **Scope of PR #64 t337u:** renderers plus allocation, lookup, and status-mail required for a truthful staging live. **Not** production, not a send from this VM, not quote, not tourist-board waiver.

---

## 8. Remaining material issue

**Legacy chauffeur rows (`KY-xxxxxxxx`) have no numeric base.** Default: never backfill `KY#####`; never renumber. Status mail (if policy permits) quotes the existing `KY-` ref. This does **not** block the new-row design. No extra owner decision is needed for that default.

Non-material / later: exact native confirm/cancel wording review; a dedicated mail-retry path after `confirm_mail_state=failed`; actual send of the synthetic MIME set if the owner asks again. Previous four + resend deliveries of the IN/CF/CL set are complete and **must not** be resent from this run. Staging live still requires independent review, CI, operator apply of `0011` to D1 `043cd0ff`, then merge of **this** PR only.

---

## 9. Checkpoint

| Item | Current |
| --- | --- |
| Writer | Sole RUNNING `bc-efa1f054-1bf7-5417-ae29-f3d6e04df58e` |
| Template branch | `cursor/email-lifecycle-templates-f58e` (PR #64) from `official-staging` `3a70cff` |
| Owner revision | t335u / t336u 12:41–12:42 Macau numbers; t337u 13:30 Macau execute-live |
| CodeMode PR #63 | Frozen `16e06ba` |
| Prod PR #61 | Frozen `f774f69` |
| Held | PRs #51–#53 untouched |
| Next | Independent review, then staging `0011` apply + reviewed merge of PR #64 only. **No send** from this VM. **No production.** |
