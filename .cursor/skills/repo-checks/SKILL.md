---
name: repo-checks
description: Point at the existing Kai Yue Travel quality levers. Use when verifying a change, closing out a task, or preparing an official-staging PR.
---

# Repository checks

Use the scripts already defined in this repository. Do not add another test runner, live e2e stack, or deploy as proof.

| Lever                      | Command                       | Source                               |
| -------------------------- | ----------------------------- | ------------------------------------ |
| Format                     | `pnpm lint`                   | `package.json`                       |
| Types                      | `pnpm typecheck`              | `package.json`                       |
| Unit and integration       | `pnpm test`                   | `package.json` (Vitest)              |
| Production build           | `pnpm build`                  | `package.json`                       |
| Staging overlay invariants | `pnpm official-staging:guard` | `scripts/official-staging-guard.mjs` |
| Pull-request CI            | GitHub Actions job `check`    | `.github/workflows/ci.yml`           |

The `check` job installs with `--frozen-lockfile`, runs the four pnpm gates, and also runs `npm ci` / `build` / `test` in `plugins/kaiyue-travel-staging`. A green `check` does not authorize merge, deploy, production promotion, mail, Access, D1, DNS, or secret changes.

Do not run live staging or production e2e, `wrangler deploy`, or hosted Workers / D1 / mail as routine proof on this repository.
