# Email lifecycle templates (render/preview) Implementation Plan

> **For agentic workers:** Use executing-plans in this same writer. Owner t333u selected execute; t335u/t336u is an in-place refinement on PR #64. Do **not** open a new branch. **No** six-question/design approval loop. **No** subagent-driven-development unless the owner later asks.

**Goal:** Shared production-intended email shell + staff enquiry / guest receipt / guest confirm / guest cancel renderers, with tests and four English synthetic MIME artifacts. Owner t335u/t336u: **one** `KY#####` labelled exactly **Reference number** through all statuses.

**Architecture:** Change `notification-templates.ts` (shared HTML/text shell and copy) plus call-site details threading in `notifications.ts`. Display-format `formatBookingReference` is a pure function. Do **not** add D1 counters, migrations, status-mail triggers, or lookup regex changes. A preview builder writes HTML/text/JSON from the same renderers.

**Tech Stack:** TypeScript, Vitest, existing Cloudflare Email `OutboundEmail` shape, official-staging URLs.

## Global Constraints

- Living spec: `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` on this branch. t327u shared-serial IN/CF/CL **superseded** by t335u/t336u (23 Nov 2026 12:41–12:42 Macau). t328u send-to-owner; t333u 23 Nov 2026 12:18 Macau: send revised tests (previous four + resend complete; **no further send this run**).
- White `#ffffff` header; logo only (`/images/kai-yue-travel-group-logo.png`, 250×49); gold `#f3a600` divider; dark `#1a1a1a` body. No company-name text beside the logo. Footer brand allowed.
- Email-safe 2-column TABLE (label | value); omit empty fields; plaintext labels padded to a column. No CSS grid/flex. Overflow widens, never wraps.
- Guest receipt is **not** a confirmation. Confirm and cancel copy are distinct. No payment/refund/cancellation-policy invention.
- Staff notices English; customer copy `en` / `pt` / `zh-Hant`. Staging subject prefix `[Staging test] `.
- Display example serial 42: **`KY00042`** (KY + five digits, no hyphen) on every message. English label exactly `Reference number`. No confirmation/cancellation aliases. No original-enquiry history rows. No DB allocation in this slice. Legacy `KY-xxxxxxxx` never rewritten. Contacts stay `INQ-`.
- Four English preview messages only To `scalingsmb@gmail.com`; From `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`. Official staging links. Visible synthetic/preview marking. No quote. No KY-PYPM8Y3E. No send from this VM.
- Preserve CodeMode63@`16e06ba`, prod61@`f774f69`, held #51–#53. Stay on `cursor/email-lifecycle-templates-f58e`. No reset/rebase/force/autostash. No merge/deploy.

---

### Task 1: One booking-reference display formatter

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts`
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Produces: `formatBookingReference(serial: number): string` → `KY` + `padStart(5, "0")`
- Removes: `formatLifecycleNumber`, `LifecycleNumberKind`

- [x] **Step 1:** Tests for serial 1 / 42 / 10000 / 100000 and invalid serial.
- [x] **Step 2:** Implement no-hyphen `KY#####`; extra digits stay.
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

## Self-review

| Spec item | Task |
| --- | --- |
| White / logo only / gold | 2 |
| 2-col filled table + padded plaintext | 2–3 |
| Receipt ≠ confirmation | 3 |
| Customer confirm + cancel copy | 4 (render only) |
| Staff new enquiry redesigned | 3 |
| One KY##### Reference number | 1 + 4 + 5 |
| Locales | 3–4 |
| No DB/status/lookups | Global constraint |
| Four English MIME + manifest | 5 |
| Remaining: D1 serial, status-mail, lookup regex, native wording review | REPORT, not this plan. Future plan is **one durable reference**, not three aliases. |
