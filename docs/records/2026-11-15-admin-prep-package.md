# 2026-11-15 — Admin-prep package (runtime freeze intact, ops hold)

**Runtime freeze:** `74c30236a03583675f39d1a97b79c19a60d58da5`  
**Original package record:** `f78d585606cb77fb7f5cf01715dd5624c94a5ef5`  
**Original zip SHA256:** `483686e17141a24b12561169aaa51a0a9a7ccd91cba0e47703eb128f1fd24175` (immutable)  
**Metadata r2:** prefix `kaiyue_admin_prep_74c3023_metadata_r2_` — metadata-only supersession of catalogs/config wording. Runtime/entry/photos/CLI bytes unchanged.  
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

Original `transfer_manifest.txt` (immutable) embeds a stale primary-sums line `253a8ae0…  2986` while the delivered `sha256sums.txt` is `2c4c1b0a…  3264`. That catalog is circular/stale and is **not** rewritten. Metadata r2 uses a new prefix and acyclic catalogs instead.

## Metadata r2 (catalogs/config only)

Original artifacts stay immutable. New prefix `kaiyue_admin_prep_74c3023_metadata_r2_`. No `pnpm build`. Zip member diff: only `DEPLOYMENT-CONFIG.json` and `OPERATOR-CLI-PLAN.txt` changed; 154 other members including `entry.js` and 41 photos unchanged.

| Item | SHA256 |
|---|---|
| Original zip (immutable) | `483686e17141a24b12561169aaa51a0a9a7ccd91cba0e47703eb128f1fd24175` |
| r2 production zip | `4e8011c9a76fe936253a0197b8fc700ef4faaaee37bffd4f36ff6a46fd77e18c` |
| r2 supplement zip | `7fcd640f874d2f3b830cc262d9bd196e568af52a97a55e99a04ff9b677510122` |
| r2 primary sha256sums (hashes the two zips only; not itself) | `712dc89dcfab4363ab3a60f3d1ef1a66141f7332ff37ffbcdb73d59c7b671444` |
| entry.js (unchanged) | `b4241b58214a13ff67f44b70b82192fb868ff496f953a8b30b63a41bd4be41ee` |
| assets ledger (unchanged) | `19df8de4dd5467896098954e4b1040f2fbef3490dc7e2dd3da1c616f4e7fdd02` |
| standalone CLI (unchanged) | `e7f104973dcdaa16d2fb201d90eeea1abae48c78f5328589fd348f44e32a1e2d` |

DEPLOYMENT-CONFIG r2: dedicated host `admin.kaiyuemacau.com` Better Auth password path when **both** Access vars are absent; partial Access fails closed; public apex/www 403; host not yet attached/live. Current rollback target from 33ecc read-only 2026-11-15 14:52:49 Asia/Macau: version `71a66a99-0605-401f-9997-e6d3c3e9561b` @100%, deployment `f3169afb-ccb7-4c52-9fde-b043cd15854d`, annotation `cd33cf8c` / live `9ff81925`. Repeat readback before any apply. `5b859f36` retained as labelled prior-release history only. Overlay `keep_vars` omissions are **not** final bindings approval.

Operational HOLD: allowlist / primary ENV / secrets / readback / browser QA. Trial overlay remains **DO_NOT_DEPLOY** (sentinel not substituted). Official UAT overlay remains **DO_NOT_UPLOAD**. Not release / not staging acceptance.

Later 16:55 Asia/Macau resource+probe closeout (docs only; this package zip unchanged): official trial D1 `06aa844b-da6b-4c37-896c-fd13dd265fe6` and R2 `d937f5bc01e448afa679bdbf3769ed50` exist; Worker not created. Observed REST single `/query` semicolon-joined SQL probes A–E PASS on that D1; mid-request interruption UNPROVEN; `wrangler d1 execute --file` / binding batch / REST batch array UNTESTED. Evidence: `docs/records/2026-11-15-admin-trial-safety-evidence/` (`REPORT.md` `ba1eed6e`, index `4a487034`). Runtime freeze `74c30236` and metadata r2 zip `4e8011c9` preserved.

Acyclic catalogs: r2 transfer_manifest lists data files and does **not** embed the primary-sums digest. Primary sums hash the two r2 zips only and do **not** hash themselves. This committed record pins the primary-sums digest `712dc89dcfab4363ab3a60f3d1ef1a66141f7332ff37ffbcdb73d59c7b671444`.

## Next

Ops remain on hold. Independent Mika review of the 16:55 trial-resource evidence. Do not upload while trial overlay still carries the uncreated D1 sentinel. Secure process credential fill, final bindings, and dedicated-host browser QA remain open. Repeat official 33ecc version readback before any apply.
