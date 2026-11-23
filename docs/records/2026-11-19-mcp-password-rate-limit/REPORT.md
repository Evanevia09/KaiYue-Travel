# Staff password sign-in lockout — 2026-11-19

**task_id:** `kaiyue-mcp-password-ratelimit-20261119`  
**Status:** `task_verified` locally (review-ready, unmerged). Not `user_accepted`. Not `released`.  
**As-of:** 2026-11-19 (UTC)

## Request

Owner (Evan), relayed from Mika chat at 20:08 Macau: “yes please add a rate limit make it strict to avoid bruteforce. 3 retry fail will have to wait 5 minute.” Implement and test only. Unmerged follow-up PR from current `official-staging`. No merge, deploy, or hosted writes.

Delivery follow-up: close the Important `/login` 429→wrong-password residual; uniform external auth failure for wrong/unknown/disabled/unprovisioned; hosted Cloudflare must not trust client `X-Forwarded-For` when `CF-Connecting-IP` is absent.

## Starting revision

| Item | Value |
| --- | --- |
| Base | `origin/official-staging` |
| SHA | `2664d32f6715e34a1e90095da6322108f8d7f1d6` (PR #54 squash) |
| Branch | `cursor/mcp-password-rate-limit-f58e` |
| PR | https://github.com/Evanevia09/KaiYue-Travel/pull/55 (unmerged) |
| Sole writer | this agent |
| Untouched | PRs #51/#52/#53 and their branches, `main`, production workflows, live D1/schema/secrets/Access/mail/hosted |

## What changed

Shared durable lockout in `apps/web/src/lib/server/password-attempt.ts`:

- After **three failed** password checks, lock **five minutes**.
- Covers `POST /api/v1/admin/mcp-session` and `POST /api/auth/sign-in/email` with the same hashed buckets.
- D1 `rate_limits` (existing `0001` table). Atomic upsert; locked requests do not verify the password or extend `window_start`.
- Normalized email **and** source IP. Hosted Cloudflare uses `CF-Connecting-IP` only. If that header is absent, the IP bucket is `untrusted` (client `X-Forwarded-For` is ignored). Local/test exception: hostname `localhost` / `127.0.0.1` / `::1` may use the first `X-Forwarded-For` hop. `.workers.dev` and other non-loopback hosts never trust client XFF, including `ENVIRONMENT=development`.
- Wrong, unknown, disabled, and unprovisioned attempts return the same generic `401` (`PASSWORD_SIGNIN_FAILED`). No Set-Cookie on those HTTP failures.
- `/login` maps `429` / `RATE_LIMITED` to generic “wait {minutes} minutes” copy from `Retry-After` (default 5). It does not say the password is wrong and does not say whether the account exists.

Production MCP remains `404` via `assertMcpHost` **before** the lock. Write-tool browser approval is unchanged.

## Schema / migrations

| Question | Answer |
| --- | --- |
| New migration file in this PR? | **No.** `0011` would break the official-staging schema contract (disk = attested `0001`–`0010`). |
| Existing table required? | **Yes.** `rate_limits` from `migrations/0001_init.sql`. |
| Live D1 apply authorized? | **No.** |

## Tests and evidence

Local gates (this increment):

- `pnpm lint` — pass
- `pnpm typecheck` — 0 errors, 6 existing hints
- `pnpm test` — **327/327** (re-run after this increment)
- plugin — **6/6** (`node --test plugins/kaiyue-travel-staging/server.test.mjs`)
- `pnpm official-staging:guard` — pass (10 attested migrations)
- `PUBLIC_SITE_URL=https://example.invalid pnpm build` — pass

| Criterion | Evidence |
| --- | --- |
| First 2 failures, third lockout | `mcp-password-rate-limit.test.ts` |
| Correct password blocked during 5 min | 4th MCP call 429; session count unchanged |
| Expiry / success-reset / parallel / alt-route | same file |
| `/login` 429 copy | `login-form-error.test.ts` — 429 → “wait 5 minutes”; 120s → 2 minutes zh-Hant; 60s → “1 minute” EN; 401 credentials copy stays generic; no existence language |
| Uniform 401 | same integration file — wrong, unknown, disabled, unprovisioned; MCP and `/api/auth/sign-in/email`; identical `{ code: UNAUTHORIZED, message }`; no session cookie; existence-language scan on both bodies |
| Hosted IP fail-closed | `password-attempt.test.ts` — staging-admin without `CF-Connecting-IP` + XFF → `untrusted`; `CF-Connecting-IP` wins; localhost may use first XFF hop; local-role `.workers.dev` + XFF → not trusted |
| Production MCP 404 / fail-closed | existing MCP tests still pass |

Existing live authentication test is **not** this task and was not run.

## Independent review (provenance)

**pstack:** not used. This repository has no pstack config, adapter, or check script. The packet required documenting that absence; `docs/11-codex-workflow-adapter.md` is the Codex adapter only.

**CodeRabbit CLI:** not the review engine. CLI 0.9.6 was present; `coderabbit auth login --agent` failed with `automatic_login_failed` (localhost callback timed out). No authenticated CodeRabbit report exists for this increment.

**What was used:** Cursor `code-reviewer` subagent, read-only, no second writer, against the working tree vs `2664d32` (including uncommitted follow-up). Source inspection included `@better-fetch/fetch` 1.3.2 error/`onResponse` shape. **GitHub CI green and 327/327 tests are not a code review.**

Findings from the first review (vs `2664d32`, before `/login` copy): no Critical. Important `/login` 429→wrong-password residual was then open. IP-first reserve and trailing-slash sign-in wrapping were already fixed before commit `2485cf16`.

This increment’s independent review (working tree vs `2664d32`, after `/login` copy, uniform 401, hosted XFF, loopback-only XFF exception): **no Critical, no remaining Important.** Previous Important `/login` residual **closed**. HTTP account-existence leak **closed**. Hosted XFF fail-closed **holds**, including `.workers.dev` / `ENVIRONMENT=development` unless the hostname is loopback. Minor items applied before this commit: wrap only `UNAUTHORIZED`/`FORBIDDEN`; trust XFF only on loopback local hosts; singular “1 minute” copy; scan both MCP and sign-in bodies. `2485cf16` alone still had the Important `/login` residual; PR #55 must include this commit.

## Residuals (severity)

| Severity | Residual | Evidence |
| --- | --- | --- |
| Important | **Closed.** `/login` mapped 429 to wrong-password copy | `LoginForm.tsx` uses `loginFormErrorMessage`; tests in `login-form-error.test.ts` |
| Important | **Closed.** First two Better Auth HTTP bodies could differ for unknown vs wrong password | Worker now replaces non-OK Better Auth responses with generic `401 PASSWORD_SIGNIN_FAILED`. Disabled/unprovisioned after a valid password also return that 401 without Set-Cookie. Integration test compares four cases on both routes |
| Info | Better Auth still prints `WARN Invalid password` vs `WARN User not found` on the Worker console for the up-to-three verified attempts | Observed in vitest stderr. Not in HTTP bodies, storage, or `/login` copy. Not this Worker’s logs |
| Info | Correct password for a disabled/unprovisioned operator can leave a Better Auth session row in D1 | HTTP has no `Set-Cookie`; the row expires. External auth failure remains generic 401 |
| Info | `/login` lockout mapping is unit-tested, not browser-exercised against a live Better Auth client | `login-form-error.test.ts` plus `LoginForm` `fetchOptions.onResponse`; wiring matches better-fetch 1.3.2 (`status` + `onResponse` before ok/error split) |
| Info | `clientIp()` in `http.ts` still falls back to `X-Forwarded-For` | Used only for public booking/contact throttles, not this password lockout |
| Info | Live D1 not queried | Table expected from `0001`; apply not authorized |
| Info | Merge/deploy/hosted writes unauthorized | PR #55 stays unmerged |

No open Important findings in this Worker’s external auth responses or `/login` copy.

## Next action

Leave PR #55 **unmerged**. Owner review, then authorized merge to `official-staging` only. Do not apply schema. Do not deploy from this agent.
