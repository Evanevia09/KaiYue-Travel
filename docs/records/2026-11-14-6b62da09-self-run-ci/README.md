# Self-run CI-equivalent evidence for runtime `6b62da09`

**Kind:** `SELF_RUN_NOT_GITHUB_ACTIONS`  
**testedSHA:** `6b62da09fba7de4e88d418750fde22a71a915a20`  
**As-of:** 2026-11-14 15:07 UTC  
**This is not independent GitHub Actions.**

GitHub Actions workflow `.github/workflows/ci.yml` (`CI` / job `check`) is tests-only (`pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build`) and lists `workflow_dispatch`. This writer cannot invoke dispatch: `gh` is read-only here, and the available GitHub tools have no workflow-run create. `list_workflow_runs` for `head_sha` `6b62da09…` and `c1dc6a77…` returned **0**. `workflow_dispatch` history is **0**. Check-runs on `6b62da09…`: **0**. Check-runs on docs head `c1dc6a77…`: Cloudflare `Workers Builds: kaiyue-travel` **failure** (production Worker upload `70057c30-…` on account `41386f…`) — **not** test CI; do not retry. Latest passing Actions on this task lineage is `5ca8cf0` (fa5184c overlay record; predates six-min). No empty-commit / push was used to queue unrelated CD.

Worktree `/tmp/kaiyue-6b62da09` at the exact runtime SHA. Commands match `ci.yml`. No `ADMIN_SEED_*`, `BETTER_AUTH_SECRET`, or Cloudflare tokens were set. Logs contain no passwords.

| Step | Command | Exit |
| --- | --- | --- |
| install | `pnpm install --frozen-lockfile` | 0 |
| lint | `pnpm lint` | 0 |
| typecheck | `pnpm typecheck` | 0 (0 errors, 3 existing hints) |
| test | `pnpm test` | 0 (**152/152**) |
| build | `PUBLIC_SITE_URL=https://example.invalid pnpm build` | 0 |

Raw logs: `01-install.txt` … `05-build.txt`. Bundle: `kaiyue-6b62da09-self-run-ci.tar.gz`. File hashes: `SHA256SUMS` and `EXTERNAL-HASHES.txt`. Runtime zip was **not** rebuilt.
