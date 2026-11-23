# Email lifecycle templates — render/preview (no send)

**task_id:** `kaiyue-email-lifecycle-templates-20261123`  
**Authority:** Owner t333u 23 Nov 2026 12:18 Asia/Macau: send all revised emails now. Spec t327u shared-serial; t328u test emails to `scalingsmb@gmail.com` without another preview. This slice is **render + synthetic MIME artifacts**. Parent sends after checking this output. This writer did **not** send.

**Spec:** `106a2177f878cf32e3dd7195e967782c813c3d6f` `docs/records/2026-11-20-email-lifecycle-design/SPEC.md`  
**Branch:** `cursor/email-lifecycle-templates-f58e` from `official-staging` `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2`  
**Preserved:** CodeMode63 `16e06ba`; prod61 `f774f69`; spec62 `106a217`; held #51–#53.

---

## What shipped

Production-intended shared shell and four message types:

| Renderer | Role |
| --- | --- |
| `renderStaffMessage` | Staff new enquiry (English) |
| `renderCustomerAck` | Guest request-received (**not** a confirmation) |
| `renderCustomerConfirmed` | Guest confirmation (not wired to status PATCH) |
| `renderCustomerCancelled` | Guest cancellation (not wired to status PATCH) |

Shell: white `#ffffff` header, existing PNG logo only (250×49), gold `#f3a600` divider, dark body, footer brand + staging origin. No extra company-name text beside the logo. Filled-only 2-column email-safe table. Plaintext labels padded. `formatLifecycleNumber` is display-only (IN min 4, CF/CL min 5, overflow expands).

Guest receipt still says this is not a booking confirmation. Confirm/cancel copy does not invent payment, refund, or cancellation-policy terms. Quote HTML inherits the new shell; quote widget stays SKIPPED; quote is **not** in the owner preview set.

**Not in this slice:** D1 counters, alias columns, migrations, status-mail triggers, lookup regexes, merge, deploy, live booking writes, actual Email Service send.

---

## Four English synthetic messages (ready for parent send)

All `To`: `scalingsmb@gmail.com`  
`From`: Kai Yue Travel `<bookings@notify.kaiyuemacau.com>`  
Subject prefix: `[Staging test]`  
Serial **42** (not stored): `IN-KY0042` / `CF-KY00042` / `CL-KY00042`  
Visible banner: synthetic / not a stored booking. Links: `https://staging.kaiyuemacau.com` (staff also `https://admin-staging.kaiyuemacau.com`). No `KY-PYPM8Y3E`. No quotes.

| id | Subject |
| --- | --- |
| `staff-new-enquiry` | `[Staging test] New booking request IN-KY0042` |
| `customer-request-received` | `[Staging test] We received your request IN-KY0042` |
| `customer-confirmed` | `[Staging test] Your chauffeur booking is confirmed CF-KY00042` |
| `customer-cancelled` | `[Staging test] Your chauffeur booking has been cancelled CL-KY00042` |

**Manifest (one JSON, includes html/text bodies):**  
`docs/records/2026-11-23-email-lifecycle-templates/preview-mime/manifest.json`

Portable HTML/text beside it. Staff `replyTo` is the locked inbox; customer messages have no `replyTo`.

**Reproduce:**

```bash
node --experimental-strip-types --no-warnings -e "
import { writeLifecyclePreviewArtifacts } from './apps/web/src/lib/server/lifecycle-email-preview.ts';
await writeLifecyclePreviewArtifacts('docs/records/2026-11-23-email-lifecycle-templates/preview-mime', '2026-11-23T04:30:00.000Z');
"
```

---

## Verification

- Visual: Chrome rendered the four HTML files. Desktop screenshots of all four + mobile 390px receipt and confirmation. Logo loads from staging. White header, gold bar, 2-col table, no extra header wordmark. Receipt contains “This is not a booking confirmation.” Confirm does not.
- Tests: template + preview + staging notifications + quote shell assertion. Full `pnpm test` after quote-shell update.
- Typecheck: `pnpm --filter @kaiyue/web typecheck` (existing unrelated hints remain).
- Locales: EN owner set; pt and zh-Hant confirm/cancel/ack render paths covered by unit tests.
- No send, no deploy, no D1 write.

## Remaining full-lifecycle work (not this PR)

1. Per-D1 chauffeur serial + alias columns + persist-first status mail for `confirmed`/`cancelled`.
2. Lookup IN/CF/CL on admin/MCP paths; canonical URL stays original enquiry.
3. Native wording review of confirm/cancel sentences.
4. Parent-sanctioned Cloudflare send of **this** MIME set, then owner inbox proof.
5. Legacy `KY-` rows still have no numeric base (spec §8).
