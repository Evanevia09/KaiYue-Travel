# Email lifecycle templates — one KY##### Reference number (no send)

**task_id:** `kaiyue-email-lifecycle-templates-20261123`  
**Authority:** Owner t333u 23 Nov 2026 12:18 Asia/Macau (implement/preview). Owner t335u/t336u 23 Nov 2026 12:41–12:42 Asia/Macau: one reference through all statuses, KY + 5 digits, label exactly **Reference number**. This slice is **render + synthetic MIME artifacts**. Previous four + resend deliveries of the IN/CF/CL set are complete. This writer did **not** send.

**Living spec:** `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` on this branch (t327u IN/CF/CL number model **superseded**). Historical PR #62 `106a217` is not current for numbers.  
**Branch:** `cursor/email-lifecycle-templates-f58e` (PR #64) from `official-staging` `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2`  
**Preserved:** CodeMode63 `16e06ba`; prod61 `f774f69`; held #51–#53.

---

## What shipped

Production-intended shared shell and four message types:

| Renderer | Role |
| --- | --- |
| `renderStaffMessage` | Staff new enquiry (English) |
| `renderCustomerAck` | Guest request-received (**not** a confirmation) |
| `renderCustomerConfirmed` | Guest confirmation (not wired to status PATCH) |
| `renderCustomerCancelled` | Guest cancellation (not wired to status PATCH) |

Shell: white `#ffffff` header, existing PNG logo only (250×49), gold `#f3a600` divider, dark body, footer brand + staging origin. No extra company-name text beside the logo. Filled-only 2-column email-safe table. Value cells `white-space:nowrap` so the reference widens rather than wrapping. Plaintext labels padded. `formatBookingReference` is display-only: `KY` + at least five digits, no hyphen (serial 42 → `KY00042`; 100000 → `KY100000`).

English table label is exactly `Reference number` on all four messages. Portuguese `Número de referência`. Traditional Chinese `參考編號`. Confirmation number / Cancellation number / Original enquiry fields are removed. Guest receipt still says this is not a booking confirmation. Confirm/cancel copy does not invent payment, refund, or cancellation-policy terms. Quote HTML inherits the new shell; quote widget stays SKIPPED; quote is **not** in the owner preview set. Contact `INQ-` refs unchanged.

**Not in this slice:** D1 counters, alias columns, migrations, status-mail triggers, lookup regexes, merge, deploy, live booking writes, actual Email Service send. Legacy `KY-xxxxxxxx` rows are not renumbered. Full lifecycle is **not** implemented.

---

## Four English synthetic messages (not sent this run)

All `To`: `scalingsmb@gmail.com`  
`From`: Kai Yue Travel `<bookings@notify.kaiyuemacau.com>`  
Subject prefix: `[Staging test]`  
Serial **42** (not stored): **`KY00042`** on every message  
Visible banner: synthetic / not a stored booking. Links: `https://staging.kaiyuemacau.com` (staff also `https://admin-staging.kaiyuemacau.com`). No `KY-PYPM8Y3E`. No quotes.

| id | Subject |
| --- | --- |
| `staff-new-enquiry` | `[Staging test] New booking request KY00042` |
| `customer-request-received` | `[Staging test] We received your request KY00042` |
| `customer-confirmed` | `[Staging test] Your chauffeur booking is confirmed KY00042` |
| `customer-cancelled` | `[Staging test] Your chauffeur booking has been cancelled KY00042` |

**Manifest (one JSON, includes html/text bodies):**  
`docs/records/2026-11-23-email-lifecycle-templates/preview-mime/manifest.json`

Portable HTML/text beside it. Staff `replyTo` is the locked inbox; customer messages have no `replyTo`.

**Reproduce:**

```bash
node --experimental-strip-types --no-warnings -e "
import { writeLifecyclePreviewArtifacts } from './apps/web/src/lib/server/lifecycle-email-preview.ts';
await writeLifecyclePreviewArtifacts('docs/records/2026-11-23-email-lifecycle-templates/preview-mime', '2026-11-23T04:50:00.000Z');
"
```

---

## Verification

- Visual: Chrome rendered the four HTML files. Desktop ~600px and mobile ~390px screenshots of all four. Logo loads from staging. White header, gold bar, 2-col table, no extra header wordmark. Receipt contains “This is not a booking confirmation.” Confirm does not. Each table shows **Reference number** / **KY00042** once.
- Tests: `pnpm test` 351/351. Template + preview + staging notifications + quote shell assertion.
- Typecheck: `pnpm --filter @kaiyue/web typecheck` 0 errors (6 existing hints remain).
- Locales: EN owner set; pt and zh-Hant confirm/cancel/ack render paths covered by unit tests.
- No send, no deploy, no D1 write.

## Remaining full-lifecycle work (not this PR)

Future plan is **one durable `KY#####` reference**, not three aliases.

1. Per-D1 chauffeur serial allocated once at persist; store as `bookings.reference` (`KY#####`). **No** confirmation/cancellation alias columns.
2. Lookup by that one reference plus untouched legacy `KY-xxxxxxxx`. MCP/admin regex later.
3. Persist-first status mail for workflow `confirmed` / `cancelled`, quoting the same number.
4. Native wording review of confirm/cancel sentences.
5. Parent-sanctioned Cloudflare send only if the owner asks again for **this** MIME set.
6. Legacy `KY-` rows still have no numeric base (spec §8); never rewrite them.

## Self-review (this head)

- Owner t335u/t336u: one `KY00042`, English label exactly `Reference number`, all four emails, subjects match. **Pass.**
- No IN/CF/CL, no Confirmation/Cancellation/Original enquiry fields. **Pass.**
- Shell / locales / synthetic banner / staging destination lock preserved. **Pass.**
- Display formatter only; no D1/migration/counter. **Pass.**
- Contact INQ unchanged; quote widget SKIPPED. **Pass.**
- CodeMode63 / prod61 / held 51–53 not touched. **Pass.**
- Full lifecycle (status mail, counters, lookups) **not** claimed.
