# 2026-11-14 — staff-dashboard UAT UX on live runtime 6b62da09 (packaging review)

**As-of:** 2026-11-14  
**Branch:** `cursor/staff-dashboard-uat-on-runtime-6b62da09-2cad`  
**Parent:** `6b62da09fba7de4e88d418750fde22a71a915a20`  
**Head (UX cherry-pick):** `d8c8bd20c1d5f38e4e3a74232be484dc3fca8741`  
**Cherry-picked:** `8ed952a7ec7ec96d306ac44b226723640fc99c55` (PR #33 left untouched)

Packaging-review tree only. **Do not merge. Do not upload. Do not activate.**

A Worker upload of `8ed952a7` (based on git staging `b38ad506` only) would drop the live temporary-admin-login runtime. This tree puts the 12 UX fixes on official-staging runtime `6b62da09`.

PR #33 remains `8ed952a7`. PR #26 remains `2b12338c`. Official staging must stay 100% v7 `db49bfa6` / runtime `6b62da09` until a reviewed **new** package is authorized. Production `5b859f36` untouched.

## Checks

| Gate | Result |
| --- | --- |
| `pnpm lint` | clean |
| `pnpm typecheck` | 0 errors (3 existing hints) |
| `pnpm test` | 169/169 |
| `PUBLIC_SITE_URL=https://example.invalid pnpm build` | completed |
| admin-gate | PR #26 / `6b62da09` (unchanged vs parent) |
| password min | staging-only 6 with `ADMIN_STAGING_TEST_PASSWORD_MIN=6` on staging workers.dev; production 16; no flat 12 |
| 12 UX fixes from `8ed952a7` | present (UX files byte-match `8ed952a7`) |
| 包車接送 | unchanged vs `6b62da09`; built zh-Hant home and airport-transfer still contain it |

## New Worker package (dry-run only; not uploaded)

Built with the documented 6b62da09 method: `PUBLIC_SITE_URL=https://example.invalid pnpm build` then `node scripts/build-complete-ledger.mjs --env staging` (`wrangler versions upload --dry-run --outdir`; wrangler unauthenticated; `--dry-run: exiting now`). Unpack-in-place is stale: upload must use a clean `entry.js` + overlay directory and `--assets` at frozen `dist-client` outside that directory.

Do **not** reuse `artifacts/kaiyue-staging-complete-6b62da0.zip` (`641d725d…`) or entry `bc839f5b…` as this tree’s package.

| Item | Path | sha256 |
| --- | --- | --- |
| entry | `artifacts/kaiyue-staging-complete-d8c8bd2/entry.js` | `745716269feff51329b39bef4bd2f79efa70c0df41b5cb3ff77716d1ffd1e9fb` |
| zip | `artifacts/kaiyue-staging-complete-d8c8bd2.zip` (10984588 bytes) | `df66801b505c7482fcdf246f13fe7468422635bae3cb5e0fa0126a9a5e0dfab2` |
| dist-client tree (sorted file hashes) | `artifacts/kaiyue-staging-complete-d8c8bd2/dist-client/` (139 files / 11600114 bytes on disk; 136 ledger files after skipping `_headers` `_redirects` `.assetsignore`) | `a57bca1d756a064f6653c8168add663bf79d753fd82fb10fda721698a4626462` |
| dist-client ledger | `artifacts/kaiyue-staging-complete-d8c8bd2/assets-ledger.json` | `4cc47da7dca0d5ebfa6de9318b4c17a704f03a76701194d9d6a94713cd3d0643` |
| overlay | `docs/records/wrangler.staging-artifact.jsonc` | `f037c3366ef1e6a8392c86731e75d9f5501de3c731d7740af2a560258c21107c` |

`runtimeSourceSHA` inside the zip is `d8c8bd20c1d5f38e4e3a74232be484dc3fca8741`. Frozen `entry.js` uses `env.ASSETS.fetch`.
