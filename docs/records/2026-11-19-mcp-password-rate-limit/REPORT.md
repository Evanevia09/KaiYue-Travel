# Staff password sign-in lockout — 2026-11-19

**task_id:** `kaiyue-mcp-password-ratelimit-20261119`  
**Status:** `task_verified` locally (review-ready, unmerged). Not `user_accepted`. Not `released`.  
**As-of:** 2026-11-19 (UTC)

## Request

Owner (Evan), relayed from Mika chat at 20:08 Macau: “yes please add a rate limit make it strict to avoid bruteforce. 3 retry fail will have to wait 5 minute.” Implement and test only. New unmerged follow-up PR from current `official-staging`. No merge, deploy, or hosted writes.

## Starting revision

| Item | Value |
| --- | --- |
| Base | `origin/official-staging` |
| SHA | `2664d32f6715e34a1e90095da6322108f8d7f1d6` (PR #54 squash) |
| Local dirty | none at branch create |
| Branch | `cursor/mcp-password-rate-limit-f58e` |
| Sole writer | this agent |
| Untouched | PRs #51/#52/#53 and their branches, `main`, production workflows, live D1/schema/secrets/Access/mail/hosted |

Independent fetch confirmed `origin/official-staging` still `2664d32`. Open PRs #51, #52, #53 remain on their own heads.

## What changed

Shared durable lockout in `apps/web/src/lib/server/password-attempt.ts`:

- After **three failed** password checks, lock **five minutes**.
- Covers `POST /api/v1/admin/mcp-session` and `POST /api/auth/sign-in/email` with the same hashed buckets (no alternate-route bypass).
- D1 `rate_limits` (existing `0001` table), not memory-only counters. Atomic `INSERT … ON CONFLICT DO UPDATE … WHERE count < 3 OR window expired RETURNING`.
- Normalized email (trim/lower) **and** source IP (`cf-connecting-ip`, else first `X-Forwarded-For` hop, else `unknown`).
- Bucket keys are `signin:acct:<sha256>` / `signin:ip:<sha256>` with `BETTER_AUTH_SECRET`. No raw email, IP, or password in storage.
- Increment **before** password verify so parallel extras cannot exceed three checks. Already-locked requests throw `429` without calling Better Auth and without updating `window_start`.
- Third **failed** attempt returns `429`. Third **successful** attempt after two failures still signs in and clears both buckets.
- Expiry: `window_start` is the lock start (set when count reaches 3). After five minutes the next attempt is treated as the first of a new window.
- Responses: generic `RATE_LIMITED` message; `Retry-After` seconds on `429`. Does not disclose whether the account exists.

Production MCP remains `404` via `assertMcpHost` **before** the lock. Disabled/unprovisioned accounts still fail closed. Write-tool browser approval is unchanged.

## Schema / migrations

| Question | Answer |
| --- | --- |
| New migration file in this PR? | **No.** Adding `0011` would break the official-staging schema contract (disk files must equal attested `0001`–`0010`). |
| Existing table required? | **Yes.** `rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, window_start TEXT NOT NULL)` from `migrations/0001_init.sql`. |
| Live D1 apply authorized? | **No.** Staging/production D1 already have this table if `0001` was applied (it was; schema contract attests `0001`–`0010`). |
| Persist:false test D1 | Tests run `CREATE TABLE IF NOT EXISTS rate_limits …` because wrangler `persist: false` does not load `0001`. |

No secret, Access, mail, hosted, or production change.

## Tests and evidence

Local gates on this branch (pre-review):

- `pnpm lint` — pass
- `pnpm typecheck` — 0 errors, 6 existing hints
- `pnpm test` — **324/324**
- plugin — **6/6**
- `pnpm official-staging:guard` — pass (still 10 attested migrations)
- `PUBLIC_SITE_URL=https://example.invalid pnpm build` — pass

Acceptance coverage:

| Criterion | Evidence |
| --- | --- |
| First 2 failures | `mcp-password-rate-limit.test.ts` — 401, 401 |
| Third triggers lockout | same — 3rd failed MCP call is 429 + Retry-After |
| Correct password blocked during 5 min | 4th call with the real password is 429; session count unchanged (Better Auth not used; 3 “Invalid password” warns, not 4) |
| Expiry restores access | `window_start` backdated past 5 min, then correct password 200 |
| Parallel cannot exceed threshold | 8 concurrent wrong-password MCP calls: ≤2 × 401, ≥6 × 429, stored count = 3 |
| Alternate sign-in route no bypass | MCP lock → `/api/auth/sign-in/email` 429; sign-in lock → MCP 429 |
| Production MCP 404 | still 404 after staging lockout |
| Disabled/unprovisioned fail-closed | existing `mcp-staff-password.test.ts` still pass |
| No raw credentials in storage | unit test asserts buckets are hashes and rows do not contain email/IP/password |
| Account and IP rotation | unit test: account lock holds across IPs; IP lock holds across emails |
| Success reset | two failures then success, next failure is 401 again |

Existing live authentication test is **not** this task and was not run.

## Independent review

Repo has no pstack. CodeRabbit CLI was missing (`CODERABBIT_MISSING`); `coderabbit auth login --agent` is not available in this environment. Independent **read-only** changed-diff review used the permitted `code-reviewer` agent against `2664d32` → working tree. No second writer. No Critical findings. Review-ready for an unmerged PR.

| Severity | Finding | Action |
| --- | --- | --- |
| Important | IP lock still incremented other account buckets (staff lockout DoS) | Fixed: reserve IP first; skip account write when IP reserve returns null |
| Important | Sign-in wrapper was exact pathname only | Fixed: `isPasswordSignInPath` strips trailing slashes |
| Important | `/login` maps every error to “wrong password” | Residual: API `429` is correct; browser copy not in this bounded task |
| Minor | Failures 1–2 expired on the same 5-minute clock | Fixed: 1–2 persist until third failure, success, or later lock expiry |
| Minor | Docs said “HMAC-like” | Fixed: wording is SHA-256 of secret plus email/IP |
| Minor | `peekSignInEmail` had no size cap | Fixed: `JSON_LIMIT_BYTES` |
| Minor | REPORT review slot was empty | This section |

## Residuals

- Live D1 was not queried or altered. Confirm `rate_limits` exists on the target D1 before deploy (expected from `0001`).
- `X-Forwarded-For` is used only when `cf-connecting-ip` is absent; spoofable off Cloudflare.
- Better Auth still logs `WARN Invalid password` for the up-to-three verified failures; that is library logging, not this Worker storing credentials.
- `/login` still shows the generic credentials error on `429`; lockout is enforced on the API.
- First two `/api/auth/sign-in/email` failures return Better Auth’s body; MCP and lockout responses stay generic.
- Merge, deploy, workflow dispatch, and hosted writes remain unauthorized.
- PRs #51/#52/#53, `main`, and production stay untouched.

## Next action

Leave this PR **unmerged**. Owner review, then authorized merge to `official-staging` only. Do not apply schema. Do not deploy from this agent.
