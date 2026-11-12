# 2026-11-12 — admin.kaiyuemacau.com complete ledgers (source freeze)

**Current runtimeSourceSHA:** `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4`  
**Superseded:** `8f41369c1ec8caf1f1aac20e40205a1dab955110` (and 5dab462). Do not rebuild these zips on later docs commits. Box artifacts gitignored. No secrets.

Review fixes on this SHA: production public hosts stay password-403 even with allowlist/expiry; admin-host Better Auth trusted origins = request origin; marketing/locale HTML on `admin.kaiyuemacau.com` redirects to `/login`; host `noindex`. Extra Access-only 403 remains removed. Parent rereview before mutation.

Account `33ecc75158a1cdd23ba1a62eb70c5103`. Zone `fb84210cb8175ff4412b444805e1a6a5`. compatibility_date **2026-09-01** + `nodejs_compat` from live GET 2026-11-12.

```text
npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel-staging
npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel
```

No `--secrets-file`. No `wrangler deploy`.

| Item | Staging | Production |
| --- | --- | --- |
| Zip | `artifacts/kaiyue-staging-complete-fa5184c.zip` | `artifacts/kaiyue-production-complete-fa5184c.zip` |
| Zip sha256 | `b5b0be97da9189c5da5dccf88e8a29d95ed4841a724cbaa84dc249ceb26a2bf5` | `6bb3489ea8218477c5950bd8779baf25b09e288582123bcde5df957e6490af69` |
| Zip bytes | 10979371 | 10978222 |
| `entry.js` sha256 | `646f7dc771d6fb0088498c5002763c083d841668e8a263242b5b726c025120d9` | `633b224c7098a58d98b3dbce3af7f27eed4f0f65d4cfff8826b9da3d6d2dee8f` |
| Ledger files | 136 | 136 |
| Script | `kaiyue-travel-staging` | `kaiyue-travel` |
| Canonical | `https://kaiyue-travel-staging.kai-yue.workers.dev` | `https://kaiyuemacau.com` |
| D1 | `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` | `06cf879d-8fea-4088-8881-7d382e1b8c11` |
| R2 | `kaiyue-offers-staging` | `kaiyue-offers-production` |
| Live secrets (names only) | `BETTER_AUTH_SECRET` | none |
| Rollback version | `b53c0353-bfc4-4700-a5c7-725b7167af6e` | `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` |

Production package remains fail-closed (no allowlist/expiry in wrangler; live has no `BETTER_AUTH_SECRET`). Apex `/login` stays 403 even after those vars. Dashboard is `admin.kaiyuemacau.com`. Local: 145/145 tests, lint, typecheck, build. Not `user_accepted`. Not `released`.
