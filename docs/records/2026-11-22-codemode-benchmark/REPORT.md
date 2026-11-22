# Kai Yue application MCP Code Mode — feasibility / baseline (no pilot code)

**task_id:** `kaiyue-codemode-benchmark-20261122`  
**Authority:** Evan via Mika chat, 22 Nov 2026 15:09 Asia/Macau (assessment). Follow-up 15:21 Asia/Macau: install official Cursor Agent CLI, check existing sign-in, small included-use baseline; **stop** if a new login or paid usage is needed. **No** merge, deploy, hosted rollout, production MCP, access expansion, or Code Mode pilot code.  
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

**Not captured in the first pass (app-level tools only):** actual input/output/cached/reasoning tokens for staff MCP agent sessions; billed USD; hosted E2E latency; application usage totals. Cursor `run-info` / GitHub / Cloudflare docs MCP do not expose those session tokens. That does **not** mean Cursor Agent CLI telemetry is absent as a product. See §9: CLI is now installed here; usage fields remain **unobserved** because supported status is unauthenticated and this run stopped before `-p`. **No savings claim.** Marketing “99.9%” / “1 000 tokens” is **not** Kai Yue evidence.

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

## 8. Next (superseded for measurement; still true for Code Mode code)

Parent continuation after this feasibility/design gate. **No Code Mode implementation plan started.** No `@cloudflare/codemode` installed. No Worker Loader added. No hosted MCP change. Measurement follow-up §9 **stopped** on missing CLI sign-in.

---

## 9. CLI measurement follow-up — install + auth STOP (22 Nov 2026)

**Authority (first-hand):** Evan, Mika newest user message 22 Nov 2026 15:21 Asia/Macau (reply to widget t1841s6860): install Cursor Agent CLI in Kai Yue’s cloud test environment, check existing sign-in, small included-use baseline; **stop** if a new login or paid usage is needed. No deployment or production changes. Isolated branch `cursor/codemode-benchmark-f58e` / PR #63. No code after-arm. No hosted Loader. No mail/quote/PII/live app writes.

### 9.1 Three layers (must not be collapsed)

| Layer | What it is | This run |
| --- | --- | --- |
| **App telemetry** | Kai Yue application MCP / Worker / D1 has no model token counters | Unchanged. Offline `tools/list` schema ESTIMATE only (§4) |
| **Documented CLI** | Official Cursor Agent CLI `agent -p --output-format stream-json`. Result `duration_ms`. `duration_api_ms` currently **equals** `duration_ms` (never label API-only). Changelog Feb 2026: per-turn input/output/cache + `request_id`. Changelog v2026.10.28: `reasoningTokens` in per-turn and total `usage`. Output-format **reference still omits** `usage` (docs lag changelog) | Source only until a signed-in `-p` emits JSON |
| **Observed CLI** | Official install + `--version` / `--help` / `status` / `about` in this VM | Installed **2026.11.22-e9042b2**. **`isAuthenticated`: false**. No `-p`. Usage fields **not captured** |

External monotonic wall clock remains a valid separate timer. It was not started because inference did not run.

### 9.2 Official install source (verified before curl)

- Docs: https://cursor.com/docs/cli/installation and https://cursor.com/docs/cli/overview — `curl https://cursor.com/install -fsS | bash`
- Installer script (fetched https://cursor.com/install): Cursor Agent Installer; linux/x64; package `https://downloads.cursor.com/lab/2026.11.22-e9042b2/linux/x64/agent-cli-package.tar.gz`; dest `~/.local/share/cursor-agent/versions/2026.11.22-e9042b2`; symlink `~/.local/bin/agent`
- Auth check (docs): https://cursor.com/docs/cli/reference/authentication — `agent status` / `agent about`; **`agent login` not run**
- Parameters / output-format / changelog: https://cursor.com/docs/cli/reference/parameters https://cursor.com/docs/cli/reference/output-format https://cursor.com/docs/cli/changelog

No unofficial URL, npm package, or GitHub release was used.

### 9.3 Observed installation / version / status

| Item | Value |
| --- | --- |
| Install command | `curl https://cursor.com/install -fsS \| bash` (exit 0) |
| Binary | `/home/ubuntu/.local/bin/agent` → `…/versions/2026.11.22-e9042b2/cursor-agent` |
| `agent --version` | `2026.11.22-e9042b2` |
| `agent about` `latestStatus` | `up_to_date` / `latestVersion` `2026.11.22-e9042b2` |
| Default `model` in about (unsigned) | `Auto` (not used; no inference) |
| `subscriptionTier` | `null` |
| `userEmail` | `null` |
| `CURSOR_API_KEY` env | **unset** (name check only; no key files read) |
| `agent status --format json` | `status: unauthenticated`, `isAuthenticated: false`, `hasAccessToken: false`, `hasRefreshToken: false`, `message: Not logged in` |
| Evidence files | `cli-status.json`, `cli-about.json` (no secrets) |

Help confirms `-p`, `--output-format text|json|stream-json`, `--model`, `--mode ask|plan`, `status`/`about --format json`. `--list-models` / `agent models` **not run** (do not browse paid models). `agent login` **not run**. No account settings changed. On-demand **not** turned on.

### 9.4 Included-usage determination — **cannot affirm → STOP**

Supported observable evidence does **not** establish an existing authorized CLI sign-in, a plan tier, included remaining quota, or that a `-p` call would stay on included use without paid expansion.

**Final state of this run:** no inference, no usage-schema probe, no direct-MCP CLI baseline. Owner instruction: do not ask to sign in; do not infer sign-in from this Cloud Agent session; no alternative credentials/routes.

Codex CLI remains absent (`codex: command not found`) and would be a separate arm.

### 9.5 Call / error / discovery count (this follow-up)

| Step | Result |
| --- | --- |
| Official docs + installer fetch | 7 pages (install, overview, headless, authentication, parameters, output-format, `cursor.com/install` script) |
| Context7 library resolve | failed (quota); ignored |
| Official CLI install | 1 success |
| `agent --version` / `--help` / `help` / `status --help` / `about --help` / `whoami --help` | 6 success |
| `agent status --format json` | 1 success, unauthenticated |
| `agent about --format json` | 1 success, no tier |
| `agent -p` / `--list-models` / `login` / MCP probe | **0** (stopped) |
| Errors | none on allowed commands |

Offline in-memory MCP `tools/list` from the first pass remains the only synthetic catalogue baseline. It is **not** a CLI token baseline.

### 9.6 Commands to reproduce this STOP (no inference)

```bash
export PATH="$HOME/.local/bin:$PATH"
curl https://cursor.com/install -fsS | bash
agent --version
agent --help
agent status --format json
agent about --format json
# STOP here unless status shows authenticated AND included-only usage is observable.
# Do not: agent login | agent --list-models | agent -p
```

If a **later** owner-authorized signed-in included-only run is approved, the intended probe (not executed) is:

```bash
# pick one already-available included model from signed-in status/about — do not browse paid catalogs
start_ns=$(date +%s%N)
agent -p --output-format stream-json --mode ask --model '<FIXED_INCLUDED>' --trust \
  'Reply with the single word OK. Do not use tools.'
end_ns=$(date +%s%N)
# parse NDJSON type=result: duration_ms, duration_api_ms (record both; not API-only),
# any emitted usage/input/output/cache/reasoningTokens (missing stays unavailable)
# wall_ms=$(( (end_ns - start_ns) / 1000000 ))
```

Then a small **local trusted read-only** in-memory MCP `tools/list` arm (fixture only; no hosted MCP; no writes). **Not run.**

### 9.7 What this does **not** change

No deployment, production, `main`, held PRs #51–#53, email/release PRs #61/#62, Worker Loader, `@cloudflare/codemode`, mail, quote, bookings, PII, or access policy. Cloud Agent `bc-efa1f054` remains sole writer. Returns through PM/Mika; this writer does not publish Agent Lab queue/vault.
