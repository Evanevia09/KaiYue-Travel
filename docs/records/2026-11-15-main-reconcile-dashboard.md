# 2026-11-15 — Main reconciliation (prepare only)

**Task:** `main-reconcile-dashboard-20261115`  
**Status:** `checked` locally after lint / typecheck / test / build. **Not** `user_accepted`, **not** merged, **not** deployed, **not** `released`.  
**Authorization this step:** investigate and prepare a reviewable PR against fresh `main`. No merge, live-site change, DNS, Access, secrets, D1, migration, seed, CD, or notification code.

Independent review and staging browser QA are parent-coordinated. Do not treat this PR as merge or production-release approval.

## Continuity (this writer)

- Sole RUNNING writer at start: `bc-38ae08ab-8286-5b33-ac65-b28874582cad`.
- Notification checkpoint left untouched: PR #36 `dd69a47d74a06f1119aca116451a1060fa4413ed`.
- Live-release checkpoint left untouched: PR #35 `5aa40dd90db5388883133818e3da5acd4112528a` (never blind-merge).
- Working tree on the notification branch was clean before switching; this branch is isolated from that work.
- Agent Lab pointer files were not accessible in this environment.
- Fresh `origin/main`: `037b93ad704ce4ed45d0148ad22a7a05cf030a81` (8 ahead / 10 behind live `9ff81925d722bb5f9fbdd2af3ef609d72ada8ecc`; merge-base `aeaf9d4b`).
- Live freeze: `cd33cf8c` atop `9ff81925`. Official 33ecc Worker 100% `f3169afb` / inactive upload `71a66a99`. Rollback `5b859f36` / `7c72bf5a`.
- Staging UAT `61bc5a03` / PR #34 `dad60ed` 6-char policy: **never** port to production.
- Staff UAT and live public release stay separate. This branch does **not** attach a staff domain.

## Why `main` merge did not continue

Root cause is **divergent login security**, not photos and not git Wrangler.

PR #35 is a live-equivalent freeze (`cd33cf8c` from `9ff81925` plus dashboard UX). `main` is not that history. Blind-merging PR #35 into `main` would:

1. replay 10 live-only commits onto a line that already recorded the same public features through 8 main-only “promote to live” commits;
2. import Access-host admin-gate history that `main` never had, without a file-level review of the public-host 403 contract;
3. still not make `main` identical to the live Worker (production uses the overlay, not git `wrangler.jsonc`).

That is why work stopped at the checkpoint instead of merging.

## Commit map

Live-only (`origin/main..9ff81925`):

| SHA | Subject |
|---|---|
| `9ff8192` | Carry Version 2 illustrative photos onto the Kai Yue public build |
| `6a90c39` | Record www proxy cutover and resolver discrepancy |
| `bd1f80d` | Record Kai Yue public cutover and rollback settings |
| `4ba427f` | Record Kai Yue staging deployment and production preparation |
| `aeacb04` | Require Cloudflare Access on dedicated admin hostname |
| `4a46a1c` | Verify fresh staging build and schema locally |
| `a48390c` | Record staging account migration probe and procedure |
| `3fb8236` | Fix mobile time picker, required WhatsApp, and language-switcher names (#23) |
| `a66caec` | Record staging tour-guide merge and D1 0008 apply (#20) |
| `be45582` | Optional Macau tour guide on City Tour packages (#19) |

Main-only (`9ff81925..origin/main`):

| SHA | Subject |
|---|---|
| `037b93a` | Record Version 2 photos live on kaiyuemacau.com (#31) |
| `df548d6` | Promote recompressed Version 2 photos to live (#30) |
| `ead2437` | Promote Version 2 illustrative photos to live (#28) |
| `608c4f5` | Record booking UX live verify as released (#25) |
| `870c536` | Promote booking UX (time picker + WhatsApp required + language names) to live (#24) |
| `96390fa` | Record tour-guide live verify as released (#22) |
| `7c9ca1d` | Release: optional Macau tour guide on City Tour packages (#21) |
| `9521609` | Release: admin zh-Hant + 包車接送 wording (#17) |

Dashboard UX itself is **not** on `9ff81925` or `main`. It lives on freeze `cd33cf8c` (from reviewed staging UX `8ed952a7`, with live auth kept).

## File / blob map

| Area | `main` `037b93ad` | live `9ff81925` | freeze `cd33cf8c` | Chosen |
|---|---|---|---|---|
| Photos (41 files) | blobs equal to live | blobs equal to main | same | keep (already equal) |
| git `wrangler.jsonc` | blob `60a190d3` (obsolete D1 `069aa442` + test admin) | same blob | same blob | **keep git file, never upload** |
| Production overlay | absent | absent | `docs/records/wrangler.production-artifact.jsonc` D1 `06cf879d`, R2 production, `run_worker_first=false` | take freeze overlay |
| `admin-gate.ts` | `787f013a` (no Access host; public-host list is workers.dev only) | `8c68e42c` Access host + fail-closed | same as live | **live / freeze** |
| `middleware.ts` | `18249e34` | `ad7117e1` | same as live | **live / freeze** |
| `auth.ts` | `7e9494af` | `597d12da` | same as live | **live / freeze** |
| `AdminLayout.astro` | no Access logout / host-aware view-site | Access host logout + public site link | same as live | **live / freeze** |
| `access-jwt.test.ts` / `admin-gate.test.ts` | fewer 403 / no Access-host cases | live Access tests | freeze adds public-host 403 matrix | **freeze** |
| Dashboard UX (panels, list-query, assignment, offer-card, global.css, contracts booking) | main lacks freeze UX | live lacks freeze UX | reviewed UX | **freeze** |
| `admin-session.ts` min password | `minPasswordLength: 12` | 12 | 12 | keep 12; **never** staging `adminPasswordMinLength` / `ADMIN_STAGING_TEST_PASSWORD_MIN=6` |
| Main handover records (`promote-tour-guide-to-main.md`, #17–#31 notes) | present | live line deleted some | n/a | **keep main** |
| Notification plan / Resend–Email Sending | n/a | n/a | n/a | **out of scope** (PR #36 checkpoint) |

`8ed952a7` matches `main` on the three auth blobs. Staging `dad60ed` overlays 6-char UAT and is excluded.

## Access-host design (reviewed, not reinvented)

Existing live design, kept as-is:

- Dedicated Access host `admin.kaiyuemacau.com`.
- Public hosts (apex, www, production workers.dev, and listed staging workers.dev) fail closed: `/admin`, `/login`, `/setup-admin`, `/api/admin`, `/api/v1/admin`, `/api/auth` → **403** JSON `Admin access is not configured.`
- Password login is disabled on the Access host; Access JWT is required there.
- `DEV_ADMIN_BYPASS` is not an apex shortcut.
- `minPasswordLength` remains **12**.
- Production overlay: no `ADMIN_EMAILS`, `TEMP_ADMIN_EXPIRES_AT`, `ADMIN_STAGING_TEST_PASSWORD_MIN`, `BETTER_AUTH_SECRET`.

This is not an untested auth rewrite. It is the live Worker gate plus freeze tests. `main`'s older gate 403s `/admin` and `/login` on `kaiyue-travel.scalingsmb.workers.dev` only by host list and does not encode the dedicated Access host.

## Intentional resolution

Do **not** choose live vs `main` as a whole tree.

| Keep from `main` | Take from live `9ff81925` | Take from freeze `cd33cf8c` | Explicitly exclude |
|---|---|---|---|
| Base branch / public product already on `037b93ad` | Access-host auth + 08-delivery Access hostname procedure | Dashboard UX, overlay, overlay tests, ledger script, gitignore `artifacts/`, extra 403 tests | Staging 6-char UAT |
| Main-only release records and `docs/handover/promote-tour-guide-to-main.md` | Public-host fail-closed 403 | `docs/07-admin-area.md` UX bullets | Notification code / PR #36 |
| git `wrangler.jsonc` blob (document as unsafe) | | freeze closeout report as provenance | Blind merge of PR #35 |
| 41 photo blobs (already equal) | | | Upload of git Wrangler; D1/DNS/Access/secrets changes |

Rationale: main-only commits are documentation of public features live already has. The real product gap on `main` is Access-host auth (`aeacb04`) plus freeze dashboard UX. Combining those files onto fresh `main` preserves both legitimate main records and the reviewed live/dashboard fixes.

No owner business decision was required for this file map. A later merge/release, staff-domain attach, or any auth behavior change beyond this live gate **would** need owner authorization.

## Unsafe git Wrangler (do not deploy)

Root `wrangler.jsonc` blob `60a190d3` is identical on `main`, live, and freeze. It still names the live Worker, obsolete D1 `069aa442`, and test admin. Production upload config is the overlay only:

- D1 `06cf879d-8fea-4088-8881-7d382e1b8c11`
- R2 `kaiyue-offers-production`
- `serve_directly=true` / `run_worker_first=false`
- no TEMP vars

This PR does not upload, deploy, migrate, or seed.

## Verification (this increment)

Commands and raw logs: `docs/records/2026-11-15-main-reconcile-check-logs.txt` (sanitized; no credentials).

Expected local gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Regression coverage:

- auth / routing: `tests/integration/admin-gate.test.ts` (public-host 403 matrix + Access host)
- overlay / git Wrangler: `tests/integration/production-overlay.test.ts`
- dashboard / dispatch: `tests/integration/admin.test.ts`, `tests/integration/dispatch.test.ts`
- photos + min-12 + no staging 6-char in git Wrangler: `tests/integration/main-reconcile-invariants.test.ts`

Not verified here: staging or live browser QA, staff-domain attach, GitHub Actions on this PR, Workers Builds `41386f` (do not retry or cancel if a preview fires).

## Next action

Independent review of this PR against `main`, then parent-coordinated staging browser QA. Do not merge, do not deploy, do not treat preparation as release approval.
