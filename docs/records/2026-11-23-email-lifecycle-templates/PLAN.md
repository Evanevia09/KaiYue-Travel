# Email lifecycle templates (render/preview) Implementation Plan

> **For agentic workers:** Use executing-plans in this same writer. Owner t333u selected execute; t335u/t336u is an in-place refinement on PR #64; t337u 13:30 Macau is execute-live of allocation/lookup/status-mail on the **same** branch. Do **not** open a new branch. **No** six-question/design approval loop. **No** subagent-driven-development unless the owner later asks.

**Goal:** Shared production-intended email shell + staff enquiry / guest receipt / guest confirm / guest cancel renderers, one durable `KY#####` labelled exactly **Reference number**, persist allocation, consistent lookup, and persist-first confirm/cancel mail required for a truthful staging live.

**Architecture:** Shared renderers in `notification-templates.ts`. `formatBookingReference` in `@kaiyue/contracts`. Per-D1 serial in `migrations/0011_chauffeur_booking_serial.sql`. Allocate at chauffeur persist. MCP `isChauffeurBookingReference`. Status PATCH to workflow `confirmed`/`cancelled` sends guest mail after persist.

**Tech Stack:** TypeScript, Vitest, existing Cloudflare Email `OutboundEmail` shape, official-staging URLs.

## Global Constraints

- Living spec: `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` on this branch. t327u shared-serial IN/CF/CL **superseded** by t335u/t336u (23 Nov 2026 12:41–12:42 Macau). t328u send-to-owner; t333u 23 Nov 2026 12:18 Macau: send revised tests (previous four + resend complete; **no further send this run**).
- White `#ffffff` header; logo only (`/images/kai-yue-travel-group-logo.png`, 250×49); gold `#f3a600` divider; dark `#1a1a1a` body. No company-name text beside the logo. Footer brand allowed.
- Email-safe 2-column TABLE (label | value); omit empty fields; plaintext labels padded to a column. No CSS grid/flex. Nowrap the reference only; long addresses wrap. Cap is strict `KY` + five digits (`1..99999`); overflow-widens is superseded.
- Guest receipt is **not** a confirmation. Confirm and cancel copy are distinct. No payment/refund/cancellation-policy invention.
- Staff notices English; customer copy `en` / `pt` / `zh-Hant`. Staging subject prefix `[Staging test] `.
- Display example serial 42: **`KY00042`** (KY + five digits, no hyphen) on every message. English label exactly `Reference number`. No confirmation/cancellation aliases. No original-enquiry history rows. Legacy `KY-xxxxxxxx` never rewritten. Contacts stay `INQ-`. Strict five-digit cap; never wrap, reuse, or widen.
- Four English preview messages only To `scalingsmb@gmail.com`; From `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`. Official staging links. Visible synthetic/preview marking. No quote. No KY-PYPM8Y3E. No send from this VM.
- Preserve CodeMode63@`16e06ba`, prod61@`f774f69`, held #51–#53. Stay on `cursor/email-lifecycle-templates-f58e`. No reset/rebase/force/autostash. Staging merge only after independent review + CI + `0011` applied to D1 `043cd0ff`. No production.

---

### Task 1: One booking-reference display formatter

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts`
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Produces: `formatBookingReference(serial: number): string` → `KY` + `padStart(5, "0")`
- Removes: `formatLifecycleNumber`, `LifecycleNumberKind`

- [x] **Step 1:** Tests for serial 1 / 42 / 10000 / 99999 and invalid 0 / 100000.
- [x] **Step 2:** Implement no-hyphen `KY#####`; extra digits are refused (t339u supersedes widen).
- [x] **Step 3:** Commit with renderer in the same change set.

### Task 2: Shared white/logo/gold shell + padded 2-col table

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts` (`brandedEmailHtml`, `rowsHtml`, `rowsText`)
- Test: `apps/web/src/lib/server/notification-templates.test.ts`
- Test: `tests/integration/notifications-staging.test.ts` (drop `#008c5e` header assertion)

**Interfaces:**
- Consumes: existing `EmailBrand.logoUrl`
- Produces: `EmailBrand.siteUrl?: string` footer link; table omits empty rows; plaintext `${label.padEnd(width)}: ${value}`

- [x] **Step 1:** Tests: header background `#ffffff`; no bold header company-name sibling; gold bar; logo 250×49; alt may be Kai Yue Travel; footer may contain brand; escaped `<>`; empty labels omitted; no `#008c5e` in staff/ack/quote HTML.
- [x] **Step 2:** Replace green header + adjacent name with white + logo + gold divider. Footer: Kai Yue Travel and optional staging origin.

### Task 3: Staff enquiry + guest receipt tables

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts` (`renderStaffMessage`, `renderCustomerAck`)
- Modify: `apps/web/src/lib/server/notifications.ts` (pass `details` + `siteUrl` into ack)
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Consumes: `StaffMessageInput.details`; `CustomerAckInput` gains `details?: DetailRow[]`, `syntheticPreview?: boolean`
- Produces: receipt still contains not-confirmation copy; 2-col filled details; EN/pt/zh-Hant ack paths; English first-row label `Reference number`

- [x] **Step 1:** Tests for not-confirmation, locale langs, filled vs omitted rows, synthetic banner only when flagged.
- [x] **Step 2:** Thread booking details into the guest receipt table without duplicating labels.

### Task 4: Guest confirmation + cancellation renderers

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts`
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Produces: `renderCustomerConfirmed(site, input, brand)`, `renderCustomerCancelled(site, input, brand)`
- Input: `{ locale, name, reference, details?, timezone, siteUrl, syntheticPreview? }`
- **Not** wired to `updateBookingStatus` in this slice.
- Removes: `enquiryReference` / `confirmationNumber` / `cancellationNumber`; Confirmation number / Cancellation number / Original enquiry fields.

- [x] **Step 1:** Tests: one `KY00042`; confirm copy has no “not a confirmation”; cancel has no refund/payment; pt and zh-Hant render; empty fields omitted; no IN/CF/CL.
- [x] **Step 2:** Add `CONFIRM_COPY` / `CANCEL_COPY` parallel to `ACK_COPY`. Do not invent policy terms.

### Task 5: Four English synthetic MIME artifacts + manifest

**Files:**
- Modify: `apps/web/src/lib/server/lifecycle-email-preview.ts`
- Create/regenerate: `docs/records/2026-11-23-email-lifecycle-templates/preview-mime/{staff,receipt,confirmed,cancelled}.{html,txt}`
- Create/regenerate: `docs/records/2026-11-23-email-lifecycle-templates/preview-mime/manifest.json`
- Test: `apps/web/src/lib/server/lifecycle-email-preview.test.ts`

**Interfaces:**
- Produces: `buildLifecyclePreviewSet(): PreviewManifest` with `from`, `to`, `replyTo`, `subject`, `text`, `html` per message and a single `reference: "KY00042"`.

- [x] **Step 1:** Fixture serial 42, airport transfer, Macau International Airport → Synthetic Hotel Cotai, 15 Dec 2026 10:30 Asia/Macau, 2 passengers. Banner: synthetic / not a stored booking. Links `https://staging.kaiyuemacau.com` (staff also `https://admin-staging.kaiyuemacau.com`). To only `scalingsmb@gmail.com`. No quote. No KY-PYPM8Y3E.
- [x] **Step 2:** Write artifacts from the builder (honest render). Screenshot desktop ~600px and mobile ~390px.
- [x] **Step 3:** Record + PROJECT-STATE + docs/README. Push PR #64. Do not send.

### Task 6: Durable chauffeur serial at persist

**Files:**
- Create: `migrations/0011_chauffeur_booking_serial.sql`
- Modify: `apps/web/src/lib/server/bookings.ts`, `packages/contracts/src/ids.ts`
- Modify: `deploy/official-staging/schema-contract.json`, `deploy/official-staging/constants.json`
- Test: `packages/contracts/src/ids.test.ts`, `tests/integration/bookings.test.ts`, `tests/integration/booking-lifecycle-reference.test.ts`

- [x] **Step 1:** Atomic `UPDATE … RETURNING last_issued`; store `KY#####` + `lifecycle_serial`; unique partial index; start at 0 so first issue is 1.
- [x] **Step 2:** Strict cap 99999; further creates `503` with no booking row. Failed insert after increment may gap; never reuse. Do not seed from legacy `KY-` rows. Owner t339u superseded overflow-widens.
- [x] **Step 3:** Attest `0011` on disk contract. CD does not apply it. Operator apply to staging D1 is a later reviewed step.

### Task 7: Consistent lookup of serial + legacy refs

**Files:**
- Modify: `packages/agent-tools/server.mjs`, admin GET/PATCH already keyed on `bookings.reference`
- Test: `tests/integration/booking-lifecycle-reference.test.ts`

- [x] **Step 1:** `isChauffeurBookingReference` accepts `KY#####` and `KY-xxxxxxxx`, rejects `KY0001` and `INQ-`.
- [x] **Step 2:** Quote widget stays SKIPPED; Worker quote regex is not expanded.

### Task 8: Persist-first confirm/cancel customer mail

**Files:**
- Modify: `apps/web/src/lib/server/notifications.ts`, `apps/web/src/lib/server/admin.ts`
- Test: `tests/integration/booking-lifecycle-reference.test.ts`

- [x] **Step 1:** After successful workflow `confirmed`/`cancelled`, send guest mail if email-channel policy permits. No extra staff blast. WhatsApp/admin skip. Denied skip.
- [x] **Step 2:** Store `confirm_mail_state` / `cancel_mail_state` separately from create-time `notification_state`. Mail failure does not roll back status. Guarded retry is Task 9.

### Task 9: t339u scoped reliability (strict 5, idempotency claim, mail recovery, wrap)

**Files:**
- Modify: `packages/contracts/src/ids.ts`, `apps/web/src/lib/server/{bookings,idempotency,admin,router,notification-templates}.ts`, admin UI/i18n, CSS, OpenAPI, docs
- Test: `ids.test.ts`, `notification-templates.test.ts`, `booking-lifecycle-reference.test.ts`, `bookings.test.ts`

- [x] **Step 1:** Strict `KY` + five digits `1..99999`; atomic `WHERE last_issued < 99999`; exhaustion `503`; no wrap/reuse. Owner already decided; overflow-widens recorded as superseded.
- [x] **Step 2:** Unique `202` claim before persist; bind reference with the booking insert; finish `201`; abandon empty `202` on persist failure; concurrent identical keys one booking.
- [x] **Step 3:** Claim `pending` before confirm/cancel send; `POST …/lifecycle-mail` retries `null`/`failed` only; PATCH cannot replay a terminal status; no new queue/cron.
- [x] **Step 4:** Nowrap reference only; wrap long addresses; semantic locale pickup-time dedup in PT/zh-Hant.

## Self-review

| Spec item | Task |
| --- | --- |
| White / logo only / gold | 2 |
| 2-col filled table + padded plaintext | 2–3 |
| Receipt ≠ confirmation | 3 |
| Customer confirm + cancel copy | 4 + 8 |
| Staff new enquiry redesigned | 3 |
| Locales | 3–4 |
| One KY##### Reference number | 1 + 4 + 5 + 6 |
| D1 serial + unique reference | 6 |
| Lookup serial + legacy | 7 |
| Confirm/cancel status mail | 8 |
| Strict 5 + exhaustion | 9 |
| Booking-create idempotency claim | 9 |
| Guarded lifecycle-mail retry | 9 |
| Four English MIME + manifest | 5 |
| Remaining: native wording review; independent re-review of this SHA then staging merge; production tourist-board gate | REPORT. |
