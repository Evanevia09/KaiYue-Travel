# Staging ack + admin pair — PM/executor PASS (recorded, not this writer)

**As-of:** 2026-11-20 14:08 Asia/Macau  
**Label:** PM/executor evidence. This writer did **not** POST, send, or read the parent-box proof file.  
**Does not** authorize dropping the MCP quote gate, `all PASS`, merge of PR #61, or production upload.

Owner t324s1767 14:04 Macau approved the native widget: one synthetic staging request, both previews to `scalingsmb@gmail.com`, using the generated ref. Executor: **one** `POST` (no retry) 14:06:49–52 to `https://staging.kaiyuemacau.com/api/v1/bookings`, `Origin: https://staging.kaiyuemacau.com`, idempotency-key `stg-ack-admin-20261120-001` unused per D1 read.

| Item | Reported value |
| --- | --- |
| HTTP | **201** |
| Reference | `KY-JWM6M8AT` |
| Row | `1f84091d-abc5-4ef8-b7ce-708869fc6a94` (enquiry) |
| `notification_state` | `sent` |
| `request_id` | `req_cde03dc023c342f4afc1` |
| Worker (preflight, unchanged) | `kaiyue-travel-staging` `3b9240e7` #26 / `4ffbb3e7` @100% = official-staging `3a70cff` |
| Lock | `NOTIFICATIONS_ENABLED=true`; staff / allowed / EMAIL dest **only** `scalingsmb@gmail.com` |

## Inbox (both To `scalingsmb@gmail.com` only)

| | Staff | Customer ack |
| --- | --- | --- |
| Subject | `[Staging test] New booking request KY-JWM6M8AT` | `[Staging test] We received your request KY-JWM6M8AT` |
| From | Kai Yue Travel `<bookings@notify.kaiyuemacau.com>` | same |
| Reply-To | owner (guest) | none |
| Gmail | `1a1f790abbba9645` | `1a1f790ad6239ac9` |
| RFC Message-ID | `<G4SvWJkyKh3yG00OMz5hTahCrBe04kSvDP0x@notify.kaiyuemacau.com>` | `<EKvoMPAArJzxeJusZOvNM6eU0CQa1eaWWI9N@notify.kaiyuemacau.com>` |
| Time | 14:06:50 | 14:06:51 |
| Auth | DKIM / SPF / DMARC **PASS** | same |

MIME plain+HTML matched the approved staging previews with **only** the reference replaced (`KY-STGACK01` → `KY-JWM6M8AT`). Staging logo. Request-received copy, **not** a booking confirmation. No Daniel delivery. No production or WhatsApp action.

Parent-box proof (not on this VM): `/workspace/kaiyue-ack-admin-preview-20261120/send-proof/delivery-proof.json` SHA256 `b451beea835d3b249c0ad817802bf7b4767a9f9c775584dc5e0df7d2e3638572` as of 14:08:39 Macau.

## Remaining policy gate (unchanged)

10th MCP `send_quote_email` for `KY-PYPM8Y3E` was **never called**. Native quote question stays **SKIPPED/CLOSED**, not waived. Staging pair PASS does not drop that gate.
