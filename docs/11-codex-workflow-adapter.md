# Codex workflow adapter — Kai Yue Travel

**Scope:** Project-specific routing for substantial software tasks. The [personal execution guide](C:/Users/USER/.codex/workflow/README.md) supplies reusable process; [AGENTS.md](../AGENTS.md), current user decisions, and this project's files control what may be done here. This adapter grants no new production, data, access, merge, or deployment authority. For Lab-coordinated work, **01 Start here Lab coordination** is the user's single daily entry point; numbered chats organize work rather than prescribe a sequence.

## Start a task

1. Resolve the checkout and read [AGENTS.md](../AGENTS.md), [PROJECT-STATE.md](../PROJECT-STATE.md), [BUSINESS_INFORMATION.md](../BUSINESS_INFORMATION.md), this [documentation index](README.md), and the relevant design or operating guide. Read current source and recent history for the affected area. The repository is under `C:/cursor/Kaiyue-website/KaiYue-Travel`; confirm that path and `git status` each time rather than assuming the wrapper directory is the repo.
2. Record the source date and revision, branch, dirty paths, and hashes for any dirty documents that the task may touch. Preserve manual edits and untracked files. Treat the latest dated verification as historical until its revision, environment, and behavior are rechecked.
3. State the requested outcome, constraints, observable acceptance criteria, data boundary, and what needs owner or staff approval. The site uses Astro/React with Cloudflare Workers, D1, and Resend; local tests use emulated or synthetic data. See [architecture](04-technical-architecture.md), [delivery boundaries](08-delivery-and-operations.md), and [quality gates](09-quality-and-roadmap.md). Do not use real booking records or production services for a routine check.

## Coordinate and verify

- Keep interactive decisions with the coordinator. Give an independent agent a bounded question or file-owned change with its expected output and verification; avoid overlapping file edits. The owning agent returns evidence, material blockers, and necessary human decisions to the Lab coordinator for integration. The coordinator reads every return, resolves conflicts, and checks the integrated result. Routine routing, hashes, review, and readback are agent work; use independent read-only review for substantial changes.
- Choose checks for the actual behavior and risk. `package.json` defines `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm run ci`; [CI](../.github/workflows/ci.yml) runs those four gates. A browser-visible booking or inquiry task also needs the actual form journey and relevant API/persistence checks. Admin work needs allow/deny and audit checks. A build, 200 response, or old test record alone is insufficient.
- Apply the business boundary in [BUSINESS_INFORMATION.md](../BUSINESS_INFORMATION.md): B2C claims and B2B portfolio claims have different sources. Owner review remains required for unresolved business, legal, privacy, access, pricing, image-use, and release decisions. The temporary local admin access documented in [PROJECT-STATE.md](../PROJECT-STATE.md) expired; do not treat a historical dashboard check as current access.

## Close and resume

Update [PROJECT-STATE.md](../PROJECT-STATE.md) after meaningful work, as its instructions require. Put dated task evidence in a record under `docs/records/`; link it from the state when useful. Record starting and final revisions, dirty-file preservation, checks with results and environment, independent review findings, missing coverage, approvals, and one recommended resume action. A record may say `unavailable` rather than inventing usage, acceptance, or release evidence.

Use these status words precisely:

| Status | Meaning |
| --- | --- |
| `probe_complete` | Read-only discovery or a documentation probe is finished; implementation behavior is unverified. |
| `task_verified` | This task's stated acceptance checks and required review passed on the named revision or working-tree snapshot. |
| `user_accepted` | The owner accepted the result; do not infer this from a passing check or silence. |
| `released` | The authorized target was deployed and its behavior verified there. |

An open PR, proposed gate, pushed commit, or passing local test is not a release. Keep preview, staging, production, and real notification/access controls separate. Follow the [delivery guide](08-delivery-and-operations.md) and explicit authorization before live writes, merge, or deployment. Propose workflow lessons in a task record; changing shared policy requires reviewed evidence and user authorization.
