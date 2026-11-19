# Agent login 1010 + plugin plaintext — 2026-11-19

**task_id:** `kaiyue-agent-login-plugin-fix-20261119`  
**Status:** local code review-ready, **unmerged**. Hosted fresh-testbot E2E is **not** `task_verified`. Not `user_accepted`. Not `released`.  
**As-of:** 2026-11-19 (UTC)

The Cloudflare BIC exception below is **operator configuration**, not a claim of this PR’s code. This agent did not apply it.

## Request

Owner t289u 22:14 Macau: start fixing agent login 403, and make `https://staging.kaiyuemacau.com/plugin` agent-oriented with no HTML and no indexing. t290u 22:16: do not stop at a code claim; prove the real workflow after a review-ready candidate. Recovered client metadata plus Cloudflare GraphQL **verify** the 403 cause. Owner 22:27 Macau explicitly approved the narrow BIC exception; operator applied it 22:28:27; testbot then authorized once for JSON login + MCP read-only. This PR still requires tests, independent review, and CI. Do not wait on the testbot to ship the review-ready candidate. One writer. No merge/deploy from this agent.

## Starting revision

| Item | Value |
| --- | --- |
| Base | `origin/official-staging` |
| SHA | `458fe75adb52f5580e38485725fc26726d7dc4ee` (PR #55 squash) |
| Branch | `cursor/agent-login-plugin-fix-f58e` |
| Sole writer | this agent |
| Untouched | PRs #51/#52/#53 and their branches, `main` `ff119f2c`, production workflows, live D1/schema/secrets/Access/mail. This writer did not PATCH/PUT Cloudflare. |

**pstack:** not used. This repository has none.

## Verified 403 cause (no longer a User-Agent hypothesis)

Cloudflare **read-only** zone inspection (this run) plus coordinator GraphQL `httpRequestsAdaptive` on official Kai Yue account `33ecc75158a1cdd23ba1a62eb70c5103` zone `fb84210cb8175ff4412b444805e1a6a5`:

| Time (from GraphQL) | Ray | Path | Status | Source / action | User-Agent |
| --- | --- | --- | --- | --- | --- |
| 22:08:23 | `a5cfc9652fbb7c97` | staging MCP session POST | 403 | `bic` / block | `Python-urllib/3.13` |
| 22:11:43 | `a5cfce47dbc574d1` | staging MCP session POST | 403 | `bic` / block | `Python-urllib/3.13` |
| 21:21:10 | (PM success, same path) | staging MCP session POST | 200 | Worker | `KaiYue-staging-mcp-auth-test/1.0` |

Zone settings before the operator rule (GET, this writer, earlier this run): `browser_check` **on** (default), `security_level` **medium**. No custom firewall entrypoint, no configuration-rules entrypoint, no rate-limiting entrypoint, no UA blocking rules, no zone lockdowns. Security Events REST `/security/events` is not available on this zone (`10404`). Cloudflare docs note BIC blocks may not appear in zone Security Events.

Client reconstruction from the failed testbot (not a server field): both POSTs used Python `urllib.request`; explicit headers were only `Accept: application/json` and `Content-Type: application/json`; **no** `User-Agent` header; **no** `Origin`. That matches the inferred default `Python-urllib/3.13` now seen on the rays. First 403 body was discarded by the client; second parsed error 1010.

This agent did **not** retry credentials, spoof a browser User-Agent, rotate IPs, or apply Cloudflare writes.

## Operator BIC exception (owner-approved, applied — not this PR)

Owner explicit approval 22:27 Macau. Applied/readback 22:28:27 (`last_updated` `2026-11-19T14:28:27.210982Z`). Independent GET by this writer after apply: [config-rule-readback.json](config-rule-readback.json). Coordinator cited inspector box files `/tmp/kaiyue-bic-config-rule-before.json` and `/tmp/kaiyue-bic-config-rule-after.json`; those paths were not present on this writer VM.

| Field | Value |
| --- | --- |
| Account | `33ecc75158a1cdd23ba1a62eb70c5103` |
| Zone | `fb84210cb8175ff4412b444805e1a6a5` |
| Ruleset | `a8eec7c4fb8b4dfcba60c80255ec28fc` (`http_config_settings`, kind `zone`, name `Kai Yue configuration rules`, version `1`) |
| Rule | `40c580d7c4f747dd838ddb380ca534af` |
| Ref | `staging_mcp_bic_off` |
| Enabled | true |
| Action | `set_config` `bic: false` **only** |
| Expression | `(http.host eq "admin-staging.kaiyuemacau.com" and http.request.uri.path in {"/api/v1/admin/mcp-session" "/api/v1/admin/mcp-session/" "/api/v1/admin/mcp" "/api/v1/admin/mcp/"})` |

Unchanged after apply (GET, this writer): zone `browser_check` **on**; `security_level` **medium**; custom firewall entrypoint **404**; rate-limit entrypoint **404**; managed sanitize / managed WAF / DDoS L7 still listed. No production host in the expression. No `/login`. No other product skip.

### Operator probe after apply (no credentials)

Coordinator/inspector, default urllib, no auth:

| Probe | Time | Result | Meaning |
| --- | --- | --- | --- |
| `GET` `/api/v1/admin/mcp-session` | 22:29:46 | HTTP **405**, `Allow: POST`, `cf-ray` `a5cfe8b49c61ef68-IAD` | Request reached the Worker. Not error 1010. |
| `POST` empty body, no `Content-Type` | (same probe set) | HTTP **403** plain `Cross-site POST form submissions are forbidden` | Expected Astro `checkOrigin` form CSRF. Not error 1010. |

That is edge-reachability evidence, not a login, and not `task_verified` for the MCP workflow.

### Rollback (operator only)

Disable or delete **that one** configuration rule `40c580d7c4f747dd838ddb380ca534af` in ruleset `a8eec7c4fb8b4dfcba60c80255ec28fc`. Leave zone `browser_check` on. Do not change `security_level`. Do not touch production hosts. Worker rollback for a later deploy of this PR remains previous staging version `90686653`.

## Code / docs fix in this PR

- `/plugin` and `/plugin.txt` return `text/plain; charset=utf-8` with `X-Robots-Tag: noindex, nofollow, noarchive`. Canonical `Link: </plugin.txt>`. HTML page removed. Public file, not an AI-only security boundary.
- `/plugin/capabilities.json` stays machine-readable and matches the text (honest User-Agent, 1800s token, failure map). Served dynamically (`prerender = false`) so host and headers match `/plugin`.
- `robots.txt` disallows `/plugin`; sitemap filter excludes `/plugin`.
- Clients must send an honest application User-Agent (`KaiYue-staging-mcp/1.0` or `ClientName/version`). Do **not** impersonate a browser.
- Failure copy: `401` stop; `429` wait five minutes; `403`/`1010` stop and contact owner.
- Local plugin sets that User-Agent and maps 1010/401/429 to stop errors.
- Password permissions, 3-fail/5-min shared D1 lock, disabled fail-closed, production MCP 404, and write-tool browser approval are unchanged.

## Production vs staging (no invented equivalence)

| Item | Staging (live, this inspection) | Production (live, this inspection) |
| --- | --- | --- |
| Git | `official-staging` `458fe75` (PR #55) | `main` `ff119f2c` |
| Worker | `kaiyue-travel-staging` version `90686653` @100% since 2026-11-19 13:06:16Z | `kaiyue-travel` version `5eebf7b6` @100% since 2026-11-16 10:54:51Z (`ff119f2c`) |
| MCP session | Present in staging source; host-gated to `admin-staging` | Source on `main` does not include PR #54/#55; production MCP stays closed |
| Zone BIC | Same zone `kaiyuemacau.com`, `browser_check` on; one staging-admin MCP-path config rule | Same zone `browser_check`; production hostnames are not in the skip |
| CD | `.github/workflows/official-staging.yml` auto on that branch | `.github/workflows/production.yml` fail-closed, no credentials |

Hosted staging E2E of **this** PR’s `/plugin` plaintext requires authorized merge/deploy. Production deploy is not authorized.

## Hosted evidence already on current staging (PR #55), not this PR

Coordinator-supplied, sanitized, no secrets: CD run `44529572542` SUCCESS 21:06:24; synthetic lockout 401, 401, 429 `Retry-After` 300, cross-route 429, decreasing expiry, then 401; 21:21 real login 200, 10 tools, inventory 200 with honest UA `KaiYue-staging-mcp-auth-test/1.0`. Existing live auth is not re-run here.

## Remaining hosted E2E (testbot authorized once; this PR does not wait)

Owner-authorized fresh Kai Yue testbot, no PM token reuse, no browser-login shortcut, no Origin, no UA spoof, stop on failure:

1. `GET https://staging.kaiyuemacau.com/plugin` → `text/plain`, noindex, no HTML. **Blocked on merge/deploy of this PR.**
2. Secure password input → env / secret field (not a browser vault injection).
3. `POST /api/v1/admin/mcp-session` with JSON `{email,password}`, `Content-Type: application/json`, honest `User-Agent: KaiYue-staging-mcp/1.0` (or the bot’s own `Name/version`). No Origin. No browser UA.
4. Streamable HTTP `initialize` → `tools/list` → one read call (`list_inventory` or `list_bookings`).
5. On 401/429/1010: stop as documented. Do not brute-retry.

This writer is **not** waiting for that result before opening the unmerged PR. Hosted workflow remains not `task_verified`.

## Local verification (this tree)

- `pnpm lint`
- `pnpm typecheck` 0 errors (6 existing hints, unchanged files)
- `pnpm test` 332/332
- plugin `node --test` 8/8 (password POST STOP on 1010/401/429)
- `pnpm official-staging:guard`
- `PUBLIC_SITE_URL=https://example.invalid pnpm build` — sitemap has no `/plugin`; `dist/client/robots.txt` has `Disallow: /plugin`; `/plugin` is Worker-served, not prerendered HTML

## Independent review

`code-reviewer` changed-diff vs `458fe75` (Comment, then Approve after the residual closed). CodeRabbit CLI 0.9.6 `coderabbit auth login --agent` ended `automatic_login_failed` / `authentication_failed` (“Automatic login timed out. The localhost callback is no longer available.”). No pstack in this repo. GitHub CI green is not a code review.

| Severity | Finding | Disposition |
| --- | --- | --- |
| Critical | none | — |
| Important | Local plugin `openSession` discarded the password-POST body and threw generic `Staging staff sign-in failed`, so 401/429/1010 did not STOP | Closed: `stagingResponseError` on `!response.ok` before cancel; plugin test asserts one attempt and STOP copy for 403 HTML 1010, 401, and 429 |
| Suggestion | Cookie `curl` omitted honest User-Agent | Closed in `docs/13-agent-api.md` |
| Suggestion | `Disallow: /plugin` is a prefix match | Left as-is (intended for `/plugin.txt` and `/plugin/capabilities.json`) |
| Suggestion | 401/429 helper copy is login-oriented if reused for inner admin failures | Not changed; `authenticatedRequest` still retries a 401 session once before that helper |

Production isolation, honest UA, plaintext `/plugin`/noindex, and 1010-vs-Worker-JSON-403 detection were confirmed. Hosted testbot E2E is not a code-review substitute.

## Next action

Leave the PR **unmerged**. Do not deploy from this agent. Do not change the BIC rule from this agent. Testbot result is separate and does not make this code `task_verified`.
