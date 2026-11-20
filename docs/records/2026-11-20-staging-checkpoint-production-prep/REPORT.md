# Staging deployed checkpoint + production promotion plan

**task_id:** `kaiyue-staging-checkpoint-prod-prep-20261120`  
**Status:** staging `task_verified` for merge + CD + HTTP/security smokes. Not `user_accepted`. Production **not** merged, uploaded, or activated.  
**As-of:** 2026-11-20 10:25 Asia/Macau (mobile Playwright PASS + production mail audit committed; production still HOLD)

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
   - PM desktop (owner/PM, not this writer): EN/PT/zh-Hant home+contact+footers PASS. New WA `85363128081`, office TEL `+85328338882`, QR visible with quiet margin. Plugin plaintext/security no issues except expected 403s. Parent downloaded live QR byte-identical SHA256 `3877f629e7dd6a91f9e644ec06da14fd6c444309d8bbe505a76a8d5138cc67dc`, 774×784.
   - Cloud-VM Playwright mobile: **PASS** (section 8). Complements desktop; does not replace the 10-tool bot or quote-inbox receipt.
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

Dedicated results: [`MOBILE-RESULTS.md`](MOBILE-RESULTS.md) (PASS 2/2, 144×144 / 136×136 QR squares, geometry JSON, version `04d98ae0` / `8ac4fe0e`).

## 8. Live staging mobile Playwright — PASS

Cloud VM, repository Playwright (`@playwright/test` 1.64.1, Chromium 156 headless). Not the PM desktop helper, not a user computer, no DevTools connector workaround. Read-only: no booking submit, no inquiry submit, no WhatsApp click-through, no live business mutations.

| Item | Value |
| --- | --- |
| Result | **PASS** 2/2 in 17.2s (`LIVE_STAGING_E2E=1 pnpm exec playwright test tests/e2e/staging-mobile-contact.spec.ts`) |
| Source | git `04d98ae0b2e3d71f93b5db881affeabbfe327080` |
| Worker | `kaiyue-travel-staging` `8ac4fe0e-b90e-441a-be21-7e3cbdfef7dc` @100% |
| Origin | `https://staging.kaiyuemacau.com/` |
| Viewports | 390×844 and 320×844 |
| Locales | EN, PT, zh-Hant home via language switcher; Contact via footer Company link (localized href) then language switcher |
| Challenge | none — pages loaded; no Cloudflare interstitial |
| Spec | `tests/e2e/staging-mobile-contact.spec.ts` (gated; skipped unless `LIVE_STAGING_E2E=1`) |
| Geometry | `mobile-geometry.json` (computed `getBoundingClientRect` / `naturalWidth`, not source CSS guess) |
| Screenshots | `/opt/cursor/artifacts/kaiyue-staging-mobile-20261120/` (12 full-page PNGs) |

Contact is **not** in the hamburger (desktop primary nav also has no Contact item; Company Contact lives in the footer). The suite therefore uses the live footer Contact path, which HTML rewriter localizes (`/contact` → `/pt/contact` / `/zh-Hant/contact`). Header WhatsApp chip is `display:none` below 1024px by design; `wa.me/85363128081` remains in the DOM. Office `tel:+85328338882` is in the footer. Booking controls were not overlapped by header/footer; sticky `.mobile-book` did not cover the footer QR after `scrollIntoView`.

### Computed geometry (contact page, 2026-11-20T02:19:10Z)

| Check | 390×844 | 320×844 |
| --- | --- | --- |
| `scrollWidth` vs `innerWidth` | 390 = 390 | 320 = 320 |
| Header logo vs lang vs menu overlap | logo x20 w128; lang x239.45 w78.55; menu x326 w44 — no overlap | logo x20 w128; lang x169.45 w78.55; menu x256 w44 — no overlap (8px lang–menu gap) |
| Header chip | `display:none` | `display:none` |
| Page QR natural | 774×784 complete | 774×784 complete |
| Page QR CSS box | 144×144 square, `object-fit:contain`, frame bg `#ffffff`, overflow hidden | same 144×144 |
| Intrinsic aspect | 774/784 = 0.9872448979591837 matches owner ratio | same |
| Footer QR | 136×136 square, contain, 774×784 natural | same |
| Console errors | none | none |
| Mixed content (`http://` requests) | none | none |
| HTML `wa.me/85363128081` | present | present |
| HTML `wa.me/85328338882` | absent | absent |
| HTML `tel:+85328338882` | present | present |

No legitimate layout bug found. No product CSS/HTML change in this addendum.

Dedicated audit (operational path, not “code can ship with mail off”): [`PRODUCTION-MAIL-AUDIT.md`](PRODUCTION-MAIL-AUDIT.md). Live production has no `EMAIL` binding and `NOTIFICATIONS_ENABLED=false` by documented 2026-11-16 fail-closed. After PR #58 overlay upload, staff/customer/quote mail stay **inert**. No documented production `NOTIFY_STAFF_TO`. Do not invent recipients. Do not activate from this PR.

## 9. Production email path (read-only; do not activate)

Branded template **code** is not operational mail. See the dedicated audit. Summary: live production mail is **not** working.

| Fact | Evidence |
| --- | --- |
| Live production Worker | `NOTIFICATIONS_ENABLED=false`; **no** `EMAIL` / `send_email` binding; `WHATSAPP_NUMBER=+85328338882` still (CF script settings GET 2026-11-20) |
| Candidate overlay | `deploy/production/wrangler.jsonc`: mail still `false`, still no `send_email`; WA becomes `+85363128081` |
| `sendNotifications` | returns `skipped` when `resolveMailPolicy` is not ok (`notifications.ts`) |
| Policy enable | requires `NOTIFICATIONS_ENABLED` exact `"true"` **and** `EMAIL.send` **and** `NOTIFY_FROM_EMAIL` + `NOTIFY_STAFF_TO` (`notification-policy.ts`) |
| Site identity | `PUBLIC_SITE_URL` host in `{kaiyuemacau.com, www.kaiyuemacau.com}` — never `ENVIRONMENT` (staging overlay uses `ENVIRONMENT=production`) |
| `sendStagingQuote` | refuses unless `resolveHostRole === "staging-admin"` and staging-quote policy; recipient must equal `policy.staffTo` and the allowlist. **Cannot run on production hosts.** |
| Logo URL | `emailLogoUrl(PUBLIC_SITE_URL)` → production would use `https://kaiyuemacau.com/images/kai-yue-travel-group-logo.png` |
| Subject prefix | `[Staging test] ` only when `mailSite === "staging"` |
| Staging lock | `scalingsmb@gmail.com` is the staging quote/recipient lock, **not** a production staff inbox |
| `daniel@kaiyuemacau.com` | `VERIFIED_PRODUCTION_PRIMARY_EMAIL` — operator identity, **not** an approved mail destination |

Minimum **future** production mail cutover (owner decision, not this run): add a reviewed `send_email` binding on Worker `kaiyue-travel`; set `NOTIFICATIONS_ENABLED=true`; set `NOTIFY_FROM_EMAIL=bookings@notify.kaiyuemacau.com` (verified sending domain already used on staging); set `NOTIFY_STAFF_TO` to an owner-chosen production staff inbox (**do not invent**; do not copy `scalingsmb@gmail.com`; do not assume `daniel@kaiyuemacau.com`). Then a dedicated mail-on review. Do not turn this on as part of the WA/QR/branded-template promote.

Cloudflare Email Sending Domains API from this account token returned 10001 authenticate / 10404 no route — destination list was **not** independently enumerated here. Do not invent recipients from that gap.

## 10. Independent review status and protected main route

Both Cursor `code-reviewer` passes completed. CodeRabbit CLI 0.9.6 remained unauthenticated (`automatic_login_failed`; localhost callback timed out) and did **not** review. GitHub CI green is not the review. Heads reviewed: overlay/docs `c7d5119` (mobile evidence `534ebfe` is docs/e2e only).

| Review | Range | Verdict |
| --- | --- | --- |
| PR #58 overlay | `04d98ae0` … `c7d5119` | **Approve with nits** — no Critical, no Warning, no overlay leak |
| vs-`main` production candidate | `ff119f2c` … `c7d5119` (129 files) | **Approve with nits** — no blockers for upload of `deploy/production/wrangler.jsonc` only |

Nits accepted, not blockers: changelog heading still labeled agent-login `(unmerged)` (fixed in this follow-up); overlay test denylist now also names `NOTIFY_FROM_EMAIL` / `NOTIFY_FROM_NAME`; historical `docs/records/wrangler.production-artifact.jsonc` still has old WA — **do not upload that artifact**.

Operator warnings (procedure, not overlay leaks):

- Build production with `PUBLIC_SITE_URL=https://kaiyuemacau.com`. `/plugin` identity is build-time `site`, not live Host. Do not reuse a staging `dist`.
- Production marketing will serve `/plugin` plaintext with `connection: null` (robots Disallow + noindex already set).
- Production-admin behavior that **does** go live with this code: 3-fail/5-min lockout; booking `approved`/`confirmed`/`denied` mapped to enquiry/cancelled + audit; status PATCH `expectedUpdatedAt` 409.

**Protected main promotion (after all remaining gates PASS):** open a normal GitHub pull request `official-staging` → `main` (precedent PR #45 / merge `ff119f2c`). Do not force-push `main`, do not use an unprotected fast-forward bypass, do not skip the PR record. Owner t308u–t311u is production authority, not peer self-approval. `.github/workflows/production.yml` stays fail-closed / unconnected. After main merge: operator `versions upload` of **only** `deploy/production/wrangler.jsonc` (build with `PUBLIC_SITE_URL=https://kaiyuemacau.com`), candidate-view the inactive version, then `versions deploy VERSION@100%`. Rollback live production version `5eebf7b6-8495-4902-bd1e-bd057aed73cd` @100%. No new migration in this candidate.

## Residuals

- Kai Yue test-all-10-tools and booking→quote **actual inbox** still required before production.
- PR #58 and production remain **unmerged / not uploaded**.
- Live production still serves old WhatsApp until the operator upload.
- Production mail still off. Concrete audit: [`PRODUCTION-MAIL-AUDIT.md`](PRODUCTION-MAIL-AUDIT.md). Missing owner decision: production `NOTIFY_STAFF_TO` and destination policy for guest acks.
- Independent overlay + vs-main reviews: **Approve with nits**. CodeRabbit CLI still unauthenticated (not a completed CodeRabbit review).
- Placeholder `wechat-qr.svg` unused. Not `user_accepted` / not production `released`.
