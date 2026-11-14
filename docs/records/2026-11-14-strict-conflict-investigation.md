# Staging --strict conflict investigation — 2026-11-14 (Asia/Macau)

**This is a read-only investigation.** It is not authorization to disable `--strict`, retry the upload, promote, attach a hostname, or change the GitHub build connection. Owner later approved GitHub auto-deploy to staging after the dashboard is verified, with production still requiring manual approval; that work stays queued and was not started.

**Zone:** Asia/Macau (CST, UTC+8). Written after dry-runs completed at 11:56:54–11:57:12 CST (Asia/Macau).

## Account, bytes, traffic

Account still only Kai Yue `33ecc75158a1cdd23ba1a62eb70c5103` (`scalingsmb@gmail.com`). Credential files were not read. Frozen hashes are unchanged: zip `b5b0be97…2bf5`, `entry.js` `646f7dc7…20d9`, `SOURCE-SHA` `fa5184ccda2d149c2d4acb8914db315ca8e5b4c4`, overlay `11ead30e…0bb6`.

Staging traffic is unchanged: 100% version `b53c0353-bfc4-4700-a5c7-725b7167af6e` on deployment `caeee848-fb0d-4914-a770-2d60996f106e` (2026-11-10 22:40:34 CST Asia/Macau). Production remains the owner's later photo version `5b859f36-39c5-43aa-817a-434d56ae8214` / deployment `7c72bf5a-…` (2026-11-13 13:27:13 CST Asia/Macau) and was not touched.

## Exact `--strict` semantics (Wrangler 4.132.0 + official docs)

Pinned help: `--strict` “prevents uploads when there are conflicting remote changes.” Official `versions upload` docs use the same wording. The deploy-command docs add that strict mode is more defensive in non-interactive environments.

Pinned source (`deploy-confirm.ts` + `is-interactive.ts` + `preUploadApiChecks`):

- `isNonInteractiveOrCI()` is true when stdin/stdout are not a TTY, or when a CI environment is detected.
- If **non-interactive and `--strict`**, every `deployConfirm()` aborts immediately with: `Aborting the upload operation because of conflicts. To override and upload anyway, remove the `--strict` flag`.
- If **non-interactive without `--strict`**, every such prompt is auto-confirmed.
- If **interactive**, even with `--strict`, Wrangler uses a real yes/no prompt.

The warning we saw is triggered unconditionally when service metadata has `last_deployed_from === "api"` (confirmed live on `kaiyue-travel-staging`). Unlike a dashboard (`dash`) last-update, the `api` branch does **not** diff remote vs local settings; it always warns that script-API edits will be overridden by local code and config, then asks “Would you like to continue?”

Other confirm triggers (dashboard destructive diff, vars/bindings whose names collide with remote secrets, workflow conflicts) did not apply here. Overlay vars do not include `BETTER_AUTH_SECRET`, so a secrets-override confirm would not have fired.

There is **no** 4.132.0 flag that keeps `--strict` but skips only the script-API warning.

`--dry-run` is safe for packaging: `preUploadApiChecks` returns immediately, `syncAssets` is skipped, and `POST /accounts/.../scripts/.../versions` is not sent. All four dry-runs exited 0 with `--dry-run: exiting now.`

## Safer sanctioned path that retains `--strict`

Run the reviewed command, still including `--strict`, from an **interactive TTY** (not CI) and have the operator answer yes after the script-API warning. That is what the pinned source does. This agent box is non-interactive, so the same command will keep aborting here.

Dropping `--strict` is the only official non-interactive override Wrangler prints. That would auto-confirm every `deployConfirm` in the run. It is a departure from the reviewed command and is **not authorized** by this investigation.

## Would dropping `--strict` overwrite more than the authorized staging files replacement?

For `versions upload` (not `wrangler deploy` / `versions deploy`):

**Would not change:** traffic; apex/www routes (still production `kaiyue-travel`); custom domains (none); cron (none); script-level `logpush` (`false`) and `observability` (`null`) — those fields are omitted from the versions-upload payload; workers.dev `enabled=true` and `previews_enabled=false` (already match overlay); secrets (`keepSecrets: true` always; docs: secrets are never deleted); D1/R2 data; production.

**Would set on a new, not-yet-promoted version:** frozen `entry.js` and `dist-client` (authorized replacement); required `assets.run_worker_first=true` (live version still has `raw_run_worker_first=false` / `serve_directly=true`); compatibility date/flags already match; overlay bindings; inherited `BETTER_AUTH_SECRET`; `--keep-vars` keeps any extra remote vars (none today). `last_deployed_from` would become `wrangler`.

Live vars, D1 `043cd0ff-…`, and R2 `kaiyue-offers-staging` already match the overlay. No meaningful live staging *settings* would be lost if the upload used `--keep-vars` and was not promoted. The script-API warning is a blanket source warning, not a list of extra hidden settings.

Unintended packaging is the real extra risk: a dirty-dir upload would also attach 71 Text modules (see below). That is not a live setting being deleted; it is extra worker content.

## 71 extra modules

`--no-bundle` uses `noBundleWorker`, which collects additional modules unless `find_additional_modules` is explicitly `false`. Default rules (pinned `rules.ts`): Text `**/*.{txt,html,sql}`, Data `**/*.bin`, CompiledWasm `**/*.wasm`. Official docs: `find_additional_modules` defaults to true when `no_bundle` is true. `base_dir` defaults to the directory containing `entry.js`.

`entry.js` is a self-contained pre-bundle. The only apparent `./data-store-writer.js` hit is a JSDoc `{@link import(...)}`, not a runtime import. The Cloudflare image-passthrough endpoint is already inlined in the page map. Runtime builtins only: `cloudflare:workers`, `node:crypto`. No extra JS/txt/html/sql/wasm files are required as Worker modules. `dist-client` remains required as **assets**, not as modules. Migrations are not runtime dependencies of `entry.js` and must not be applied to D1 as part of this upload.

Dry-run results (Wrangler 4.132.0, `--strict --dry-run`, hashes unchanged):

| Layout | `--assets` | Extra modules | Total upload |
| --- | --- | ---: | --- |
| A. Full unzip cwd (reviewed unpack) | `./dist-client` | **71** (sidecar txt + 8 SQL + 61 html/txt under dist-client) | 5396.90 KiB / gzip 937.65 KiB |
| B. Only `entry.js` + unchanged overlay; assets outside base_dir | absolute path to frozen `dist-client` | **0** | 4089.04 KiB / gzip 821.09 KiB |
| C. Same as B plus a *symlink* `dist-client` | `./dist-client` | 0, **misleading** (discovery did not follow the symlink) | same as B |
| D. Only those files plus a *real* `dist-client` copy | `./dist-client` | **61** (html/robots only; sidecars gone) | 5385.20 KiB / gzip 935.16 KiB |

So the reviewed “unpack so `entry.js` and `dist-client` are at the working-directory root” layout is exactly what pulls marketing HTML into the Worker as Text modules. `--assets` does not exclude that tree from `find_additional_modules`.

## Proposed command / directory (not executed)

Keep the overlay hash and pinned 4.132.0. Put only `entry.js` and `wrangler.staging-artifact.jsonc` in the worker base_dir. Leave frozen `dist-client` outside that directory and point `--assets` at it. A ready copy already exists at:

`/workspace/kaiyue-fa5184c-staging-packaging-dryrun-20261114-115654cst/clean-entry-only`

```text
cd /workspace/kaiyue-fa5184c-staging-packaging-dryrun-20261114-115654cst/clean-entry-only
npx wrangler@4.132.0 versions upload ./entry.js \
  --config ./wrangler.staging-artifact.jsonc \
  --no-bundle \
  --assets /workspace/kaiyue-fa5184c-staging-upload-20261114-1147cst/dist-client \
  --name kaiyue-travel-staging \
  --keep-vars \
  --strict \
  --message "PR26 fa5184ccda2d149c2d4acb8914db315ca8e5b4c4 staging trial"
```

Departures from the previously reviewed line: clean cwd; `--assets` is an absolute path instead of `./dist-client`. `--strict` is still present, so on this non-interactive box it would still abort on `last_deployed_from=api`. An interactive operator confirm would be required to proceed with `--strict` retained.

An overlay edit (`find_additional_modules: false`, or moving `main` into a subdirectory so `./dist-client` can stay in cwd) would also stop the extra modules, but would change the overlay hash. That was not applied.

## Mika re-review

Yes, before any retry that drops `--strict` or edits the overlay. Also yes for the clean-directory / `--assets` path change, because that departs from the unpack-in-place instructions in the Nov 12 review and changes the module set that would be uploaded.

An interactive confirm of the *same* `--strict` command is the official path and does not change the command text; Mika should still be asked to acknowledge the script-API override warning and the packaging fix, because the earlier review did not exercise either.

No source rebuild and no writer/repo change is required.

Machine-readable evidence: `STRICT-CONFLICT-INVESTIGATION-2026-11-14-1157-CST.sanitized.json`.
