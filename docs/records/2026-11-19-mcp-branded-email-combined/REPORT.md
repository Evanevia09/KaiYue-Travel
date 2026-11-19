# Combined staging candidate — MCP direct writes + branded email / WhatsApp / WeChat QR

**task_id:** `kaiyue-mcp-branded-email-combined-20261119`  
**Status:** `task_verified` locally (review-ready, unmerged). Not `user_accepted`. Not `released`.  
**As-of:** 2026-11-19 (UTC)

## Request

Owner t307u 19 Nov 23:34 Macau: put staging MCP per-action approval removal **and** approved branded-email / WhatsApp / WeChat scope in **one** merge to staging. Sole writer. No production/`main`. No PRs #51/#52/#53. Do not merge or deploy a separate gatefix. Premerge finished-template test email to Evan is **PM-owned** via Cloudflare REST; this writer does not send mail or activate the unmerged Worker.

Owner design approval: 23:29 Macau.

## Starting revision

| Item | Value |
| --- | --- |
| Base | `origin/official-staging` |
| SHA | `01cd9576eb75428d7f77ae8feecbbf16d7b3f140` |
| Branch | `cursor/mcp-staging-direct-writes-f58e` |
| Continuity | HEAD was already `01cd9576`; in-flight work retained; no reset, force, or autostash |
| Sole writer | this agent |
| Untouched | PRs #51/#52/#53 and their branches, `main`, production overlay/workflows, live D1/schema/secrets/Access/mail/hosted |

## What changed

### Staging MCP direct writes

Server-owned overlay policy `MCP_STAGING_DIRECT_WRITES=true` on official staging, plus trusted `admin-staging.kaiyuemacau.com` host and staging `PUBLIC_SITE_URL`. Then authenticated write tools (`edit_booking`, `change_booking_status`, `assign_booking`, `send_quote_email`) skip browser-review tickets.

Fail-closed otherwise. `ENVIRONMENT` is ignored (official staging uses `"production"`). Headers, query strings, and body flags cannot enable the skip. Production overlay does not set the var. Password, roles, disabled-account denial, 3-fail/5-min lockout, stale `expectedUpdatedAt`, idempotency, schema validation, and the quote-inbox allowlist still apply.

Plugin 0.4.0 and `/plugin` / capabilities JSON document `writeApproval: none` on this staging Worker.

### Branded email

Shared HTML table shell (`#008c5e` / `#f3a600`) for:

- staging quotation (`renderQuoteEmail` on the real `sendStagingQuote` path)
- staff booking/inquiry notices
- localized customer acknowledgements (`en` / `pt` / `zh-Hant`)

HTTPS logo: `https://staging.kaiyuemacau.com/images/kai-yue-travel-group-logo.png` (existing PNG 1500×294, email wordmark 250×49). Plaintext fallbacks. HTML escaping. Empty optional fields omitted. No WeChat QR in email. No new framework.

### WhatsApp

Owner number **+853 6312 8081** for header/general enquiry and form redirects. Office telephone **+853 2833 8882** unchanged. WhatsApp channel returns `wa.me/85363128081?text=` with locale labels and known submitted fields only. Email channel does not return or open WhatsApp.

Staging overlay `WHATSAPP_NUMBER=+85363128081`. Production overlay remains `+85328338882`.

### WeChat QR

Owner JPEG bytes SHA256 `3877f629e7dd6a91f9e644ec06da14fd6c444309d8bbe505a76a8d5138cc67dc` at `apps/web/public/images/wechat-qr.jpg` (774×784, original bytes, not regenerated). Contact and footer. Coming-soon overlay removed. Square white frame, `object-fit: contain`. Alt: `WeChat QR code`.

## Schema / migrations

| Question | Answer |
| --- | --- |
| New migration file in this PR? | **No.** |
| Live D1 apply authorized? | **No.** |

## Tests and evidence

- `pnpm lint` — pass
- `pnpm typecheck` — 0 errors, 6 existing hints
- `pnpm test` — **346/346**
- plugin — **9/9**
- `pnpm official-staging:guard` — pass
- `PUBLIC_SITE_URL=https://example.invalid pnpm build` — pass

Independent review of the changed diff vs `01cd9576` (Cursor `code-reviewer`; CodeRabbit CLI 0.9.6 present, `automatic_login_failed`): **Approve with nits**. No Critical, no Important. Minor logo ratio applied (250×49). Placeholder SVG and unused “coming soon” translation keys left in place. GitHub CI is not a code review.

## Premerge email (PM-owned — not sent by this writer)

Official REST: `POST /accounts/33ecc75158a1cdd23ba1a62eb70c5103/email/sending/send`  
From: `bookings@notify.kaiyuemacau.com` / `Kai Yue Travel`  
To: **only** `scalingsmb@gmail.com`  
Docs: https://developers.cloudflare.com/email-service/api/send-emails/rest-api/

Artifacts: `/opt/cursor/artifacts/kaiyue-email-previews-20261119/` (HTML+text per template/locale, sanitized JSON payload, hashes). Logo is the live public PNG URL; no Worker activation, merge, new key, or config change is required for this test. No idempotency API — do not blind-retry.

## Staging rollout checklist (after PM email + owner merge)

1. Confirm Evan received the premerge test message and accepts the template.
2. Merge this PR to `official-staging` only (not `main`).
3. Let official-staging CD upload the overlay (`MCP_STAGING_DIRECT_WRITES=true`, `WHATSAPP_NUMBER=+85363128081`, mail still off except staging quote lock).
4. Confirm production Worker/overlay unchanged (`WHATSAPP_NUMBER=+85328338882`, no `MCP_STAGING_DIRECT_WRITES`).
5. Staging-admin MCP: authenticated staff write without a browser ticket; unauthenticated / wrong-role / lockout still deny.
6. Public staging: header WhatsApp `wa.me/85363128081`; office `tel:+85328338882`; Contact+footer scan the owner JPEG; email booking does not open WhatsApp.
7. Do not enable `NOTIFICATIONS_ENABLED` or production mail in this change.

## Residuals

- Premerge test email not sent (PM).
- Hosted MCP / plugin / QR / WhatsApp not verified on live staging (not deployed).
- Placeholder `wechat-qr.svg` still in `public/images` (unused).
- Unused “WeChat QR – coming soon” translation keys remain.
- Not `user_accepted` / not `released`.
