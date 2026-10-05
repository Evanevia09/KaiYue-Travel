# 2026-10-03 — Codex workflow documentation adoption

**Status:** `probe_complete` for the starting read-only baseline; `task_verified` for this documentation increment. No software behavior, owner acceptance, or release is claimed.

## Scope and acceptance

- Authorized outcome: connect Kai Yue Travel's existing project instructions and living status to the personal Codex execution guide with compact startup, bounded delegation, verification, and closeout routing.
- Acceptance for this documentation task: project links resolve; authority and business boundaries remain intact; the pre-existing dirty state is preserved; source/date/revision and historical versus current checks are explicit; an independent reader can resume from the project files.
- Out of scope: application code and tests, runtime or provider operations, real booking data, access changes, shared guide/Page edits, commit, push, merge, cleanup, and deployment.

## Starting evidence and provenance

- Observed 2026-10-03, Asia/Macau. Repository: `C:/cursor/Kaiyue-website/KaiYue-Travel`, branch `main`, starting HEAD `d9db4861ea965de2bcfea3ed785474f4c89a2c03`.
- Starting dirty paths: modified `PROJECT-STATE.md`; untracked `.hermes-tmp.uxgxfa/`. The temporary directory was not opened or changed.
- Starting SHA-256: `PROJECT-STATE.md` `39154897677409D13B30C444B0474C36C6DD082A9A382ABAAE750F9A07ECEF03`; `AGENTS.md` `D4FB32155EE545B1F6D3BDB377342BB5CF9C0ABC56177F1CE326AD820415CCDC`; `BUSINESS_INFORMATION.md` `FB15CFF7B45426202E554242B237E93D7D29652F2AEFF77D8F790AEC059C426A`; `docs/README.md` `4E54FC85E0E7B2CE6D6D479F4CE6C1DC2E1D8907784E5B7DBE5EDE63CDA4C356`.
- The existing uncommitted state entry, dated 2026-09-27, reports local booking/API evidence and explicitly says production readiness is not established. This task did not rerun those checks; that evidence is historical and was preserved.
- Source hierarchy: current user authorization and project [AGENTS.md](../../AGENTS.md); current [PROJECT-STATE.md](../../PROJECT-STATE.md); [BUSINESS_INFORMATION.md](../../BUSINESS_INFORMATION.md); [documentation index](../README.md); [personal guide](C:/Users/USER/.codex/workflow/README.md). The personal guide does not grant project permissions.

## Documentation outcome

- Added the [project adapter](../11-codex-workflow-adapter.md) and linked it from [AGENTS.md](../../AGENTS.md) and the [documentation index](../README.md). The adapter routes tasks through current project evidence, explicit file ownership, risk-based checks, and precise closeout statuses.
- Extended [PROJECT-STATE.md](../../PROJECT-STATE.md) surgically with this dated adoption and a resume pointer; its prior uncommitted readiness entry and historical business records remain in place.
- Documentation-only validation on the uncommitted working tree at the starting HEAD: all 46 local Markdown links in the touched docs resolve; targeted Prettier check and `git diff --check` pass. Only three tracked documentation files were modified (`AGENTS.md`, `PROJECT-STATE.md`, `docs/README.md`), and only the adapter and this record were added. The original 2026-09-27 readiness paragraph and changelog block remain in the diff as additions from the pre-existing edit; `.hermes-tmp.uxgxfa/` remains untracked and untouched. `BUSINESS_INFORMATION.md` still matches its starting SHA-256.
- Final SHA-256 at HEAD `d9db4861ea965de2bcfea3ed785474f4c89a2c03` plus the uncommitted documentation changes: `AGENTS.md` `C5F1C6DA857C1CF01D27BA349CB0F3B92DC6F9DBC1EE72B9C00C137C91463E1C`; `PROJECT-STATE.md` `D3A1B61D3DFFA615AF82688808806FD5E302BEFCA526B358AF24D716097E4B04`; `docs/README.md` `8AA942A40C8BF5E7EB0B8BBDD2A9513223AC5695732C0EA067507BE5F160A222`; `docs/11-codex-workflow-adapter.md` `ED797B2D471390367E6974E92BE9D87AA53BCC29A543FBC143E4B39BCF5EAC45`. This record's own hash is supplied in the owning-agent handoff to avoid a self-reference.
- No app tests, browser flows, API/D1 checks, CI, deployment, owner acceptance, or usage measurement were performed for this adoption. The 2026-09-27 checks and formatting issue are historical reports, not current verification.

## Review, limits, and next action

- Independent read-only reviewer: no actionable correctness or authority findings after checking the daily-entry clarification, 46 links, package/CI commands, unchanged business hash, and status boundaries. The reviewer did not independently reconstruct the original dirty `PROJECT-STATE.md` bytes.
- Remaining gates: owner acceptance of this adapter and any future release/access/business decisions remain separate; the formatting issue reported in the 2026-09-27 entry and production readiness gaps were not repaired here.
- Reusable lesson: a compact project adapter should route work to live evidence and explicit status stages without copying historical success into current release claims.
- One resume action for the owning agent: read [AGENTS.md](../../AGENTS.md) → [PROJECT-STATE.md](../../PROJECT-STATE.md) → [BUSINESS_INFORMATION.md](../../BUSINESS_INFORMATION.md) → [documentation index](../README.md) → [adapter](../11-codex-workflow-adapter.md), then trial a bounded read-only task and return the evidence to the Lab coordinator for integration. Routine routing and readback do not require the user to visit another chat.
