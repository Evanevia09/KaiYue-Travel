# Staging deployed checkpoint + production promotion plan

**task_id:** `kaiyue-staging-checkpoint-prod-prep-20261120`  
**Status:** staging `task_verified` for merge + CD + HTTP/security smokes. Not `user_accepted`. Production **not** merged, uploaded, or activated.  
**As-of:** 2026-11-20 10:00 Asia/Macau

Owner t308u–t311u (20 Nov 09:47–09:48 Macau): merge to staging, then promote to production only after every stage check and the Kai Yue test-bot workflow pass. Premerge branded quote email was already satisfied (CF `message_id` `<szXFo1mWcb26PysdtxMKxdPFNvDLJ7exjMoh@notify.kaiyuemacau.com>`; Gmail `1a1f6a2b076efed7`). This writer did not send another message.

## 1. Continuity

| Item | Value |
| --- | --- |
| Writer | this agent only (`bc-efa1f054`). Other listed agents IDLE. |
| Reviewed PR #57 head | `cc5732982c5c7c60b65c0c0b2054d9f68cbdc2ab` (unchanged vs last-known; no second review) |
| Base at merge | `official-staging` `01cd9576eb75428d7f77ae8feecbbf16d7b3f140` |
| `main` | `ff119f2c18f075fe5103821d6541625d49986b38` (unchanged) |
| Prior local evidence | 346 tests + plugin 9/9; independent changed-diff Approve with nits; GitHub CI [44560209556](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/44560209556) success |
| Held PRs | #51 / #52 / #53 still OPEN; not merged; OAuth not revived |
| Not done | reset, force, autostash, self-approval, production merge/deploy, live booking writes, customer mail, synthetic production records |

## 2. Staging merge and CD

Squash-merge of exact PR #57 to `official-staging` (normal GitHub squash, expected head `cc573298`, no protection bypass).

| Item | Value |
| --- | --- |
| Merge SHA | `04d98ae0b2e3d71f93b5db881affeabbfe327080` |
| Merged at | 2026-11-20T01:50:43Z (09:50:43 Asia/Macau) |
| Message | Combine staging MCP direct writes with branded email, WhatsApp, and WeChat QR |
| CD workflow | [official-staging.yml run 44656548128](https://github.com/Evanevia09/KaiYue-Travel/actions/runs/44656548128) |
| Event | `push` / `official-staging` / head `04d98ae0` |
| Created | 2026-11-20T01:50:46Z |
| Conclusion | **success** 2026-11-20T01:53:54Z (09:53:54 Asia/Macau) |
| Jobs | `refuse-other-refs` skipped; `checks` success (lint/typecheck/test/plugin/build/guard); `upload` success; `verify` success; `activate` success (activate + smoke) |
| GitHub Environment `staging` | upload [7930997600](https://github.com/Evanevia09/KaiYue-Travel/deployments/7930997600) success 01:52:58Z; verify [7931007910](https://github.com/Evanevia09/KaiYue-Travel/deployments/7931007910) success 01:53:28Z; activate [7931015199](https://github.com/Evanevia09/KaiYue-Travel/deployments/7931015199) success 01:53:55Z |

### Live Worker (independent Cloudflare GET after CD)

| Item | Value |
| --- | --- |
| Account | `33ecc75158a1cdd23ba1a62eb70c5103` |
| Worker | `kaiyue-travel-staging` |
| Version | `8ac4fe0e-b90e-441a-be21-7e3cbdfef7dc` (number 25) @ **100%** |
| Uploaded | 2026-11-20T01:52:53.496441Z |
| Deployment | `6023ba11-9c0e-4852-b321-3fc8982aa59a` created 2026-11-20T01:53:47.682689Z |
| Previous staging version | `3193fa03-57b7-44eb-b2ca-b4b4746c3761` (no longer on traffic) |
| Hosts | `https://staging.kaiyuemacau.com`, `https://admin-staging.kaiyuemacau.com` |
| D1 | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` |
| R2 | `kaiyue-offers-staging` |
| Compatibility | `2026-09-01` + `nodejs_compat`; `run_worker_first` true |

Source correspondence: CD checked out `04d98ae0`, uploaded inactive `8ac4fe0e`, candidate-checked overlay bindings, then activated that version. Wrangler version annotations do not store the git SHA (`workers/triggered_by=version_upload` only). The pipeline SHA is the correspondence.

### Live overlay assertions (version `8ac4fe0e` bindings)

Present and exact:

- `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com`
- `ENVIRONMENT=production` (host-role flag; not a mail switch)
- `WHATSAPP_NUMBER=+85363128081`
- `MCP_STAGING_DIRECT_WRITES=true`
- `NOTIFICATIONS_ENABLED=false`
- `STAGING_QUOTE_EMAIL_ENABLED=true`
- `NOTIFY_FROM_EMAIL=bookings@notify.kaiyuemacau.com`
- `NOTIFY_STAFF_TO=scalingsmb@gmail.com`
- `NOTIFY_ALLOWED_RECIPIENTS=scalingsmb@gmail.com`
- `ADMIN_STAGING_TEST_PASSWORD_MIN=6`
- `ADMIN_EMAILS=daniel@kaiyuemacau.com,uat-admin-20261114@kaiyue.test,scalingsmb@gmail.com`
- `EMAIL` send_email allowlist destination `scalingsmb@gmail.com` / sender `bookings@notify.kaiyuemacau.com`
- `BETTER_AUTH_SECRET` present as `secret_text` (name only)
- `DEV_ADMIN_BYPASS=false`

These staging-only knobs must **not** be copied into production.

## 3. HTTP / security smokes (independent, after activation)

Redirects not followed. Honest UA `KaiYue-staging-mcp/1.0` unless noted.

| Check | Result |
| --- | --- |
| `https://staging.kaiyuemacau.com/` | 200 marketing; `wa.me/85363128081`; office `2833 8882`; no `wa.me/85328338882` |
| `https://staging.kaiyuemacau.com/login` | 403 JSON `Admin access is not configured` / `no-store` |
| `https://staging.kaiyuemacau.com/admin` | 403 same gate |
| `https://admin-staging.kaiyuemacau.com/` and `/index.html` | 302 `Location: /login`; `no-store`; `Vary: Host`; not marketing HTML |
| `https://admin-staging.kaiyuemacau.com/login` | 200 `Admin sign in`; `noindex` |
| `https://staging.kaiyuemacau.com/plugin` and `/plugin.txt` | 200 `text/plain; charset=utf-8`; `X-Robots-Tag: noindex, nofollow, noarchive`; write tools “run immediately” |
| `/plugin/capabilities.json` | 200 JSON; ten tools; `connection.writeApproval=none`; Streamable HTTP on admin-staging |
| `GET admin-staging /api/v1/admin/mcp` | 401 `A staging connection token is required` |
| `GET admin-staging /api/v1/admin/mcp-session` | 405 |
| `GET staging.kaiyuemacau.com /api/v1/admin/mcp` | 404 staging MCP unavailable on this host |
| `/images/wechat-qr.jpg` | 200 JPEG 143228 bytes; SHA256 `3877f629e7dd6a91f9e644ec06da14fd6c444309d8bbe505a76a8d5138cc67dc` |
| `/images/kai-yue-travel-group-logo.png` | 200 PNG |
| Contact | 200; QR path + owner WhatsApp |
| CD smoke | `official-staging-smoke.mjs` passed in activate job |

Admin-staging `/plugin` 302 `/login` is expected (plugin is published on the **marketing** host). `Python-urllib/3.13` against admin-staging `/plugin` still hits Cloudflare BIC 403; the BIC exception is MCP paths only.

**Not verified here (PM gates):** authenticated admin UI, browser DevTools, all ten MCP tools, booking persistence, quote send to the live inbox.

## 4. Production is unchanged (this run)

| Item | Value |
| --- | --- |
| Worker | `kaiyue-travel` version `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100% |
| Deployment | `494bc151-3081-4a26-9d1c-40428e0025e3` since 2026-11-16T10:54:51Z |
| Annotation | `production 696c2bd8 / main ff119f2c` |
| D1 | `06cf879d-8fea-4088-8881-7d382e1b8c11` |
| R2 | `kaiyue-offers-production` |
| Mail | `NOTIFICATIONS_ENABLED=false`; **no** `send_email` |
| WhatsApp overlay (live) | `+85328338882` (old office number **still wins** on live production) |
| Staging knobs on live prod | none (`MCP_STAGING_DIRECT_WRITES`, `STAGING_QUOTE_EMAIL_ENABLED`, `NOTIFY_*`, `ADMIN_EMAILS`, `ADMIN_STAGING_TEST_PASSWORD_MIN` absent) |
| Public home | 200; still `wa.me/85328338882`; no `/images/wechat-qr.jpg` |
| Public `/login` | 403 |
| Production `/plugin` | 404 (old runtime) |
| `admin.kaiyuemacau.com` MCP GET | 401 generic admin auth (old runtime; not the staging token message) |
| `.github/workflows/production.yml` | still fail-closed / unconnected |

## 5. Production candidate vs current production

Promote **`official-staging` `04d98ae0` plus the production overlay WhatsApp fix in this follow-up branch**, after PM live checks pass. Do not promote held PRs #51/#52/#53. Do not copy the staging overlay file.

Commits on `official-staging` not on `main` `ff119f2c` (12; 127 files, +9489/−406):

| SHA | Subject |
| --- | --- |
| `04d98ae0` | Combine staging MCP direct writes with branded email, WhatsApp, and WeChat QR (#57) |
| `01cd9576` | Serve staging plugin as plaintext and stop on Cloudflare 1010 (#56) |
| `458fe75a` | Lock staff password sign-in after three failures (#55) |
| `2664d32f` | Let staging MCP authenticate with staff email and password (#54) |
| `c9173c0` | Validate calculated quotes against the send contract |
| `e0a5771` | Host staging agent tools and audited booking actions |
| `18157ba` | Add local Kai Yue Travel staging MCP plugin |
| `a176809` | Native email pickup-time/docs |
| `f7da6d3` | Official staging EMAIL binding (mail stays off) |
| `79d47ae` | Native Cloudflare email; remove Resend |
| `0679e2d` | Agent API search/cursor/OpenAPI |
| `be1d931` | Plan: agent API + native email (staging only) |
| `9121065` | Record production release closeout (docs only) |

Intended production **product** from that range: branded HTML+text emails (code path), WhatsApp enquiry `+85363128081`, office tel unchanged, owner WeChat QR JPEG, plugin plaintext on the marketing host (`connection` null on production hostname), native `EMAIL` code. Staging MCP password login, MCP_STAGING_DIRECT_WRITES, staging quote lock, `ADMIN_EMAILS`, and 6-char staging password min stay **staging-only** via overlay + host/site gates.

### Overlay that must win on promotion

Prepared in this branch (`deploy/production/wrangler.jsonc`):

| Var / binding | Production candidate | Must not leak from staging |
| --- | --- | --- |
| `WHATSAPP_NUMBER` | **`+85363128081`** (was `+85328338882`; live prod still old until operator upload) | — |
| `PUBLIC_SITE_URL` | `https://kaiyuemacau.com` | staging URL |
| `NOTIFICATIONS_ENABLED` | `false` | do not set `true` |
| `send_email` | **absent** | staging allowlist `scalingsmb@gmail.com` |
| `MCP_STAGING_DIRECT_WRITES` | **absent** | `true` |
| `STAGING_QUOTE_EMAIL_ENABLED` | **absent** | `true` |
| `NOTIFY_*` / `ADMIN_EMAILS` / `ADMIN_STAGING_TEST_PASSWORD_MIN` | **absent** | staging test recipients / min 6 |
| D1 / R2 | production IDs only | `043cd0ff` / `kaiyue-offers-staging` |

Auth/roles/lockout/concurrency/idempotency/approval defaults: unchanged. `mcpStagingDirectWritesEnabled` still requires exact `"true"` **and** staging-admin host **and** staging `mailSite` **and** `admin-staging` origin. `sendStagingQuote` refuses non-staging-admin. Production plugin `connection` is `null`.

### EMAIL / notification readiness (report, do not enable)

| Gate | Staging now | Production candidate |
| --- | --- | --- |
| Binding | `EMAIL` locked to `scalingsmb@gmail.com` | **missing** — do not add blindly |
| `NOTIFICATIONS_ENABLED` | `false` (booking staff/ack mail off) | stay `false` |
| Staging quotes | `STAGING_QUOTE_EMAIL_ENABLED=true` + allowlist | n/a; do not copy |
| Subject prefix `[Staging test]` | `prefix("staging")` only | empty on `mailSite==="production"` |
| Logo URL | `https://staging.kaiyuemacau.com/images/kai-yue-travel-group-logo.png` | would be `https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png` from `PUBLIC_SITE_URL` |
| Enabling live mail | not this cutover | needs reviewed sender/destination binding, staff inbox (not the staging lock), and a separate owner mail-on decision |

No production customer mail, no live booking writes, no synthetic production records in this run.

## 6. PM live-test gates (must PASS before any production promote)

Owner t310u/t311u. This writer does not execute the authenticated bot/UI pass.

1. **Browser UI / DevTools / basic security** on deployed staging `04d98ae0` / Worker `8ac4fe0e`: public booking, Contact QR, header WhatsApp, admin-staging login page, no public admin leak, console errors.
2. **Kai Yue test bot — all 10 tools** via `https://staging.kaiyuemacau.com/plugin` then Streamable HTTP `https://admin-staging.kaiyuemacau.com/api/v1/admin/mcp` with honest UA: `list_bookings`, `get_booking`, `list_inquiries`, `get_inquiry`, `list_inventory`, `edit_booking`, `change_booking_status`, `assign_booking`, `draft_quote`, `send_quote_email`. Writes should run without a browser ticket. Auth/roles/lockout/allowlist still apply.
3. **Full booking → quote → actual inbox** persistence to `scalingsmb@gmail.com` only (staging quote lock). Do not send a second premerge preview; this is the bot workflow quote.

If any fail: same writer continues on a task branch + review + staging retest. Do not promote.

## 7. Production promotion sequence (after PM evidence)

Normal repo flow. `.github/workflows/production.yml` stays fail-closed. Last production activation was operator `versions upload` + `@100%` on `deploy/production/wrangler.jsonc`.

1. Merge this overlay/docs PR to `official-staging` (re-triggers staging CD; runtime should match `04d98ae0` plus docs/overlay). Do not merge #51/#52/#53.
2. Fast-forward or reviewed PR `official-staging` → `main` (owner t308u/t309u/t311u is the production auth, not peer approval). Do not bypass protections.
3. Operator on production overlay only: backup/export D1 `06cf879d`; `PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build`; Wrangler 4.132.0 `versions upload --strict --config deploy/production/wrangler.jsonc`; candidate view (production D1/R2, no staging knobs, `WHATSAPP_NUMBER=+85363128081`, mail off, no `send_email`); `versions deploy VERSION@100%`; HTTP smokes on apex/www/`admin.kaiyuemacau.com`.
4. Verify live production WhatsApp is `wa.me/85363128081`, QR JPEG hash, office tel unchanged, `/plugin` plaintext with `connection: null`, MCP 404/fail-closed on production hosts, mail still off.
5. Rollback: previous production version `5eebf7b6` @100%. Schema `0001`–`0010` already on production; this candidate adds **no** migration.

## Residuals

- PM browser + 10-tool + booking→quote inbox not done.
- This docs/overlay PR is **not** merged to `official-staging` in the merge run, so live staging stays `04d98ae0` / `8ac4fe0e` for those tests.
- Live production still serves old WhatsApp until the operator upload.
- Production mail still off; enabling it is a separate reviewed gap.
- Placeholder `wechat-qr.svg` unused. Not `user_accepted` / not production `released`.
