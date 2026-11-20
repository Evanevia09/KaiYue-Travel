# Production mail candidate vs current official-staging

**task_id:** `kaiyue-production-mail-candidate-20261120`  
**Status:** source candidate prepared. Staging ack+admin pair **PASS** (PM/executor 14:08 Macau). **HOLD** merge to `official-staging` / `main` and production upload until parent operational handoff. Not `user_accepted`. Live production **off**.  
**As-of:** 2026-11-20 14:10 Asia/Macau

Owner t324u 20 Nov 13:27 Macau: proceed until all changes can land to production. Parent: remaining email checks / promote / verify; test-email previews before actual send. Quote widget SKIPPED/CLOSED. This writer does not POST or send.

## Continuity

| Item | Value |
| --- | --- |
| Writer | this agent only (`bc-efa1f054` RUNNING). No other RUNNING writers. |
| Live staging | PR #59 squash `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2`. Worker `kaiyue-travel-staging` `3b9240e7` @100% / `4ffbb3e7`. `NOTIFICATIONS_ENABLED="true"`. Lock `scalingsmb@gmail.com` only. |
| PR #60 | docs-only live-enable record `84596e8`. **Not merged** (no extra staging CD for docs). Folded into this candidate. |
| PR #58 | published `b0f9f4016621db0e390785847e1bac99270575ab` left as-is (`mergeable_state: dirty`). **No reset / force / rebase.** Production overlay + guards copied forward onto current official-staging. |
| Base | `cursor/staging-ack-admin-email-live-f58e` `84596e8` = `official-staging` `3a70cff` + PR #60 docs |
| Branch | `cursor/prod-mail-candidate-f58e` |
| Held | PRs #51/#52/#53 OPEN. Production MCP/OAuth not revived. Normal admin HTTP path unchanged. |

## Live re-read (CF GET 2026-11-20T05:28Z, account `33ecc`)

| Worker | `NOTIFICATIONS_ENABLED` | EMAIL | Staff / dest lock | D1 / R2 / WA |
| --- | --- | --- | --- | --- |
| `kaiyue-travel-staging` | `"true"` | dest `scalingsmb@gmail.com`; sender `bookings@notify.kaiyuemacau.com` | staff+allowed = scalingsmb | `043cd0ff` / `kaiyue-offers-staging` / `+85363128081` |
| `kaiyue-travel` | `"false"` | **none** | none | `06cf879d` / `kaiyue-offers-production` / `+85328338882` |

## Source change (production overlay + guards)

Copied from reviewed PR #58 with one owner-directed delta: `NOTIFICATIONS_ENABLED` `"false"` → `"true"` so the candidate is all-notifications-live in source. Staging overlay not reverted.

- `deploy/production/wrangler.jsonc`: `EMAIL` sender-only `bookings@notify.kaiyuemacau.com`; `NOTIFY_STAFF_TO=daniel@kaiyuemacau.com`; `WHATSAPP_NUMBER=+85363128081`; no destination lock; no staging knobs; D1/R2/hosts unchanged.
- `notification-policy.ts`: production staff pin, production lock forbidden, staging refuses Daniel.
- Tests: production overlay, mocked production send path, staging isolation.
- Staging recipient lock and live staging Worker unchanged by this PR.

Independent reviews: overlay vs `official-staging` (`bc-400aa1dc`) **Approve with nits**; vs-`main` (`bc-93ca51ea`) **Approve with nits**. Docs nits applied. CodeRabbit CLI unauthenticated. CI green is not review. Merging to official-staging would not change staging destinations. Uploading the production overlay would send staff to `daniel@kaiyuemacau.com` plus the guest on email-channel bookings.

## Production previews (not submitted)

Rendered with current `renderStaffMessage` / `renderCustomerAck` (`mailSite=production`). Preview token `KY-PRODMAIL01` is **not** a D1 row. Planned unused idempotency `prod-ack-admin-20261120-001`. Request-received ack, **not** a confirmation. Guest destination in the fixture is `guest.ack@example.com` (synthetic, not sent). Parent owns the staging scalingsmb ack+admin native approval pair.

| Message | To | From | Subject |
| --- | --- | --- | --- |
| Staff | `daniel@kaiyuemacau.com` | Kai Yue Travel `<bookings@notify.kaiyuemacau.com>` | `New booking request KY-PRODMAIL01` |
| Customer ack | `guest.ack@example.com` | same | `We received your request KY-PRODMAIL01` |

Files: `preview-messages.json`, `staff.html`, `staff.txt`, `customer-ack.html`, `customer-ack.txt`.

## Staging pair PASS (PM/executor — not this writer)

Record: [`STAGING-PAIR-PASS.md`](STAGING-PAIR-PASS.md). `KY-JWM6M8AT` 201 / `notification_state=sent`; both inbox messages To `scalingsmb@gmail.com` only. Parent-box `delivery-proof.json` SHA256 `b451beea835d3b249c0ad817802bf7b4767a9f9c775584dc5e0df7d2e3638572`. This writer did not POST, send, or read that path.

Staging pair PASS does **not** drop the MCP quote gate, authorize `all PASS`, or authorize production merge/upload.

## Remaining policy gate

10th MCP `send_quote_email` for `KY-PYPM8Y3E` was **never called**. Native quote question stays **SKIPPED/CLOSED**, not waived, not re-asked.

## Deploy order (HOLD until parent explicit operational handoff)

Independent review vs `official-staging` `3a70cff` and `main` `ff119f2c`: **Approve with nits** (applied). PR #61 CI SUCCESS on `22ee115` is not review and is not activation.

Do **not** merge this PR, do **not** merge PR #58, do **not** upload production, until parent says so after legit checks and owner decision.

Then, only if handed off:

1. Merge **this** PR to `official-staging` (not PR #58). Do not merge PR #60 alone.
2. Reviewed PR `official-staging` → `main`.
3. Operator upload `deploy/production/wrangler.jsonc` only (`PUBLIC_SITE_URL=https://kaiyuemacau.com` build). Candidate-view: production D1/R2, EMAIL sender-only, Daniel staff, `NOTIFICATIONS_ENABLED=true`, no staging knobs.
4. Independent CF GET of live `kaiyue-travel`. Rollback version `5eebf7b6`.

## Residuals

- Live production still `"false"` / no `EMAIL`.
- MCP quote 10/10 never called; SKIPPED/CLOSED.
- PR #58 remains OPEN unmerged as the published checkpoint; do not rebase it.
