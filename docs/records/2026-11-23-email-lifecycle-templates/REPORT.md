# Email lifecycle — one KY##### Reference number (allocation + status mail)

**task_id:** `kaiyue-email-lifecycle-templates-20261123`  
**Authority:** Owner t333u 23 Nov 2026 12:18 Asia/Macau (implement/preview). Owner t335u/t336u 23 Nov 2026 12:41–12:42 Asia/Macau: one reference through all statuses, KY + 5 digits, label exactly **Reference number**. Owner t337u 23 Nov 2026 13:30 Macau: **ok get this live** — execute allocation, lookup, and status-mail required for a truthful staging live. Owner t338u 23 Nov 2026 13:58 Macau: once live, one full BOX computerUse booking from the live site to verify enquiry receipt. Owner t339u 23 Nov 2026 14:13 Macau: **ok proceed** lifts implementation HOLD for scoped reliability (strict five-digit cap, booking-create idempotency, guarded confirm/cancel mail retry, wrap/locale). It does **not** lift protected review/prod gates. Previous four + resend deliveries of the IN/CF/CL set are complete. This writer did **not** send and did **not** submit a booking.

**Living spec:** `docs/records/2026-11-20-email-lifecycle-design/SPEC.md` on this branch (t327u IN/CF/CL number model **superseded**). Historical PR #62 `106a217` is not current for numbers.  
**Branch:** `cursor/email-lifecycle-templates-f58e` (PR #64) from `official-staging` `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2`. **Merged** squash `ef703969381894597f0ed5db3d8023232253862c`. Staging live closeout: `CLOSEOUT-20261123-staging.md`.  
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

Shell: white `#ffffff` header, existing PNG logo only (250×49), gold `#f3a600` divider, dark body, footer brand + staging origin. English table label is exactly `Reference number`. Portuguese `Número de referência`. Traditional Chinese `參考編號`. Guest receipt still says this is not a booking confirmation. Confirm/cancel copy does not invent payment, refund, or cancellation-policy terms. Quote widget stays SKIPPED. Contact `INQ-` refs unchanged. Legacy `KY-xxxxxxxx` rows are never rewritten. **t339u:** serials are `KY00001`–`KY99999` only; overflow-widens (`KY100000`) is superseded. Reference values nowrap; long addresses wrap.

**Staging live (2026-11-23 CD):** PR #64 squash `ef70396` on `official-staging`; Worker `256f1788` @100% / deployment `d178b6c2`; D1 `043cd0ff` `0011` `last_issued=0`; dest lock `scalingsmb@gmail.com`. **Not claimed:** production merge/deploy/mail/`0011` on `06cf879d`; any send or booking from this VM; tourist-board/MGTO production publication (15 Nov 06:06 YES applied only to that dashboard UX site publication); quote widget. Independent source review PASS of `3823d48`. Parent handles staging browser send.

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
- Independent `code-reviewer` on the execute-live tree vs `a93eec20`: **source of this increment is acceptable**. Source review is **not** a GitHub review. Remaining staging-merge gates: GitHub required review (currently 0 reviews; `mergeable_state=blocked`) then parent merge of PR #64 only. This agent cannot merge (`gh` read-only). CI `check` SUCCESS on `08be249` (Actions `45121078616` / check-run `137514764347`). `0011` applied to staging D1 `043cd0ff` 2026-11-23 (live readback). CD schema check is not a live D1 readback.
- Non-blocking: increment still runs as `first()` `UPDATE … RETURNING` then a booking+claim `batch()` (MemoryD1 `.run()` drops `RETURNING`); uniqueness still holds; gaps never reuse. Quote MCP routing accepts serial refs but the widget stays SKIPPED. t339u added guarded `POST …/lifecycle-mail`.

## t339u scoped reliability (this increment)

Review findings at `0c8494d` were verified in source before edits. Evidence-based pushback: **none**. Overflow-widens was this branch’s prior rule; t339u owner decision already chose strict five digits — recorded as superseded, not reopened as a product question.

| Issue | Fix |
| --- | --- |
| Formatter allowed `KY100000` | `formatBookingReference` / `SERIAL_BOOKING_REFERENCE` exact `KY[0-9]{5}`; allocate `WHERE last_issued < 99999`; empty result `503`, no booking row |
| Concurrent same idempotency key could persist twice | Unique `202` claim → persist+bind reference in one D1 batch → `201`; empty `202` is `409`; persist failure deletes empty claim |
| Failed confirm/cancel mail had no retry | Status still commits first; `pending` before send; `POST /api/v1/admin/bookings/{reference}/lifecycle-mail`; retry `null`/`failed` only |
| nowrap overflow + English pickup-time duplicate | nowrap on reference only; addresses wrap; semantic label aliases collapse Pickup time / Hora de recolha / 接載時間 |
| HOLD at `a735855`: JS workflow check then id-only claim | Atomic claim `WHERE updated_at AND workflow=kind AND (NULL or failed)`; stale `409` without send; same guard on initial delivery; `lifecycle_mail` audit with actor id |

**No new hosted resource.** Remaining mail risk: crash after provider accepted the message but before `sent` is stored leaves `pending`; staff must not blindly resend. Not exactly-once without Cloudflare Email idempotency.

**Honest residuals (not in this increment):**
- Abandoned empty idempotency `202` (crash before the claim is deleted) returns `409` until 24h expiry. That is not “retry shortly” if the first request died before abandon.
- Recovered persisted `201` can lack the initial staff/ack send if the process crashed after persist and before notify.
- `pending` lifecycle mail is ambiguous and non-retryable (do not claim-retract in-flight).
- No MCP retry tool. No automatic scheduler/reconciler.

**Preview artifacts:** `preview-mime/*.html|*.txt|manifest.json` regenerated from current renderers at `generatedAt` `2026-11-23T06:37:14.168Z`. Screenshots recaptured at **320** and **390** (`*-320.png`, `*-390.png`). Prior `*-mobile.png` / `*-desktop.png` removed so they are not reused. Staff 320 and 390 PNGs are byte-identical (the staff table does not reflow between those widths); the three guest messages differ.

**Migration / back-compat:** no `0012`. Existing `0011` on staging `043cd0ff` (`last_issued=0`) is preserved. Legacy `KY-xxxxxxxx` still lookup/mail. Contacts still `INQ-`. Failed insert after increment may still gap.

**Review gate identity:** parent independent re-review of **this PR #64 HEAD SHA** (not self-test, not prior `0c8494d` / `08be249` review). Then staging merge of reviewed PR #64 only + CD. Then parent staging browser. Then production scoping. t338u BOX remains parent after verified production release.

### Required production plan (review only — not execution)

Do **not** merge prod #61 (`f774f69`) or unrelated PRs. Do **not** apply `0011` or enable mail from this VM.

1. Independent re-review + GitHub review of this SHA on PR #64.
2. Merge **PR #64 only** to `official-staging`; CD activates staging Worker. Staging dest stays `scalingsmb@gmail.com`. Staging `0011` already applied; do not reset `last_issued`.
3. Parent staging browser / inbox check (not this VM).
4. Production promotion of **this feature only**, after tourist-board/licence-claims verification is preserved (15 Nov widget board approval is not re-asked as a new product question):
   - Apply `0011` to production D1 `06cf879d` (today still `0001`–`0010` only). Start `last_issued=0`. Never copy staging serials.
   - Overlay: `NOTIFICATIONS_ENABLED=true`, `EMAIL` sender-only (`bookings@notify.kaiyuemacau.com`; **no** staging dest lock), `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com` (owner t315u). No `NOTIFY_ALLOWED_RECIPIENTS`. `PUBLIC_SITE_URL=https://kaiyuemacau.com`. Live Worker still mail-off until an authorized promote.
   - Deploy the reviewed Worker revision that contains this SHA (or its merge commit), not `5eebf7b6`.
5. Parent t338u: **one** live synthetic browser booking from `https://kaiyuemacau.com/` after that production Worker is verified. No duplicate from this VM.

## Remaining

1. ~~Exact review gate / merge PR #64~~ **done:** parent native merge of `3823d48` → squash `ef70396`; CD `45127576945` SUCCESS; Worker `256f1788` @100%.
2. Parent staging browser / DevTools / actual send (dest `scalingsmb@gmail.com` only). This VM does not send and does not PATCH live staging status. Do not merge #61/#62/#63/#51–#53.
3. Parent executes the fixture matrix above (dest `scalingsmb@gmail.com` only).
4. Native wording review of confirm/cancel sentences.
5. Dedicated mail-retry after `confirm_mail_state=failed` — **done in t339u** (`POST /api/v1/admin/bookings/{reference}/lifecycle-mail`). Do not re-PATCH a terminal `confirmed`.
6. Production: see `PRODUCTION-CANDIDATE.md`. Tourist-board gate preserved (do not re-ask). `0011` on `06cf879d` with `last_issued=0`; EMAIL sender-only; **`NOTIFY_STAFF_TO=daniel@kaiyuemacau.com` (t315u, not OPEN)**; WA `+85363128081`; WeChat JPEG from this tree; MCP off. Do not merge prod #61. HOLD parent review/QA. This writer does not deploy `main` or write production D1.
7. t338u BOX computerUse: **after** a verified production release of this feature, not against current `5eebf7b6` / `ff119f2c`. One clearly marked live booking. This VM must not submit a duplicate.

## Self-review (this head)

- Owner t335u/t336u/t337u: one persistent `KY#####`, English label exactly `Reference number`, four emails, allocation, lookup, status-mail. **Pass in source.**
- No IN/CF/CL, no Confirmation/Cancellation/Original enquiry fields. **Pass.**
- No wrap/reuse; strict five-digit cap (overflow-widens superseded). **Pass in tests.**
- Contact INQ unchanged; quote widget SKIPPED. **Pass.**
- CodeMode63 / prod61 / held 51–53 not touched. **Pass.**
- Staging live **claimed** after parent merge + CD `45127576945` SUCCESS (`256f1788` @100%). Production **not** claimed.
- Local verification this increment: `pnpm test` 381/381; `pnpm typecheck` 0 errors (6 existing hints). Staging dest lock unchanged. Production git dest `daniel@kaiyuemacau.com` (t315u). **HOLD** upload.
- t338u: this VM did not submit a booking, did not start computerUse, did not send mail, did not PATCH status.
- HOLD-1: concurrent cancel-after-read cannot send confirmation; claim guards workflow+version. **Pass in tests.** In-flight `pending` after a later cancel remains a residual (not retracted).
- GitHub review/merge of PR #64: parent completed native squash to `ef70396`. Staging CD SUCCESS. Production still not authorized.

---

## t338u live-browser handoff (verify, do not assume)

Owner exact: *once its live test a full browser booking test using the computer. from the live site to verify we can recieve the enquiry.* Parent queued actual BOX computerUse **after** verified production release. This authorizes a future **ONE** clearly marked test booking from the live website. It does **not** lift review/staging/protection gates, held OAuth, or quote restrictions. This VM must not submit.

### Exact live public booking URL

`https://kaiyuemacau.com/`

Verified 2026-11-23: HTTP 200, `link rel="canonical" href="https://kaiyuemacau.com/"`, hero island `BookingEmbedded` (`/_astro/BookingEmbedded.T8j69MmK.js`), English Home. Alias `https://www.kaiyuemacau.com/` is not the canonical. Staging marketing `https://staging.kaiyuemacau.com/` is **not** the authorized live production test.

Desktop: hero embedded widget (`sourceTrigger=hero-embed`, `sourceMode=embedded`). Home has `page-no-mobile-book`; use a desktop viewport so the hero form is the path. Default ride is Point to point (`airport_transfer`). Default communication tab is **WhatsApp** — switch to **Email** for the mail-receipt test.

### Current production release (not this PR)

| Item | Verified live value |
| --- | --- |
| Git | `main` `ff119f2c18f075fe5103821d6541625d49986b38` |
| Worker | `kaiyue-travel` version `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% |
| Deployment | `494bc151-3081-4a26-9d1c-40428e0025e3` since 2026-11-16T10:54:51Z |
| Version annotation | `production 696c2bd8 / main ff119f2c` (tag `696c2bd8`) |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` |
| `BOOKING_NOTICE_HOURS` | `24` |
| `NOTIFICATIONS_ENABLED` | `false` |
| `EMAIL` binding | **absent** |
| `NOTIFY_STAFF_TO` | **absent** |
| Production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11` | `d1_migrations` `0001`–`0010` only; **no** `chauffeur_booking_serial` |

Current live persist still allocates `KY-xxxxxxxx`. Success copy on live is `Reference <strong>…</strong>` (this PR changes it to **Reference number** after a production promote that is **not** authorized here).

Staging live: squash `ef703969381894597f0ed5db3d8023232253862c`. Worker `kaiyue-travel-staging` `256f1788-34f1-4012-bc32-e97367588c8a` @100% / deployment `d178b6c2-6e74-4c3c-aa5b-f991be481971`. Closeout: `CLOSEOUT-20261123-staging.md`.

### Actual production staff notification recipient

**Authority (t315u 20 Nov 11:20 Macau):** `daniel@kaiyuemacau.com`. Owner answer to *Which inbox should receive staff booking and enquiry notifications in production?* was *the admin email. daniel@*. Encoded as `NOTIFY_STAFF_TO` in PR #61 and now in `deploy/production/wrangler.jsonc` on this branch. This is **inbox approval**, not admission-only. Dest is **not OPEN**. Do not re-ask.

**Live Worker (unchanged until promote):** `NOTIFICATIONS_ENABLED=false`; no `EMAIL`; no `NOTIFY_STAFF_TO`. Inbox will not fire until an authorized activation of the git candidate.

Staging staff dest (verified live, not the t338u production test): `scalingsmb@gmail.com` (`NOTIFY_STAFF_TO` + `EMAIL.allowed_destination_addresses`). Staging `NOTIFICATIONS_ENABLED=true`. Staging lock is unchanged.

On current production runtime, “receive the enquiry” means **D1 persist + admin detail**, not inbox.

### Read-only receipt verification path

Parent only. Do not change booking status. Do not send extra mail from this VM.

1. Public success screen on `https://kaiyuemacau.com/` — capture the displayed reference (`KY-xxxxxxxx` on current live; `KY#####` only after this feature is actually production-live).
2. Sign in at `https://admin.kaiyuemacau.com/login` (production admin; not the marketing host).
3. Open `https://admin.kaiyuemacau.com/admin/bookings/<REFERENCE>` (detail route). The HTML list UI does not read `?q=`; the admin **API** `GET /api/v1/admin/bookings?q=<REFERENCE>` does, behind the same session.
4. Inbox check only after production mail is actually enabled and a dest is configured. Skip inbox on today’s Worker.

Staging analogue (not the t338u live test): `https://admin-staging.kaiyuemacau.com/admin/bookings/<REFERENCE>`.

### Fields the browser test needs (email-channel enquiry)

One booking. Mark it as a test in **Your Message**. Leave honeypot `Website` empty (do not click/fill `#website`). Do not use the WhatsApp tab for this mail-receipt test. Pickup must be at least 24 hours ahead in `Asia/Macau`.

| Step | Control | Required | Notes |
| --- | --- | --- | --- |
| Journey | Point to point (default) | yes | Do not switch to hourly/city tour |
| Journey | **From** `#pickupLocation` | yes | Address, airport, hotel |
| Journey | **To** `#destination` | yes | Required for point-to-point |
| Journey | **Pickup date** | yes | Date + time; ≥24h notice |
| Journey | **Passengers** | yes | Default 2; 1–14 |
| Journey | **Get a quote →** | yes | Opens Communication |
| Communication | **Email** tab | yes | Default is WhatsApp; switch |
| Communication | **Your Name *** `#contactName` | yes | Synthetic owner name (parent supplies) |
| Communication | **Your Email *** `#email` | yes | Synthetic owner contact (parent supplies) |
| Communication | Phone (optional) | no | |
| Communication | Big luggage / Hand carry | no | Default 0 |
| Communication | **Your Message (optional)** `#message` | yes for this test | Clearly mark TEST / t338u; one booking only |
| Communication | Consent copy | n/a | No checkbox on booking form |
| Communication | `#website` honeypot | must stay empty | Hidden; filling it drops the request |
| Communication | **Send email request →** | yes | POST `/api/v1/bookings` |

Do not PATCH status after submit. Do not create a second booking from this VM. Held quote `KY-PYPM8Y3E` stays skipped.
