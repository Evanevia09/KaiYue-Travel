# Email lifecycle and enquiry numbers — PROPOSED design (not approved)

**Status:** research/design only. Not owner-approved. No implementation, migration, merge, deploy, or actual email in this increment. Brainstorming hard gate: parent presents this to the owner; code starts only after explicit approval.

**Task:** `kaiyue-email-lifecycle-design-20261120`  
**Owner scope:** t325u 20 Nov 14:16 Macau. Not a release waiver. Not new send approval. Quote-widget 10/10 remains SKIPPED by this new scope, not yes. Production hold continues. Held PRs #51–#53 untouched. PR #61 production-mail review is **not** complete for this new work.

---

## 1. Fresh context (this run)

| Item | Verified now |
| --- | --- |
| Writer | Sole RUNNING `bc-efa1f054-1bf7-5417-ae29-f3d6e04df58e` |
| Checkout at research | `cursor/prod-mail-candidate-f58e` `f774f69a5316a08af00e231f87588abdde0580ff`, clean, tracking origin |
| PR #61 | Open, base `official-staging` `3a70cff`, source `22ee115` + docs `f774f69`, mergeable_state `blocked`, **HOLD** merge/`main`/production upload |
| `official-staging` | `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2` (PR #59 squash). This design branch is cut from that head so PR #61 stays frozen |
| Checkpoint | No reset / rebase / force / autostash of PR #61 |
| Live staging | Worker `kaiyue-travel-staging` `3b9240e7` @100% / `4ffbb3e7`. `NOTIFICATIONS_ENABLED="true"`. CF dest / staff / allowlist **only** `scalingsmb@gmail.com`. Sender `bookings@notify.kaiyuemacau.com`. D1 `043cd0ff`. Daniel **cannot** be a staging test dest |
| Live production | `kaiyue-travel` `5eebf7b6` @100%. `NOTIFICATIONS_ENABLED="false"`. No `EMAIL` |
| Staging pair PASS | PM/executor 14:08 Macau, **one** POST, ref `KY-JWM6M8AT`, `notification_state=sent`, both inbox To scalingsmb only. This writer did not POST/send. That approval covers **only** that completed request-received pair — **not** new templates, status mail, or new test forms |
| Quote 10/10 | Never called (`KY-PYPM8Y3E`). SKIPPED/CLOSED by this new scope, not waived |

---

## 2. What the current source actually does

- **Public chauffeur refs:** `KY-` + 8 Crockford-like chars (`createBookingReference`). Unique `bookings.reference`. No sequential counter table. `persistBooking` does not retry on unique collision. Contacts stay `INQ-` + 8 chars.
- **Guest/staff create mail:** persist first, then `sendNotifications` **only on create**, and **only** when `communicationChannel === "email"`. WhatsApp-channel bookings skip mail. Result overwrites `notification_state`. No outbox. No retry. No status-change mail (`docs/04`: “not sent in Release 1”).
- **Shell:** green `#008c5e` header, existing PNG logo **plus** white text “Kai Yue Travel”, gold `#f3a600` 4px bar. Staff HTML already uses a 2-col `th`/`td` table of filled fields. Guest ack is sparse (reference, service, pickup) and still says **not confirmed**.
- **Status mutations:** admin `PATCH /api/v1/admin/bookings/:reference/status` and MCP `change_booking_status` both call `updateBookingStatus`. CAS on `updated_at`. Audit `status_change`. **No email.** Workflow: `enquiry → approved → confirmed` (also `enquiry → assigned` skip, `enquiry → cancelled`). `confirmed` is **stored** as `bookings.status = 'enquiry'`; the real state is the latest `audit_events` `to_value` (`decision_status`). Denied stores as `cancelled`.
- **Lookups:** `getBookingByReference` is `WHERE reference = ?` only. MCP booking refs `/^KY-[A-Z2-9]{8}$/`. Staging quote `/^(KY|INQ)-[A-Z2-9]{8}$/`. Admin URLs and WhatsApp prepared text use `row.reference`. Guest success screen shows that same `reference`.
- **Indexes:** unique `reference`; pickup/status/created. Schema contract on disk `0001`–`0010`. `rate_limits` is throttles, not document numbers.
- **Product:** human confirmation required; automatic confirmation is out of scope. Request-received is not a confirmation.

---

## 3. Requirements interpretation (for owner/parent)

- Shared branded shell: **logo only** in the header. No extra company-name text beside it. Logo alt can remain “Kai Yue Travel” for accessibility. Body sign-off “Kai Yue Travel” (existing ack copy) stays.
- Header: **white `#ffffff`**, existing gold `#f3a600` 4px bar, existing green `#008c5e` as a 4px left accent on the 600px card. Dark `#1a1a1a` text on white. Do not invent a logo asset. Do not keep today’s green header with white wordmark.
- Two-column **email-safe TABLE**: one label column + one value column; filled enquiry fields only; readable in Gmail, Outlook, and phone. Matching plaintext `Label: value` (labels padded to a column). No CSS grid/flex.
- Request-received mail stays **not confirmed**. New **customer** mail on an authorized transition **to `confirmed`**. New **customer** mail on an authorized transition **to `cancelled`**. Existing **staff** alert on new requests stays. No new admin recipients. No auto-confirm. No payment/refund/cancellation-term invention.
- Locales: customer confirm/cancel copy follows existing `en` / `pt` / `zh-Hant` ack pattern. Staff notices stay English, as today.
- Numbers (zeros = zero-padded digits, minimum width, expand on overflow, never wrap/truncate/reuse):
  - Enquiry **IN-KY** + ≥4 digits (`IN-KY0001`)
  - Confirmation **CF-KY** + ≥5 digits (`CF-KY00001`)
  - Cancel **CL-KY** + ≥5 digits (`CL-KY00001`)
- Do not renumber live existing records (`KY-JWM6M8AT` and other `KY-` / `INQ-` rows). Do not reset counters. Do not expose duplicates on retries or concurrency.

---

## 4. Two real approaches

### Option A — Separate collision-safe counters; stable enquiry kept (recommended)

New chauffeur creates allocate **IN-KY####** as `bookings.reference` (replaces `KY-xxxxxxxx` **for new rows only**). First successful authorized transition **to `confirmed`** allocates **CF-KY#####** once into a new unique nullable `confirmation_number`. First successful authorized transition **to `cancelled`** allocates **CL-KY#####** once into `cancellation_number`. Original enquiry is never overwritten or deleted. Primary **display** is IN until confirm succeeds, then CF; after cancel, CL. Admin/API/WhatsApp/email/MCP lookups accept any of the three (plus legacy `KY-` / `INQ-`). Admin URL path keeps the immutable enquiry reference.

**Tradeoffs:** three number spaces (IN 4 vs CF/CL 5 matches the owner’s different widths). Cancel of a never-confirmed enquiry still gets a CL without implying a confirmation. Mail retry cannot mint a second CF. Extra columns + a small counter table + lookup/compat work. Guest who later quotes “the number” may use IN or CF; staff search must accept both.

### Option B — One serial; prefix (and pad) changes

One counter. Enquiry `IN-KY0042` “becomes” `CF-KY00042` then `CL-KY00042`. Closer to “the number become confirmation number.”

**Tradeoffs:** one number to remember. Different min widths are only padding. Overwriting or aliasing the public key breaks WhatsApp texts, inbox threads, admin URLs, and MCP `/^KY-…$/` unless aliases are still stored — at which point it is Option A with coupled serials. Cancel-from-enquiry would mint a CL that looks like a cancelled confirmation. Legacy `KY-JWM6M8AT` has no serial, so prefix-swap cannot apply without backfill (forbidden). Reconfirm/retry must still not reuse; coupling does not remove that.

---

## 5. Recommendation

**Option A.** Different min widths, “keep the original enquiry,” no live renumber, and collision-safe retries all fit separate counters with a stable enquiry key. Option B’s wording is attractive and is listed below as a **material owner decision** in case they truly want the same digits.

Shared shell + 2-col table applies to staff create, guest request-received, guest confirm, and guest cancel. Quote HTML would inherit the shell if it stays on the shared renderer; the skipped quote widget is not in this scope.

---

## 6. Proposed behaviour (still not approved)

### Numbers and allocation (exact-once)

| Event | Allocates | Primary display | History kept |
| --- | --- | --- | --- |
| New chauffeur booking persist | IN-KY once (new rows). Legacy `KY-xxxxxxxx` unchanged | IN-KY (or legacy KY-) | — |
| Authorized transition **to `confirmed`** | CF-KY once, same D1 batch as status + audit, **before** mail | CF-KY | Enquiry remains |
| Authorized transition **to `cancelled`** | CL-KY once, same batch, before mail | CL-KY | Enquiry + CF if any |
| `denied`, `approved`, `assigned`, `completed` | none | unchanged | — |
| Repeat PATCH / mail retry / already-has-CF | none | existing | never reissue or delete |

- Counters: persisted per D1 (staging `043cd0ff` and production `06cf879d` independent). Start at **1** in each new namespace. Never reset. Do not seed from the count of legacy `KY-` rows.
- Overflow: after `IN-KY9999` emit `IN-KY10000` (wider). After `CF-KY99999` / `CL-KY99999` emit six digits. Never wrap to zero, never truncate.
- `enquiry → assigned` skip does **not** mint CF and does **not** send confirmation mail (status is not `confirmed`).
- `denied` does **not** mint CL and does **not** send cancellation mail.
- Contacts stay `INQ-xxxxxxxx` unless the owner says otherwise.

### Mail

| Mail | When | Who | Primary number shown |
| --- | --- | --- | --- |
| Staff new-request (existing) | Email-channel create | `NOTIFY_STAFF_TO` (staging: scalingsmb only) | IN-KY (or legacy KY-) |
| Guest request-received (existing) | Email-channel create, guest email present | Guest | IN-KY; copy still **not a confirmation** |
| Guest confirmation (**new**) | After **successful** transition to `confirmed` | Guest if email present | CF-KY; enquiry listed as a secondary row |
| Guest cancellation (**new**) | After **successful** transition to `cancelled` | Guest if email present | CL-KY; enquiry (and CF if any) as history rows |

- WhatsApp-channel: still no create mail; confirm/cancel mail **skipped** if there is no guest email. No invented WhatsApp auto-message.
- Persist status + number first. Mail failure does not roll back status or consume a second number. Store status-mail outcome **separately** from create-time `notification_state`. No outbox in this increment. No automatic resend UI unless later approved.
- Staging allowlist unchanged. Daniel is not a staging dest. Production stays off until a later operational handoff.
- Copy: no fares, payment, refunds, or cancellation-policy terms. Native EN/PT/zh-Hant review of the new sentences is a later gate, not this design increment.

### Compat (lookups / UI / WhatsApp / API)

- Search/get by IN, CF, CL, legacy `KY-`, and `INQ-`.
- Admin routes keep enquiry `reference` in the path so links do not move when CF is issued.
- Guest 201 / success screen / WhatsApp prepared heading use the enquiry number (IN-KY for new rows). After confirm, admin chrome shows CF as the headline and IN as “original enquiry.”
- MCP `bookingReference` and quote-reference regexes must be extended **if/when** those tools touch new rows. Quote 10/10 stays skipped; that regex is compat debt, not this increment’s send path.
- Do not treat stored `bookings.status = 'enquiry'` as “not confirmed”; allocation keys off the **workflow** `nextStatus` (`decision_status` / audit), because confirmed is stored as `enquiry` today.

### Header / table (email-safe)

- Header cell white; logo PNG only (`/images/kai-yue-travel-group-logo.png`, 250×49); gold bar; green left accent.
- Details table: label ~38% / value ~62%, 8px/12px padding, 1px `#ececef` row rules, left-aligned, wrap long values. Omit empty fields.
- Plaintext: padded labels so values line up.

---

## 7. Example values and what a person would see

Illustrative **first** new staging booking after counters start at 1 (not a live send):

1. **Guest submits email-channel request** → stored `IN-KY0001`.
   - Success page / 201: `Reference IN-KY0001` (request received, not confirmed).
   - Staff: `[Staging test] New booking request IN-KY0001` + 2-col filled table.
   - Guest ack: “We received your request IN-KY0001” + 2-col filled table + **this is not a confirmation**.
2. **Staff marks Confirmed** (admin or MCP, allowed transition) → `confirmation_number = CF-KY00001`. Enquiry `IN-KY0001` unchanged.
   - Guest: “Your booking is confirmed. Confirmation number CF-KY00001” + table (confirmation number, original enquiry `IN-KY0001`, filled trip fields).
   - Staff: no extra admin blast.
3. **Staff later marks Cancelled** → `cancellation_number = CL-KY00001`.
   - Guest: “This request has been cancelled. Cancellation number CL-KY00001” + table (CL, CF if it existed, original IN, filled fields). No refund/policy language.

Cancel from enquiry without confirming: `IN-KY0002` then `CL-KY00002`, no CF row.  
Legacy `KY-JWM6M8AT`: keeps that enquiry id forever; it is **not** rewritten to IN-KY. If it were later confirmed (not this run), it would receive a CF without losing `KY-JWM6M8AT`.

---

## 8. Material owner decisions (cannot infer)

Not asking header white vs pale, table padding, or other implementation taste.

1. **Option A (separate counters, recommend) vs Option B (same serial, prefix/pad changes).** Owner’s “the number become confirmation number” can be read as B; widths and “keep original enquiry” fit A.
2. **New chauffeur public refs become IN-KY for new rows only; contact forms stay INQ-.** Confirm both halves.
3. **CF + confirmation mail only when status is actually `confirmed`.** Today staff can skip `enquiry → assigned` and never pass `confirmed`. Recommend: skip does not confirm.
4. **CL + cancellation mail for `cancelled` only, including never-confirmed. `denied` gets neither.**
5. **WhatsApp-channel confirm/cancel: skip mail when no email; do not invent WhatsApp status messages.**
6. **Counters start at 1 per database, no backfill of IN-KY onto existing `KY-` / `INQ-` rows.**

Until those six are answered, this is not approved and must not be coded.

---

## 9. Later verification (after a future approved implementation — not now)

Mocks + concurrency + transition idempotency; HTML and plaintext; three locales; privacy (no PII in logs); staging allowlist; status-notification failure does not roll back numbers; access control on status PATCH; independent review; staging browser/console/security; **native previews of the new templates before any new actual email**. Staging dest remains scalingsmb only. Production all hold. New code makes PR #61’s earlier review incomplete for this feature.

---

## 10. Explicitly not this increment

Implementation, migrations, merge, deploy, fixture writes, live email, production overlay, PRs #51–#53, quote widget, auto-confirm, payment/refund copy, new admin recipients, live renumber, counter reset, writing-plans / spec implementation plan.
