# Kai Yue application MCP Code Mode — feasibility / baseline (no pilot code)

**task_id:** `kaiyue-codemode-benchmark-20261122`  
**Authority:** Evan via Mika chat, 22 Nov 2026 15:09 Asia/Macau. Assessment + measurement preparation only. **No** merge, deploy, hosted rollout, production MCP, access expansion, or pilot implementation in this first run.  
**Not this task:** owner t328u (20 Nov 14:37) lifecycle test-email permission. Do not conflate.

**Returns:** through PM/Mika. This writer does not publish Agent Lab queue events or write the vault.

---

## 1. Checkpoint (fresh)

| Item | Verified |
| --- | --- |
| Writer | Sole RUNNING cloud agent `bc-efa1f054-1bf7-5417-ae29-f3d6e04df58e`. No other RUNNING writer on this repo. Held Codex PRs #49/#51 exist; not taken over |
| This branch | `cursor/codemode-benchmark-f58e` from `origin/official-staging` `3a70cffca8ff6a8cc4b0a6d4958db7375c7d2fd2` |
| Default `main` | `ff119f2c18f075fe5103821d6541625d49986b38` |
| Email/release preserved | PR #62 `106a2177f878cf32e3dd7195e967782c813c3d6f`; PR #61 `f774f69a5316a08af00e231f87588abdde0580ff`; PR #58 `b0f9f40`. No reset/rebase/force/autostash |
| Held | PRs #51–#53 untouched |
| Agent Lab `main` (read-only) | `70ca2c416dade0774a5942c57d10b9f1a505230f` (commit 2026-10-26T00:15:03Z). Start/close + pointers + producer protocol read. No vault writes |
| Docs as-of | Cloudflare Code Mode overview last updated **2026-06-24**; Build a Code Mode MCP server last updated **2026-10-27**. Scraped 2026-11-22 (request ids `f04163e1-7c38-4c2f-9087-0ed97d7ae00f`, `2690787e-a82a-4c8b-a820-fccae2a4b4a2`) |

---

## 2. Official Code Mode facts (Kai Yue application MCP, not CF infra MCP)

Code Mode is **experimental** and may break. Models write JavaScript; an isolated Dynamic Worker runs it; credentials/env stay off the model. Docs contrast:

| Pattern | Use when |
| --- | --- |
| Direct tool calls | Simple tasks, **small known tool set** |
| Code Mode | Composition, large catalogs, loops, discovery |

MCP **server** patterns (`codeMcpServer` vs `openApiMcpServer`):

| Pattern | Tools | When |
| --- | --- | --- |
| Wrap existing MCP | one `code` tool; types in the description | Existing MCP with a **manageable** set |
| Search + execute | `search` + `execute` over OpenAPI | **Large** API whose full schema should stay out of context |

Install (docs): `@cloudflare/codemode`, `agents`, `@modelcontextprotocol/sdk`, `zod`. Needs **Worker Loader** binding `LOADER`, `nodejs_compat`, example `compatibility_date` **2026-10-27**. Both helpers return **SDK v1** servers via `createLegacyMcpHandler`.

Registry as of this run (not installed): `@cloudflare/codemode` **0.5.6**, `agents` **0.34.0**.

**Security (docs, non-negotiable for Kai Yue):**

- `codeMcpServer()` **does not** provide durable approval for each upstream call; it runs handlers **inside** the outer `code` tool.
- `openApiMcpServer()` **does not** provide durable approval for each request inside `execute`.
- Sandbox blocks direct `fetch()` / `connect()` by default (`globalOutbound` null). Code execution **does not replace authorization**. Per-operation approval stays in **upstream handlers** (or the host request callback). Credentials must not appear in tool results or OpenAPI docs.
- Approving the outer `code` / `execute` tool **must not** replace per-write elicitation.

---

## 3. Kai Yue catalogue and dependencies (pinned)

Application MCP is `packages/agent-tools` served by staging plugin + Worker Streamable HTTP. **Not** Cloudflare `docs`/`search`/`execute` infra MCP.

Pinned: `@modelcontextprotocol/sdk` **1.32.2**, `zod` **4.6.7**, plugin `kaiyue-travel-staging` **0.4.0**, Wrangler **4.132.0** (root) / **^4.38.0** (`apps/web`). Worker `compatibility_date` **2026-09-01**. `nodejs_compat` present. **No** `worker_loaders` / `LOADER`. **No** `@cloudflare/codemode` or `agents` in the repo. **No** Workers AI / AI Gateway usage binding.

**Ten tools** (plugin `server.test.mjs` and this run’s in-memory `tools/list`):

| Tool | Role |
| --- | --- |
| `list_bookings`, `get_booking`, `list_inquiries`, `get_inquiry`, `list_inventory`, `draft_quote` | read-only hint |
| `edit_booking`, `change_booking_status`, `assign_booking`, `send_quote_email` | write / destructive hint; `requireApproval` elicitation in `packages/agent-tools/server.mjs` |

Auth (unchanged, must stay): staff/session; 3 failures / 5 minute D1 lockout; staging MCP email/password session; production MCP closed; no raw D1/env/bindings to the model; quote allowlist; `expectedUpdatedAt` CAS. Staging overlay may skip **browser tickets** for writes; that is **not** a substitute for per-tool elicitation, and Code Mode must not swallow it.

Admin HTTP OpenAPI `docs/api/admin-agent-v1.openapi.yaml` is **13 763 bytes** — a small staff API, not a thousands-of-operations catalog.

---

## 4. Baseline captured **before** any Code Mode change

Offline in-memory `tools/list` (synthetic empty GET; **no hosted MCP**, **no model call**):

- Files: `baseline-tools-list.json`, `baseline-tools-list-summary.json`
- Tool count **10**; `tools/list` JSON **23 890 bytes**
- Schema-size **ESTIMATE** (UTF-8 bytes/4, **not** a tokenizer, **not** billed usage): **~5 973 tokens** for the tool list + **~267** for instructions (**1 066 chars**)
- Per-tool estimates in the summary JSON (largest schemas: `edit_booking` ~958, `list_bookings` ~864)

**Reproduce (offline):** from `plugins/kaiyue-travel-staging`, in-memory `createServer` + MCP client `listTools()` as in `server.test.mjs`. Do not label this hosted E2E.

**Not captured (unavailable with authorized tools, no new credentials/paid model calls):** actual input/output/cached/reasoning tokens for staff MCP agent sessions; billed USD; hosted E2E latency; application usage totals. Cursor `run-info` / GitHub / Cloudflare docs MCP do not expose those session tokens. **No savings claim.** Marketing “99.9%” / “1 000 tokens” is **not** Kai Yue evidence.

---

## 5. Recommendation (design only)

**Do not wrap the 10-tool Kai Yue MCP in Code Mode as the default interface.** Official docs steer a small fixed catalogue to **direct tools**. Estimated schema load is already ~6k tokens. A single `code` tool still embeds generated types for every upstream method, so this size is unlikely to pay for sandbox + codegen + retry cost. **OpenAPI search/execute is not justified:** the MCP subset is already the staff surface; wrapping the YAML would widen path execution and still lacks per-call durable approval.

If a **later** parent-authorized offline pilot happens (not this run):

1. Keep **direct MCP** as A/B control (same model/version/prompts/fixtures/output criteria).
2. Smallest wrapper: `codeMcpServer()` over the **six read-only** tools only, as an isolated sidecar — not replacing `/api/v1/admin/mcp`.
3. Leave all **write** tools as direct MCP with existing `requireApproval`. Never treat outer `code` approval as write approval.
4. Credentials stay on the host; sandbox `globalOutbound` null; deny arbitrary URLs/raw DB/env.
5. No Worker Loader on staging/production overlays without a separate resource authorization. Hosted Dynamic Worker is **not** enabled by this assessment.
6. Start synthetic/read-only fixtures only. **No** real booking writes, mail, quote sends, PII logs, production MCP.

---

## 6. Measurement design (for a later A/B — not executed)

Same representative **read-only/synthetic** workflows on both arms; same model/version/prompts/fixtures/settings; balanced order; separate cold/warm. Count **every** turn (schema discovery, codegen, retries, errors). Record when **observable**: input/output/cached/reasoning tokens, total model usage, tool-call count, agent-completion latency **vs** tool/API latency, success and output parity. Report medians and spread, absolute and %. **Billed USD only with real usage and prices.** Tokenizer/schema counts stay labeled **ESTIMATE**. Mock/offline timing must never be labeled hosted E2E. Do not start paid model calls or new hosted resources from this task.

---

## 7. Security gates (must survive any later pilot)

- Staff auth + 3/5 lockout unchanged.
- Per-operation method auth and human approval **inside each write handler**, not on outer `code`/`execute`.
- No credential leakage into sandbox, tool results, or logs.
- No direct egress, arbitrary URLs, raw D1, env, or bindings from generated code.
- Production MCP remains off. Held PRs and email/release branches stay frozen.

---

## 8. Next

Parent continuation after this feasibility/design gate. **No implementation plan started.** No Code Mode packages installed. No Worker Loader added. No hosted MCP change.
