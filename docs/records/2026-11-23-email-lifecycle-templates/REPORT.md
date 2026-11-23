# Email lifecycle — one KY##### Reference number (allocation + status mail)

**task_id:** `kaiyue-email-lifecycle-templates-20261123`  
**Authority:** Owner t333u 23 Nov 2026 12:18 Asia/Macau (implement/preview). Owner t335u/t336u 23 Nov 2026 12:41–12:42 Asia/Macau: one reference through all statuses, KY + 5 digits, label exactly **Reference number**. Owner t337u 23 Nov 2026 13:30 Macau: **ok get this live** — execute allocation, lookup, and status-mail required for a truthful staging live. Owner t338u 23 Nov 2026 13:58 Macau: once live, one full BOX computerUse booking from the live site to verify enquiry receipt. Previous four + resend deliveries of the IN/CF/CL set are complete. This writer did **not** send and did **not** submit a booking.

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

**Not claimed live:** staging merge/deploy until GitHub review + merge of PR #64 + CD activation. Production merge/deploy/mail/`0011`. Any send from this VM. Tourist-board/MGTO production publication (15 Nov 06:06 YES applied only to that dashboard UX site publication). Quote widget. Independent source review PASS; CI `check` SUCCESS on `08be249`; staging D1 `0011` applied. GitHub PR still `mergeable_state=blocked` (0 reviews). This agent cannot merge.

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
- Non-blocking: increment+INSERT are not one D1 `batch()` (MemoryD1 `.run()` drops `RETURNING`; uniqueness still holds; gaps never reuse); no mail-retry for `confirm_mail_state=failed`; quote MCP routing now accepts serial refs but the widget stays SKIPPED.

## Remaining

1. GitHub review of PR #64 (currently 0 reviews; `mergeable_state=blocked`). Independent source review PASS is not that review. This agent cannot merge.
2. Parent merge of **reviewed PR #64 only**, then official-staging CD. Staging Worker is still `3b9240e7` until then. Do not merge #61/#62/#63/#51–#53.
3. Parent staging browser / DevTools / security check after CD. This VM does not send and does not PATCH live staging status.
4. Parent executes the fixture matrix above (dest `scalingsmb@gmail.com` only).
5. Native wording review of confirm/cancel sentences.
6. Dedicated mail-retry after `confirm_mail_state=failed` (no re-PATCH of a terminal `confirmed`).
7. Production: tourist-board gate, production `0011`, mail activation, recipient policy — later parent decision. CodeRabbit auth remains a process gap, not a merge substitute.
8. t338u BOX computerUse: **after** a verified production release of this feature, not against current `5eebf7b6` / `ff119f2c`. One clearly marked live booking. This VM must not submit a duplicate.

## Self-review (this head)

- Owner t335u/t336u/t337u: one persistent `KY#####`, English label exactly `Reference number`, four emails, allocation, lookup, status-mail. **Pass in source.**
- No IN/CF/CL, no Confirmation/Cancellation/Original enquiry fields. **Pass.**
- No wrap/reuse; overflow widens. **Pass in tests.**
- Contact INQ unchanged; quote widget SKIPPED. **Pass.**
- CodeMode63 / prod61 / held 51–53 not touched. **Pass.**
- Staging live **not** claimed until GitHub merge + CD. Production **not** claimed.
- Local verification this increment: `pnpm test` 356/356; `pnpm typecheck` 0 errors (6 existing hints).
- t338u: this VM did not submit a booking, did not start computerUse, did not send mail, did not PATCH status.

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

Task branch / not live: `08be2499d728e09f79eba05691e4b7ef53c7d868` PR #64. Staging Worker still `kaiyue-travel-staging` `3b9240e7-2f67-408c-a16c-92fa9645974d` @100% since 2026-11-20T05:13:26Z.

### Actual production staff notification recipient

**None configured.** Live Worker settings (GET `/workers/scripts/kaiyue-travel/settings`) and overlay `deploy/production/wrangler.jsonc` both have `NOTIFICATIONS_ENABLED=false`, no `EMAIL`, no `NOTIFY_STAFF_TO`. Do **not** treat `daniel@kaiyuemacau.com` (`VERIFIED_PRODUCTION_PRIMARY_EMAIL`, operator admission) as a mail dest.

Staging staff dest (verified live, not the t338u production test): `scalingsmb@gmail.com` (`NOTIFY_STAFF_TO` + `EMAIL.allowed_destination_addresses`). Staging `NOTIFICATIONS_ENABLED=true`.

On current production, “receive the enquiry” means **D1 persist + admin detail**, not inbox. Inbox will not fire until a later authorized production mail activation with an explicit `NOTIFY_STAFF_TO`. After this PR is production-promoted (not authorized), the production overlay still has mail off and no `EMAIL`.

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
