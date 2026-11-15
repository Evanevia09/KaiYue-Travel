# 2026-11-15 — Admin-prep package (runtime freeze intact, ops hold)

**Runtime freeze:** `74c30236a03583675f39d1a97b79c19a60d58da5`  
**Docs HEAD at package time:** `deb293c8319a89b388f4bc738287a209f3c0accc`  
**Status:** reversible packaging only. **Not** `user_accepted`, **not** deployed, **not** `released`.  
**Does not:** DNS, Worker create, D1 apply, secret seed, Vault export, public endpoint, staging overwrite.

Mika rereview of the freeze and the exact isolated trial resource plan continues. This increment does **not** change reviewed runtime code.

## How it was built

Isolated git worktree `/tmp/kaiyue-runtime-74c3023` at the runtime freeze (current checkout left on `deb293c`).

```
PUBLIC_SITE_URL=https://kaiyuemacau.com pnpm build
node scripts/build-complete-ledger.mjs --env production
```

Wrangler `--dry-run` printed git `wrangler.jsonc` bindings (unsafe obsolete D1 / `admin-test@kaiyue.test`). That stdout is **not** the upload config. Packaged `wrangler.jsonc` is the production overlay: D1 `06cf879d`, R2 `kaiyue-offers-production`, `run_worker_first=false`.

Artifacts were copied into `/opt/cursor/artifacts/` (Cloud Agent artifact store). Zip SHA matched the worktree zip after copy.

## Production complete archive

| Item | Value |
|---|---|
| Zip | `/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_production_complete.zip` |
| Zip SHA256 | `483686e17141a24b12561169aaa51a0a9a7ccd91cba0e47703eb128f1fd24175` |
| Bytes | 9999155 |
| Entry SHA256 | `b4241b58214a13ff67f44b70b82192fb868ff496f953a8b30b63a41bd4be41ee` |
| Overlay SHA256 | `6ef1b9de6915159bc3018bf98930b4cb0e465c9bbd65aa0a05d3ff47fbd45bdf` |
| Packaged wrangler SHA256 | `6b0597e7ee05a0ea0551fc58b1f047557e41d7f61248600d09ccd5722eb1b276` |
| Ledger files | 137 |
| Photos in ledger | **41/41** |

## Trial overlay TEMPLATE (DO_NOT_DEPLOY)

`/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_trial_overlay_do_not_deploy.jsonc`  
SHA256 `96504ac6c3561a794c1f303786981deeeeacc9d4efc51fc6f22db13f2215574e`

Exact proposed names; resources **do not exist**:

- Worker `kaiyue-travel-admin-trial`
- D1 name `kaiyue-travel-admin-trial`
- D1 id `UNCREATED-SENTINEL-DO-NOT-DEPLOY` until created and read back
- R2 `kaiyue-offers-admin-trial` (not UAT `kaiyue-offers-staging`)

Freeze-source trial overlay remains `docs/records/wrangler.admin-trial-artifact.jsonc` SHA256 `160c40c8541181abbd35d0ea370e2ed266c37ee6e944036fcdb7b9cff9294a9f` (sentinel UUID). Official UAT overlay is DO_NOT_UPLOAD SHA256 `a00913877e3579a7c2521bf58c9965664ddd2d2ace9083290114c10ac89683ab`.

## Standalone CREATE CLI

Bundled Better Auth **1.7.5** `hashPassword` (scrypt). Works from an empty directory with only the `.mjs` file. No repo checkout. No new server.

`/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_provision_primary_admin.mjs`  
SHA256 `e7f104973dcdaa16d2fb201d90eeea1abae48c78f5328589fd348f44e32a1e2d`

Tested after review (fake trial fixture only; values omitted from logs):

```
node provision-primary-admin.mjs --plan
node provision-primary-admin.mjs --preflight --env trial
node provision-primary-admin.mjs --write-sql --env trial --out ./create.sql
```

`--env trial` locks `PRIMARY_ADMIN_EMAIL` to `admin-trial@kaiyue.test` (fake/local). `--env production` refuses that email. Exclusive 0600 SQL. SQLite cases: transaction CREATE, repeat CHECK refusal, user-without-credential refusal, case-variant refusal, interruption + retry refusal. Bundled hash verified with Better Auth `verifyPassword`. Validation log SHA256 `3170b68251e9974e72e411033edd3dd1d77767c717e1e7b48d17cbae0fcc6e55`.

Vault cannot export a generated login password into this CLI or write Worker bindings. Do not use staging UAT passwords. Parent may later put a user-provided password in `PRIMARY_ADMIN_PASSWORD` via a native secret request. Not requested here.

## Source hashes (runtime freeze tree)

| File | SHA256 |
|---|---|
| `package.json` | `468a148b0fd397598b030fbd92f611ff76c90b283525ce5bbb1e7da4b6715eff` |
| `pnpm-lock.yaml` | `77534ea2b09a906a921384449803426de91a2c14ef101c1bbb6bd8a0a672403b` |
| git `wrangler.jsonc` (unsafe) | `2899600fd7501fb48b94dde1ed6e223bcf65809e99814bb83af0ba4204ce1386` |
| `scripts/provision-primary-admin.mjs` | `8aa1fdd567de712823cfc5e6efd03661eb43077e2a67114c7bce62e110a7fec0` |
| Freeze check logs (165 tests) | `79ada0887ae11cfe562d1981de247100d0c725afe8a2a2b1e6776916bcf8749d` |
| Artifact SHA256SUMS | `2c4c1b0aff5fff09112dc89c5c0c813d0494bfe2834b4e3bc4f651ac0eda99e6` |

Index: `/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_sha256sums.txt`  
Transfer note: `/opt/cursor/artifacts/kaiyue_admin_prep_74c3023_transfer_manifest.txt`

## Next

Ops remain on hold. Parent: Mika rereview of `74c3023` plus exact trial plan approval before any provision.
