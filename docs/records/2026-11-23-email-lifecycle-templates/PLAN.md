# Email lifecycle templates (render/preview) Implementation Plan

> **For agentic workers:** Use executing-plans in this same writer. Owner t333u selected execute; do not offer an execution-choice prompt. **No** subagent-driven-development unless the owner later asks.

**Goal:** Ship production-intended email shell + staff enquiry / guest receipt / guest confirm / guest cancel renderers, with tests and four English synthetic MIME artifacts for parent-sanctioned send to `scalingsmb@gmail.com`.

**Architecture:** Change only `notification-templates.ts` (shared HTML/text shell and copy) plus call-site details threading in `notifications.ts`. Display-format IN/CF/CL helpers are pure functions. Do **not** add D1 counters, migrations, status-mail triggers, or lookup regex changes. A preview builder writes HTML/text/JSON from the same renderers.

**Tech Stack:** TypeScript, Vitest, existing Cloudflare Email `OutboundEmail` shape, official-staging URLs.

## Global Constraints

- Spec SHA `106a2177f878cf32e3dd7195e967782c813c3d6f` `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` (owner t327u shared-serial; t328u send-to-owner; t333u 23 Nov 2026 12:18 Macau: send revised tests now).
- White `#ffffff` header; logo only (`/images/kai-yue-travel-group-logo.png`, 250×49); gold `#f3a600` divider; dark `#1a1a1a` body. No company-name text beside the logo. Footer brand allowed.
- Email-safe 2-column TABLE (label | value); omit empty fields; plaintext labels padded to a column. No CSS grid/flex.
- Guest receipt is **not** a confirmation. Confirm and cancel copy are distinct. No payment/refund/cancellation-policy invention.
- Staff notices English; customer copy `en` / `pt` / `zh-Hant`. Staging subject prefix `[Staging test] `.
- Display example serial 42: `IN-KY0042` / `CF-KY00042` / `CL-KY00042`. Overflow expands. No DB allocation in this slice.
- Four English preview messages only To `scalingsmb@gmail.com`; From `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`. Official staging links. Visible synthetic/preview marking. No quote. No KY-PYPM8Y3E. No send from this VM.
- Preserve CodeMode63@`16e06ba`, prod61@`f774f69`, spec62@`106a217`, held #51–#53. Branch from `official-staging` `3a70cff`. No reset/rebase/force/autostash. No merge/deploy.

---

### Task 1: Lifecycle display formatters

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts`
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Produces: `formatLifecycleNumber(kind: "enquiry" | "confirmation" | "cancellation", serial: number): string`

- [ ] **Step 1:** Failing tests for serial 1 / 42 / 10000 / 100000 and invalid serial.
- [ ] **Step 2:** Implement `padStart` minimums (IN 4, CF/CL 5); extra digits stay; `never` default on kind.
- [ ] **Step 3:** Commit with renderer if later tasks land in the same change set.

### Task 2: Shared white/logo/gold shell + padded 2-col table

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts` (`brandedEmailHtml`, `rowsHtml`, `rowsText`)
- Test: `apps/web/src/lib/server/notification-templates.test.ts`
- Test: `tests/integration/notifications-staging.test.ts` (drop `#008c5e` header assertion)

**Interfaces:**
- Consumes: existing `EmailBrand.logoUrl`
- Produces: `EmailBrand.siteUrl?: string` footer link; table omits empty rows; plaintext `${label.padEnd(width)}: ${value}`

- [ ] **Step 1:** Tests: header background `#ffffff`; no bold header company-name sibling; gold bar; logo 250×49; alt may be Kai Yue Travel; footer may contain brand; escaped `<>`; empty labels omitted; no `#008c5e` in staff/ack/quote HTML.
- [ ] **Step 2:** Replace green header + adjacent name with white + logo + gold divider. Footer: Kai Yue Travel and optional staging origin.

### Task 3: Staff enquiry + guest receipt tables

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts` (`renderStaffMessage`, `renderCustomerAck`)
- Modify: `apps/web/src/lib/server/notifications.ts` (pass `details` + `siteUrl` into ack)
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Consumes: `StaffMessageInput.details`; `CustomerAckInput` gains `details?: DetailRow[]`, `syntheticPreview?: boolean`
- Produces: receipt still contains not-confirmation copy; 2-col filled details; EN/pt/zh-Hant ack paths

- [ ] **Step 1:** Tests for not-confirmation, locale langs, filled vs omitted rows, synthetic banner only when flagged.
- [ ] **Step 2:** Thread booking details into the guest receipt table without duplicating labels.

### Task 4: Guest confirmation + cancellation renderers

**Files:**
- Modify: `apps/web/src/lib/server/notification-templates.ts`
- Test: `apps/web/src/lib/server/notification-templates.test.ts`

**Interfaces:**
- Produces: `renderCustomerConfirmed(site, input, brand)`, `renderCustomerCancelled(site, input, brand)`
- Input: `{ locale, name, enquiryReference, confirmationNumber?, cancellationNumber?, details?, timezone, siteUrl, syntheticPreview? }`
- **Not** wired to `updateBookingStatus` in this slice.

- [ ] **Step 1:** Tests: CF/CL/IN display; confirm copy has no “not a confirmation”; cancel has no refund/payment; pt and zh-Hant render; empty fields omitted.
- [ ] **Step 2:** Add `CONFIRM_COPY` / `CANCEL_COPY` parallel to `ACK_COPY`. Do not invent policy terms.

### Task 5: Four English synthetic MIME artifacts + manifest

**Files:**
- Create: `apps/web/src/lib/server/lifecycle-email-preview.ts`
- Create: `docs/records/2026-11-23-email-lifecycle-templates/preview-mime/{staff,receipt,confirmed,cancelled}.{html,txt}`
- Create: `docs/records/2026-11-23-email-lifecycle-templates/preview-mime/manifest.json`
- Test: `apps/web/src/lib/server/lifecycle-email-preview.test.ts`

**Interfaces:**
- Produces: `buildLifecyclePreviewSet(): PreviewManifest` with `from`, `to`, `replyTo`, `subject`, `text`, `html` per message.

- [ ] **Step 1:** Fixture serial 42, airport transfer, Macau International Airport → Synthetic Hotel Cotai, 15 Dec 2026 10:30 Asia/Macau, 2 passengers. Banner: synthetic / not a stored booking. Links `https://staging.kaiyuemacau.com` (staff also `https://admin-staging.kaiyuemacau.com`). To only `scalingsmb@gmail.com`. No quote. No KY-PYPM8Y3E.
- [ ] **Step 2:** Write artifacts from the builder (honest render). Screenshot desktop ~600px and mobile ~390px if Chrome DevTools is available.
- [ ] **Step 3:** Record + PROJECT-STATE + docs/README. PR vs `official-staging`. Do not send.

## Self-review

| Spec item | Task |
| --- | --- |
| White / logo only / gold | 2 |
| 2-col filled table + padded plaintext | 2–3 |
| Receipt ≠ confirmation | 3 |
| Customer confirm + cancel copy | 4 (render only) |
| Staff new enquiry redesigned | 3 |
| Same serial display 42 | 1 + 5 |
| Locales | 3–4 |
| No DB/status/lookups | Global constraint |
| Four English MIME + manifest | 5 |
| Remaining: counters, alias columns, status-mail, lookup regex, native wording review, actual send | REPORT, not this plan |
