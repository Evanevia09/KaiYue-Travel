# Staging rollback provenance (prep only; not executed)

Snapshot: 2026-11-11 01:34:24 Asia/Macau (2026-11-10T17:34:24Z).  
Account Kai Yue `33ecc75158a1cdd23ba1a62eb70c5103`. GET only. No upload, deploy, seed, merge, or server restart.

This note distinguishes **verified platform metadata** (Cloudflare GET this snapshot) from **documentation-backed expected rollback behavior** (not tested).

## Verified platform metadata

Script `kaiyue-travel-staging` is currently serving version `b53c0353-bfc4-4700-a5c7-725b7167af6e` at **100%**.

| Field | Value |
| --- | --- |
| Current deployment id | `caeee848-fb0d-4914-a770-2d60996f106e` |
| Strategy / traffic | `percentage`, 100% on `b53c0353-…` |
| Deployment / version created | 2026-11-10 22:40:34 Asia/Macau (`2026-11-10T14:40:34.100062Z`) |
| Version number | 5 of 5 listed |
| Source / trigger | `api`, annotation `workers/triggered_by=secret` |
| Script etag | `7083e9d37b7d48f57a04082ab96dfddee7d04b07e9f8231ff6e5a2f9cadf3c9c` |
| Compatibility | `2026-09-01`, `nodejs_compat` |
| D1 binding | name `DB`, id `043cd0ff-a1e6-4b5e-98c1-968c286e0c70` |
| R2 binding | name `OFFERS_BUCKET`, bucket `kaiyue-offers-staging` |
| Assets binding | `ASSETS` type `assets` is present |
| Version asset config | `resources.script_runtime.assets` present (`serve_directly=true`, base path `/`, header and redirect rules recorded) |
| Asset file list / content hashes | **not** returned by these GET APIs |

The proposed rollback id is therefore the **currently deployed** staging version, not a currently idle prior version. It exists in the staging version list and can be named in a later deployment. This id was **not** recorded in the hashed complete-ledger proposal.

Settings GET has no top-level `assets` field. Asset *presence* is verified via the `ASSETS` binding and version `script_runtime.assets` config. This snapshot does **not** inventory or hash stored asset files and does **not** claim a complete content backup.

Production `kaiyue-travel` is unchanged since 2026-11-05 17:38:49 Asia/Macau: one version `74ebe1fc-135d-4a97-b297-e2d1d2748fa0` at 100% (deployment `f28d63c0-c372-4c2d-a4ad-5743ff2781aa`). Production D1 `06cf879d-8fea-4088-8881-7d382e1b8c11` and R2 `kaiyue-offers-production` are distinct from staging.

Secret values were not fetched. Staging `secret_text` name only: `BETTER_AUTH_SECRET`.

## Documentation-backed expected rollback behavior (not tested)

No Create Deployment or other write was issued.

Official Deployments API: `POST /accounts/{account_id}/workers/scripts/{script_name}/deployments` configures which **already uploaded** Worker Versions receive traffic (`strategy: percentage`, `versions: [{ version_id, percentage }]`). The first listed deployment is the one actively serving traffic.

Official static-assets / Direct Upload docs associate uploaded assets with a **Worker version**. Redeploying version `b53c0353-…` is therefore expected to put that version’s script **and that version’s attached assets** back on traffic, without a new asset upload.

Create Deployment is not a D1 or R2 data API. The version’s bindings already point at staging D1 `043cd0ff-…` and R2 `kaiyue-offers-staging`. A traffic switch to this version is **not documented** to mutate D1 rows or R2 objects. Bindings must not be rewritten to production IDs or to obsolete D1 `069aa442-…`.

Because this version is already 100% on staging, a rollback POST **now** would only create a new deployment record of the same version (not tested). After a future staging trial upload, rollback would be:

```json
{
  "strategy": "percentage",
  "versions": [
    { "version_id": "b53c0353-bfc4-4700-a5c7-725b7167af6e", "percentage": 100 }
  ],
  "annotations": {
    "workers/message": "Rollback kaiyue-travel-staging to pre-trial version b53c0353. D1 unchanged."
  }
}
```

Target script: `kaiyue-travel-staging` only. Do not call this on `kaiyue-travel`. Do not retry production Workers Builds. Do not execute this plan until authorized.

## Evidence files

- `docs/records/2026-11-11-staging-rollback-evidence.sanitized.json` — GET snapshot
- `docs/records/2026-11-11-staging-rollback-plan.md` — this note
- `docs/records/2026-11-11-staging-rollback.SHA256SUMS` — hashes of the evidence JSON and this note
