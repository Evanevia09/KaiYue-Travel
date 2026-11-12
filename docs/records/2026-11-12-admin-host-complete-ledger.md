# 2026-11-12 — admin.kaiyuemacau.com complete ledgers (source freeze)

**runtimeSourceSHA:** `8f41369c1ec8caf1f1aac20e40205a1dab955110`  
**Do not rebuild** on later docs commits. Zips are box artifacts (gitignored `artifacts/*.zip`). No secrets.

Owner t96: password dashboard is `admin.kaiyuemacau.com` while Access vars are unset. Extra hostname-only Access 403 removed. Configured Access still takes over. No `staff.` subdomain. Account `33ecc75158a1cdd23ba1a62eb70c5103`. Zone `fb84210cb8175ff4412b444805e1a6a5`. compatibility_date **2026-09-01** + `nodejs_compat` from live GET 2026-11-12.

Official CLI (unzip, then, after device OAuth). Do **not** `--secrets-file`. Do **not** `wrangler deploy`.

```text
npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel-staging
npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel
```

| Item | Staging | Production |
| --- | --- | --- |
| Zip | `artifacts/kaiyue-staging-complete-8f41369.zip` | `artifacts/kaiyue-production-complete-8f41369.zip` |
| Zip sha256 | `1305bdb2d88ca90260e2adcf21317e3619dad7650c825758e3447186b1c6fa9c` | `fba69bb9660d17957d66706cdd4d8c00a36fce2e44c956688b6771fa1528bd6f` |
| Zip bytes | 10979204 | 10978020 |
| `entry.js` sha256 | `07c664097bb40d3551fdd837a0fabb5fcf40c88670ccf6c8cbc2d362544dda67` | `a642703a8e91f27ceea611969ddd0cc73f8769352b9dbdbe59a20e5c9918aaaa` |
| Ledger files | 136 | 136 |
| Script | `kaiyue-travel-staging` | `kaiyue-travel` |
| Canonical | `https://kaiyue-travel-staging.kai-yue.workers.dev` | `https://kaiyuemacau.com` |
| D1 | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` | `06cf879d-8fea-4088-8881-7d382e1b8c11` |
| R2 | `kaiyue-offers-staging` | `kaiyue-offers-production` |
| Live secrets (names only) | `BETTER_AUTH_SECRET` | none |
| Rollback version | `b53c0353-bfc4-4700-a5c7-725b7167af6e` | `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` |

Production package is **fail-closed** (no allowlist/expiry in wrangler; live has no `BETTER_AUTH_SECRET`). Not password-dashboard-ready until PM sets secret + allowlist + expiry after staging UI/console/security. Staging package matches live allowlist/expiry.

Local: `pnpm test` 142/142, lint clean, typecheck 0 errors, `pnpm build` completed on this SHA. Independent hostname/security review and browser QA on **this** package (not 5dab462) are required before mutation. Not `user_accepted`. Not `released`.
