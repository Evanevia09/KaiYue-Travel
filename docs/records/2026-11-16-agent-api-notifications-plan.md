# Agent API + native email notifications — approved design and implementation plan

**task_id:** `kaiyue-agent-api-20261116` · **Branch:** `cursor/agent-api-notifications-a72c` from PR #46 docs checkpoint `91210655` (runtime = `main` = `official-staging` = `ff119f2c`).
**Approval:** owner 19:32 (design accepted; staging test inbox supplied). Staging only. No production, `main`, Access, API keys, MCP, new roles, or new provider.
**Status:** `plan`. Production mail stays off. No real email is sent until PM delivers an approved send card.

**Goal:** an AI agent can find and act on bookings and inquiries with an existing admin account, and booking and inquiry emails go out through Cloudflare Email Sending, staged with every message locked to the approved test inbox.

**Architecture:** reuse Better Auth email/password sessions and the existing `/api/v1/admin/*` routes. Add only list search (`q`, `updatedSince`), an OpenAPI file and an agent guide. Replace the unused Resend call with native `send_email` bindings on the existing Worker. Bookings and inquiries are persisted first. A recipient allowlist is enforced in code, and the binding restriction enforces it in Cloudflare.

**Tech stack:** Astro 7 + `@astrojs/cloudflare` on Workers, D1, Better Auth 1.7.5, Wrangler 4.132.0, Vitest.

## Global constraints

- Auth is existing Better Auth admin credentials on admin hosts only, with the same operator roles and same-origin checks. No API key, no query-string password, no direct D1, no auth on marketing hosts.
- Writes stay exactly the existing routes, gated by role. Every status change keeps its audit event.
- Email uses Cloudflare Email Sending only, on account `33ecc75158a1cdd23ba1a62eb70c5103`. The sender is `Kai Yue Travel <bookings@notify.kaiyuemacau.com>`. Apex Google mail and MX are unchanged, and Email Routing is not used.
- Staging recipients are only `scalingsmb@gmail.com`, for both staff and customer acknowledgement fixtures. They are enforced in code (`NOTIFY_ALLOWED_RECIPIENTS`) and by the binding (`allowed_destination_addresses`).
- The customer email is an acknowledgement only ("request received, reference X, not yet confirmed"). There is no booking confirmation.
- `NOTIFICATIONS_ENABLED` stays `"false"` on staging until onboarding and the recipient lock are verified. Production stays `"false"`, and the production overlay is unchanged.
- No real send (including integration tests or verification triggers) until PM supplies the approved send card.

## Part A — Agent API

Files: `apps/web/src/lib/server/list-query.ts` (new: `q`/`updatedSince`/cursor validation), `bookings.ts` (`listBookings`), `contacts.ts` (`listContacts`), `admin.ts` (handlers), `docs/api/admin-agent-v1.openapi.yaml` (new), `docs/13-agent-api.md` (new), `docs/05-data-model-and-api.md`.

- [ ] A1 test-first: `q` must be 2–100 characters after trimming, otherwise 422. It matches reference, name, email, phone, phone display (and company for inquiries) case-insensitively with LIKE wildcards escaped. `updatedSince` accepts an ISO 8601 datetime with a zone, normalised to UTC, otherwise 422. Filters combine with the existing ones.
- [ ] A2 pagination: bookings keep the `(pickup_at, id)` cursor. Inquiries move to an opaque `(created_at, id)` cursor so ties are stable. Totals are unchanged.
- [ ] A3 auth regression: staff can list and search, Users stays 403, disabled or revoked sessions get 401, marketing hosts get 403. These go through existing `handleApi` tests.
- [ ] A4 OpenAPI 3.1 plus the guide. The sign-in flow uses `POST /api/auth/sign-in/email` with `Origin`, a cookie session, re-sign-in on 401, and `POST /api/auth/sign-out`. A test asserts every OpenAPI path exists in `router.ts`.

## Part B — Native email notifications

Files: `apps/web/src/lib/server/notifications.ts` (orchestration and state), `notification-policy.ts` (new: enable, binding and allowlist gate), `notification-templates.ts` (new: staff and customer text/HTML, en/pt/zh-Hant acknowledgement), `bookings.ts` and `contacts.ts` call sites, `env.ts`, `env.d.ts`, `deploy/official-staging/constants.json` with the generated overlay and candidate check, `apps/web/package.json` (drop `resend`), `.env.example`, `apps/web/wrangler.jsonc`.

- [ ] B1 policy, test-first. Skip when `NOTIFICATIONS_ENABLED !== "true"` or a binding or sender is missing. On any non-production site, `NOTIFY_ALLOWED_RECIPIENTS` must be non-empty. Every recipient must be in it, otherwise that message is not sent. On staging a missing allowlist means skip; on production a missing staff recipient means failed.
- [ ] B2 templates: escaped HTML plus text. The staff email keeps the current details and `replyTo` = guest. The customer email has reference, service, pickup and time plus a "not a confirmation" line, has no internal data, and is localised.
- [ ] B3 send through `EMAIL_STAFF` (staff) and `EMAIL_CUSTOMER` (acknowledgement). Bookings: email channel only. Inquiries: every create, with the acknowledgement only when an email was given. State is `sent`, `partial`, `failed` or `skipped`. A thrown binding error is recorded by code, and D1 is never rolled back. An idempotent replay doesn't send again.
- [ ] B4 staging overlay: `send_email` bindings with `allowed_destination_addresses: ["scalingsmb@gmail.com"]`, plus vars `NOTIFY_FROM_EMAIL`, `NOTIFY_FROM_NAME`, `NOTIFY_STAFF_TO`, `NOTIFY_ALLOWED_RECIPIENTS` and `NOTIFICATIONS_ENABLED="false"`. The candidate check requires those bindings and vars and refuses any non-allowlisted staging recipient. A guard test fails if the staging allowlist loosens. Production overlay unchanged.
- [ ] B5 fixtures for the send card: one staff payload and one customer acknowledgement payload (synthetic, test inbox only), rendered by the real templates and recorded in the stage record. They aren't sent until approved.

## Verification and promotion

- [ ] Focused tests, then `pnpm lint`, `pnpm typecheck`, `pnpm test` and a staging build.
- [ ] Independent review by PM, then promotion through the existing official-staging gates (upload, candidate check, activate). Then synthetic staging API checks: sign-in, search, `updatedSince`, Users 403 for staff. Then PM browser checks.
- [ ] Enabling staging mail (`NOTIFICATIONS_ENABLED="true"`) needs ops to confirm Email Sending for `notify.kaiyuemacau.com` on `33ecc` and needs the approved send card. Each approved message is sent once.
