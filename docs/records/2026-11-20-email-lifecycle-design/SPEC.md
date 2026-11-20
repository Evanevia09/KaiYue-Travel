# Email lifecycle — final written spec (design approved; not implementation)

**Task:** `kaiyue-email-lifecycle-design-20261120`  
**Status:** Owner t327u 20 Nov 2026 14:31 Asia/Macau said **ok** to the parent-presented design. This **replaces** the earlier Option A (separate counters) recommendation. **Not** a release waiver, send approval, merge, deploy, or implementation authorization. Parent presents **this committed spec** for owner review **before** any implementation plan or code.

**Out of this increment:** implementation, migrations, merge, deploy, fixture/business writes, real email, production overlay, PRs #51–#53, quote widget (SKIPPED), writing-plans.

---

## 1. Approved product

- Shared branded shell: **white `#ffffff` header**, existing PNG logo **only** (`/images/kai-yue-travel-group-logo.png`, 250×49; alt may stay “Kai Yue Travel”), **gold `#f3a600` divider**. No extra company-name text beside the logo. Do not invent a logo. Body sign-off “Kai Yue Travel” (existing ack copy) stays. Dark `#1a1a1a` text on white.
- Filled enquiry details in a **2-column email-safe TABLE** (label | value). Omit empty fields. Readable in Gmail, Outlook, and phone. Matching plaintext `Label: value` with labels padded to a column. No CSS grid/flex.
- Request-received remains **not a confirmation**.
- **Customer** confirmation email on the first authorized staff transition **to workflow `confirmed`**.
- **Customer** cancellation email on the first authorized staff transition **to workflow `cancelled`**.
- Existing **staff** new-request alert stays. **No** extra staff lifecycle blasts. **No** new admin recipients. **No** auto-confirm. **No** payment, refund, or cancellation-term invention.
- Customer copy stays on existing locale machinery (`en` / `pt` / `zh-Hant`). Staff notices stay English. Staging `[Staging test]` prefix and recipient locks stay (`scalingsmb@gmail.com` only; Daniel is not a staging dest). Production mail stays off until a later operational handoff.
- **Same underlying numeric sequence** for one chauffeur booking: `IN-KY0042` / `CF-KY00042` / `CL-KY00042`. Original enquiry **linked forever**. Legacy existing refs **unchanged**.

This is **not** Option A (independent IN vs CF vs CL counters).

---

## 2. Number model (shared serial)

One persisted integer serial **per D1**, used only for **new chauffeur bookings** (public form and admin-created chauffeur rows). Contacts stay `INQ-xxxxxxxx`. Legacy `KY-xxxxxxxx` / `INQ-xxxxxxxx` rows are never rewritten and never receive a backfilled serial.

| Stage | Format | Min width | Example serial 42 | Example serial 1 |
| --- | --- | --- | --- | --- |
| Enquiry (create) | `IN-KY` + decimal digits | 4 | `IN-KY0042` | `IN-KY0001` |
| Confirmation alias | `CF-KY` + decimal digits | 5 | `CF-KY00042` | `CF-KY00001` |
| Cancellation alias | `CL-KY` + decimal digits | 5 | `CL-KY00042` | `CL-KY00001` |

- `bookings.reference` is the **immutable original enquiry**: `IN-KYdddd` for new rows, existing `KY-xxxxxxxx` for legacy. Never overwrite, delete, or renumber it.
- `lifecycle_serial` (integer, unique, null on legacy) is the numeric base. Allocate **once at persist** of a new chauffeur row.
- `confirmation_number` / `cancellation_number` are unique nullable **display aliases** formatted from that **same** serial. They are **not** new counters.
- Primary **display**: CL if a cancellation alias exists; else CF if a confirmation alias exists; else the enquiry `reference` (IN-KY or legacy KY-). Assigned-without-confirm therefore stays IN. Always show the original enquiry as a linked secondary value once CF or CL exists.
- Overflow: expand width, never truncate, wrap, or reuse. Serial `10000` → `IN-KY10000` / `CF-KY10000` / `CL-KY10000`. Serial `100000` → six digits on all three. `padStart` minimums; extra digits stay.
- Counters: one row kind (chauffeur serial) in a small persisted counter table, **per D1**. Staging `043cd0ff` and production `06cf879d` are independent. Start at **1**. Never reset. Do not seed from the count of legacy `KY-` rows. Do not reuse `rate_limits`.

---

## 3. Allocation, transitions, retries

Key off **workflow** `nextStatus` (`decision_status` / latest `audit_events` `to_value` for `approved`/`confirmed`/`denied`), **not** the stored `bookings.status` column. Today `confirmed` is stored as `enquiry`; `denied` is stored as `cancelled`. Treating the stored column as truth would mint the wrong alias or skip mail.

| Event | Serial / alias | Mail |
| --- | --- | --- |
| New chauffeur persist | Allocate serial + `IN-KY` once | Existing staff + guest ack if **email-channel** policy already permits |
| First authorized transition **to `confirmed`** | If `lifecycle_serial` exists, format `CF-KY` from it once in the same D1 batch as status + audit, **before** mail; skip alias if serial is null (legacy) | Customer confirm if email-channel policy permits |
| First authorized transition **to `cancelled`** | If `lifecycle_serial` exists, format `CL-KY` from it once in the same batch, before mail; skip alias if serial is null (legacy) | Customer cancel if email-channel policy permits |
| `enquiry → assigned` skip | None | No confirmation |
| `denied` | None | No cancellation |
| `approved` / `completed` | None | None |
| Repeat PATCH, mail retry, already-has-alias | None | Do not reissue numbers; may retry send only |

- Persist status + alias **first**. Mail failure does not roll back status or consume a second number. Store status-mail outcome **separately** from create-time `notification_state`. No outbox in this spec. No automatic resend UI unless later approved.
- Concurrency: serial increment is a single-row atomic `UPDATE … SET n = n + 1` in the same D1 batch as the booking insert; unique `reference` / `lifecycle_serial` reject duplicates. Status PATCH keeps `updated_at` CAS; the loser gets `CONFLICT` and allocates nothing. Two workers must not mint two CFs for one row.
- `confirmed → cancelled` keeps CF and adds CL from the **same** serial. `enquiry → cancelled` adds CL only (no CF). Terminal states do not re-enter; no reconfirm path in current `BOOKING_TRANSITIONS`.
- Legacy rows have **no serial**. They keep `KY-xxxxxxxx`. They do **not** get IN/CF/CL aliases. If later confirmed or cancelled, mail (if policy permits) quotes the existing `KY-` reference. See §8.

---

## 4. Mail and channel policy

| Mail | Trigger | Recipients | Primary number |
| --- | --- | --- | --- |
| Staff new-request (existing) | Email-channel create | `NOTIFY_STAFF_TO` (staging: scalingsmb only) | `IN-KY` (or legacy `KY-`) |
| Guest request-received (existing) | Email-channel create, guest email present | Guest | `IN-KY`; copy still not a confirmation |
| Guest confirmation (new) | After successful workflow `confirmed` | Guest if **existing email-channel policy** permits | `CF-KY`; original enquiry secondary |
| Guest cancellation (new) | After successful workflow `cancelled` | Guest if existing email-channel policy permits | `CL-KY`; original enquiry (and CF if any) as history |

**Email-channel policy (existing):** `communicationChannel === "email"` and a guest email and `recipientAllowed`. WhatsApp-channel bookings: **no** create mail, **no** confirm/cancel mail, **no** invented WhatsApp status sends — even if an optional email was stored. Staging allowlist unchanged. No extra staff lifecycle messages.

Copy: no fares, payment, refunds, or cancellation-policy terms. New confirm/cancel sentences use the same locale keys pattern as `ACK_COPY`; native wording review is a later gate, not a design fork.

Shared shell applies to staff create, guest ack, guest confirm, guest cancel. Quote HTML would inherit the shell if it remains on the shared renderer; the quote widget stays SKIPPED.

---

## 5. Lookup compatibility (all current paths)

Find a chauffeur row by **any** of: immutable `reference` (IN-KY or legacy KY-), `confirmation_number`, `cancellation_number`. Contacts remain `INQ-` only.

| Path today | Required after |
| --- | --- |
| `getBookingByReference` / admin GET+PATCH `/api/v1/admin/bookings/:reference` / notes / assignment | Resolve IN, CF, CL, or legacy KY-; **canonical URL stays the enquiry `reference`** so links do not move when CF is issued |
| MCP `bookingReference` `/^KY-[A-Z2-9]{8}$/` (`change_booking_status`, edit, assign, …) | Accept IN-KY digits, CF-KY digits, CL-KY digits, and legacy KY- |
| Staging quote `KY-` / `INQ-` 8-char regex | Compat: accept chauffeur IN/CF/CL aliases **if/when** quote is used; quote 10/10 stays SKIPPED |
| Public 201, guest success screen, WhatsApp prepared heading | Enquiry `reference` only (`IN-KY` for new rows) |
| Admin list / detail chrome | Headline follows primary display; original enquiry always visible |
| `WHERE reference = ?` only | Insufficient; OR across alias columns (unique indexes) |

Generated links always use the enquiry `reference`. An incoming CF/CL identifier still loads that row (200); a redirect is not required.

Do not log PII. Access control on admin status PATCH is unchanged (authenticated admin / MCP approval). Public APIs still create only.

---

## 6. What a person would see (illustrative; not a live send)

Serial **42** after counters have already issued 41 (owner’s format example):

1. Guest submits **email-channel** request → stored enquiry **`IN-KY0042`**. Success page / WhatsApp heading: that enquiry. Staff: `[Staging test] New booking request IN-KY0042` + 2-col filled table. Guest ack: received **IN-KY0042**, **not a confirmation**, + 2-col filled table.
2. Staff marks **Confirmed** (admin or MCP, allowed transition) → alias **`CF-KY00042`**. Enquiry `IN-KY0042` unchanged. Guest: confirmed, confirmation number **CF-KY00042**, original enquiry **IN-KY0042**, filled fields. No extra staff blast.
3. Staff later marks **Cancelled** → alias **`CL-KY00042`**. Guest: cancelled, cancellation number **CL-KY00042**, plus CF and original IN as history. No refund language.

Cancel from enquiry without confirming: **`IN-KY0043`** then **`CL-KY00043`**, no CF.  
Legacy **`KY-JWM6M8AT`**: never becomes IN-KY; confirm/cancel mail would still quote `KY-JWM6M8AT`.

---

## 7. Spec self-review (this commit)

- **Contradiction:** Option A is **rejected**. CF/CL are formats of the create-time serial, not new sequences. Green header is **rejected**; approved shell is white + logo + gold divider only (no extra green accent required). Primary display follows which aliases exist, so `enquiry → assigned` without CF still shows IN.
- **Safety:** persist-first; no auto-confirm; no new recipients; staging allowlist; no PII in logs; no payment/refund copy; admin auth unchanged.
- **Overflow:** expand, never wrap/truncate/reuse.
- **Concurrency:** atomic serial increment + unique constraints at create; CAS + one-shot alias at transition; retries do not increment.
- **Transition/retry:** workflow `confirmed`/`cancelled` only; assigned skip and denied do not allocate; mail failure keeps the alias.
- **Lookups:** every current chauffeur path listed in §5; canonical path stays original enquiry.
- **Retention:** original `reference` never overwritten.
- **Stored vs actual state:** allocation and mail key off workflow status, not the compatibility `bookings.status` column.
- **Per-D1 counters:** one chauffeur serial per database; never copy staging→production.
- **Placeholders:** none. Native confirm/cancel wording is a later review gate, not TBD in the model.
- **Scope:** one implementation plan later (templates + serial/aliases + status-mail + lookup regexes). Not this run.

---

## 8. Remaining material issue

**Legacy chauffeur rows (`KY-xxxxxxxx`) have no numeric base.** Default in this spec: never backfill IN/CF/CL; status mail (if policy permits) quotes the existing `KY-` ref. If the owner instead wants a CF/CL minted onto historical rows, that needs a separate decision (it cannot use “the same serial” because none exists). This does **not** block the new-row design.

Non-material / later: exact EN/PT/zh-Hant confirm/cancel sentences; native HTML previews before any new actual email; tests listed previously (mock, concurrency, idempotency, locales, privacy, allowlist, failure isolation, access control, independent review, staging browser/console/security). New code would make PR #61’s earlier review incomplete for this feature.

---

## 9. Checkpoint (this spec commit)

| Item | Verified before writing |
| --- | --- |
| Writer | Sole RUNNING `bc-efa1f054-1bf7-5417-ae29-f3d6e04df58e` |
| Branch | `cursor/email-lifecycle-design-f58e` (PR #62) from `official-staging` `3a70cff` |
| Prior proposal | `40a894813e4ddea5c4eb9ad5f541a61454ea75d8` |
| PR #61 | Frozen `f774f69a5316a08af00e231f87588abdde0580ff` — no reset/rebase/force/autostash |
| Held | PRs #51–#53 untouched |
| Next | Parent presents this spec for owner review. **No implementation plan until that review.** |
