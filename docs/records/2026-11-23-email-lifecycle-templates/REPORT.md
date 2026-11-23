# Email lifecycle — one KY##### Reference number (allocation + status mail)

**task_id:** `kaiyue-email-lifecycle-templates-20261123`  
**Authority:** Owner t333u 23 Nov 2026 12:18 Asia/Macau (implement/preview). Owner t335u/t336u 23 Nov 2026 12:41–12:42 Asia/Macau: one reference through all statuses, KY + 5 digits, label exactly **Reference number**. Owner t337u 23 Nov 2026 13:30 Macau: **ok get this live** — execute allocation, lookup, and status-mail required for a truthful staging live. Previous four + resend deliveries of the IN/CF/CL set are complete. This writer did **not** send.

**Living spec:** `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` on this branch (t327u IN/CF/CL number model **superseded**). Historical PR #62 `106a217` is not current for numbers.  
**Branch:** `cursor/email-lifecycle-templates-f58e` (PR #64) from `official-staging` `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2`  
**Preserved:** CodeMode63 `16e06ba`; prod61 `f774f69`; held #51–#53.

---

## What shipped

Production-intended shared shell and four message types, plus the persist path needed to emit them honestly:

| Piece | Role |
| --- | --- |
| `renderStaffMessage` | Staff new enquiry (English) |
| `renderCustomerAck` | Guest request-received (**not** a confirmation) |
| `renderCustomerConfirmed` | Guest confirmation after workflow `confirmed` |
| `renderCustomerCancelled` | Guest cancellation after workflow `cancelled` |
| `migrations/0011_chauffeur_booking_serial.sql` | Per-D1 serial, `lifecycle_serial`, confirm/cancel mail columns |
| `allocateChauffeurSerial` | Atomic increment; store `KY#####` once at persist |
| `isChauffeurBookingReference` | Lookup `KY#####` **and** legacy `KY-xxxxxxxx` |
| `sendLifecycleCustomerMail` | Email-channel only; no extra staff blast |

Shell: white `#ffffff` header, existing PNG logo only (250×49), gold `#f3a600` divider, dark body, footer brand + staging origin. English table label is exactly `Reference number`. Portuguese `Número de referência`. Traditional Chinese `參考編號`. Guest receipt still says this is not a booking confirmation. Confirm/cancel copy does not invent payment, refund, or cancellation-policy terms. Quote widget stays SKIPPED. Contact `INQ-` refs unchanged. Legacy `KY-xxxxxxxx` rows are never rewritten. Overflow widens (`KY100000`); the five-digit pad never wraps or reuses.

**Not claimed live:** staging merge/deploy until independent review + CI + operator apply of `0011` to D1 `043cd0ff`. Production merge/deploy/mail/`0011`. Any send from this VM. Tourist-board/MGTO production publication (15 Nov 06:06 YES applied only to that dashboard UX site publication). Quote widget.

---

## Four English synthetic messages (not sent this run)

All `To`: `scalingsmb@gmail.com`  
`From`: Kai Yue Travel `<bookings@notify.kaiyuemacau.com>`  
Subject prefix: `[Staging test]`  
Serial **42** (preview only, not stored): **`KY00042`** on every message  
Visible banner: synthetic / not a stored booking. Links: `https://staging.kaiyuemacau.com` (staff also `https://admin-staging.kaiyuemacau.com`). No `KY-PYPM8Y3E`. No quotes.

| id | Subject |
| --- | --- |
| `staff-new-enquiry` | `[Staging test] New booking request KY00042` |
| `customer-request-received` | `[Staging test] We received your request KY00042` |
| `customer-confirmed` | `[Staging test] Your chauffeur booking is confirmed KY00042` |
| `customer-cancelled` | `[Staging test] Your chauffeur booking has been cancelled KY00042` |

**Manifest:** `docs/records/2026-11-23-email-lifecycle-templates/preview-mime/manifest.json`

---

## Parent synthetic staging fixture matrix (this VM must not send)

Dest lock remains **only** `scalingsmb@gmail.com`. Parent executes within verified permission after `0011` is on staging D1 and the reviewed Worker is activated. Do **not** call skipped quote `KY-PYPM8Y3E`. Do **not** mutate production D1.

| # | Action | Expected stored ref | Expected emails (To lock) |
| --- | --- | --- | --- |
| A | Public email-channel POST `/api/v1/bookings` (idempotency key new) | Next unused `KY#####` (first after `0011` apply is `KY00001` if `last_issued=0`) | Staff `New booking request KY#####` + guest `We received your request KY#####` (not a confirmation) |
| B | Admin PATCH same row `enquiry → approved` | Unchanged | None |
| C | Admin PATCH `approved → confirmed` | Unchanged | Guest `Your chauffeur booking is confirmed KY#####` |
| D | Admin PATCH `confirmed → cancelled` | Unchanged | Guest `Your chauffeur booking has been cancelled KY#####` (no refund language) |
| E | Public WhatsApp-channel POST | Next `KY#####` | None |
| F | Admin PATCH WhatsApp row to `confirmed` | Unchanged | None (`confirm_mail_state=skipped`) |
| G | Admin PATCH email-channel `enquiry → denied` | Unchanged | No cancellation mail |
| H | GET/PATCH an existing legacy `KY-xxxxxxxx` | Exact legacy string | Confirm/cancel (if transitioned) quotes the **legacy** ref; never rewritten |
| I | Replay same POST idempotency key as A | Same ref | No second pair |

English label on every table: **Reference number**. Staging subject prefix `[Staging test]`. From `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`.

---

## Migration / back-compat

- Additive only. Existing `bookings.reference` values stay. `lifecycle_serial` is NULL on legacy rows.
- Unique `reference` (from `0001`) plus unique `lifecycle_serial` where not null.
- Failed insert after increment may leave a gap; never reuse that serial.
- Schema contract on disk now lists `0001`–`0011` (`0011` sha256 `9a14197dcee31a2a87881338f50225ab0903c4cb2ee427fcc794671837244f81`). This is **not** a live D1 readback. Official-staging CD does not apply migrations.
- **Order for staging live:** independent review → CI → operator apply `0011` to D1 `043cd0ff` → merge PR #64 only → CD upload/activate. Activating the Worker before `0011` makes persist fail closed.
- Do not apply `0011` to production D1 `06cf879d`.

---

## Production release gates (blocker — do not stop staging)

| Gate | Status | Source |
| --- | --- | --- |
| Macao tourist-board / MGTO publication for **this** lifecycle promote | **NOT waived** | `docs/records/2026-11-15-production-staff-dashboard-ux-candidate.md` (owner 06:06 YES was for that dashboard UX **site** publication only). `BUSINESS_INFORMATION.md` still lists licence 0162 / 2026-09-20 as needing reconfirmation. |
| Quote widget | SKIPPED | Owner prior skip; do not revive `KY-PYPM8Y3E` |
| Production merge / `main` / D1 `06cf879d` / production mail | **Not authorized** | t337u: parent must verify existing production scope first |
| Held PRs #51–#53, CodeMode #63 `16e06ba`, prod #61 `f774f69` | Frozen | Do not merge with this task |

---

## Independent review (not CI)

- CodeRabbit CLI 0.9.6 present; **not authenticated**. `coderabbit auth login --agent` failed (`automatic_login_failed`; localhost callback unavailable). Exact CodeRabbit blocker: provision an Agentic API key in this environment or complete browser login on a user-controlled terminal. Do not treat this as a CodeRabbit pass.
- Independent `code-reviewer` on the execute-live tree vs `a93eec20`: **source of this increment is acceptable**; **staging merge FAIL until** (1) this increment is committed on `cursor/email-lifecycle-templates-f58e`, (2) CI green on that commit, (3) authorized operator applies `0011` to D1 `043cd0ff` **before** CD activation. CD schema check is not a live D1 readback and would otherwise activate a Worker that fail-closes persist.
- Non-blocking: increment+INSERT are not one D1 `batch()` (MemoryD1 `.run()` drops `RETURNING`; uniqueness still holds; gaps never reuse); no mail-retry for `confirm_mail_state=failed`; quote MCP routing now accepts serial refs but the widget stays SKIPPED.

## Remaining

1. Commit this increment (B1), then CI on that SHA (not treated as review).
2. Operator apply `0011` to staging D1 `043cd0ff` **before** merge/activation.
3. Staging merge of **reviewed PR #64 only**, then parent browser / DevTools / security check.
4. Parent executes the fixture matrix above; this VM does not send and does not PATCH live staging status.
5. Native wording review of confirm/cancel sentences.
6. Dedicated mail-retry after `confirm_mail_state=failed` (no re-PATCH of a terminal `confirmed`).
7. Production: tourist-board gate, production `0011`, mail activation, recipient policy — later parent decision. CodeRabbit auth remains a process gap, not a merge substitute.

## Self-review (this head)

- Owner t335u/t336u/t337u: one persistent `KY#####`, English label exactly `Reference number`, four emails, allocation, lookup, status-mail. **Pass in source.**
- No IN/CF/CL, no Confirmation/Cancellation/Original enquiry fields. **Pass.**
- No wrap/reuse; overflow widens. **Pass in tests.**
- Contact INQ unchanged; quote widget SKIPPED. **Pass.**
- CodeMode63 / prod61 / held 51–53 not touched. **Pass.**
- Staging live **not** claimed until committed SHA + `0011` apply + CD. Production **not** claimed.
- Local verification this increment: `pnpm test` 356/356; `pnpm typecheck` 0 errors (6 existing hints).
