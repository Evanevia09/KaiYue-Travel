# 2026-11-10 — Staging additive-asset upload is a hard blocker

**task_id:** `kai-yue-temporary-admin-login-20261110`  
Not `user_accepted`. Not `released`. No merge, upload, or deploy from this record.

## Verdict

There is **no sanctioned additive API** that installs the 14 missing `/_astro` admin/login files while retaining the unpublished public asset set, because a complete current ledger is unavailable and there is no list/export API.

Do **not** PUT `keep_assets:true` together with a 14-file `assets.jwt`. Official Upload Worker metadata: an explicit `assets` upload **takes precedence** over `keep_assets` and is **not a union**. The assets-upload-session manifest is the **version ledger**, not a patch.

## Confirmed Cloudflare semantics

- [Upload Worker](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/methods/update/): `keep_assets` retains a previously uploaded version’s assets **in lieu of** a completion token. “An explicit `assets` upload takes precedence over `keep_assets`.”
- [Direct upload](https://developers.cloudflare.com/workers/static-assets/direct-upload/): the manifest “keeps track of files we want to use in our Worker” and is “used to track assets associated with **each Worker version**.”
- [Multipart metadata](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/): `assets.jwt` authorizes attaching that token’s asset set; `keep_assets` is the alternative to that token.
- [Routing](https://developers.cloudflare.com/workers/static-assets/): matching assets are served **without** the Worker. `run_worker_first` as a path array is official (≤100 rules) but is **assets.config**.
- Community reproduction (unanswered by Cloudflare staff, 2026-11-04): `keep_assets:true` plus `assets.config.run_worker_first` succeeds but **does not** change routing (`serve_directly` stays true). Switching to worker-first required uploading a **known complete** manifest.

## Live evidence (staging, 2026-11-10)

| Request | Result | Worker middleware headers (`x-request-id`, `x-content-type-options`)? |
| --- | --- | --- |
| `/login` | 403 JSON `no-store` | yes (gate) |
| `/api/v1/bookings` | 404 JSON `no-store` | yes |
| `/_astro/LoginForm.DI7HqLqN.js` | 404 HTML, `cf-cache-status: HIT`, body sha256 `68b18140…` = `404.html` | **no** |
| `/_astro/definitely-missing-zzzz.js` | same 404 HTML | **no** |
| `/this-is-not-a-file` | same 404 HTML | **no** |
| `/_astro/BookingForm.BY2srzpk.js` | 200 JS immutable | asset store (existing) |

Missing hashed JS never reaches the Worker, including `Sec-Fetch-Mode: cors` / `no-cors` / `navigate`. Embedding the 14 files as Worker text modules therefore cannot serve them unless routing is changed so those paths invoke the Worker first.

## Rejected approaches

| Idea | Why not |
| --- | --- |
| `keep_assets:true` + 14-file `assets.jwt` | Explicit `assets` replaces the version ledger; public files absent from the 14-file manifest are dropped. |
| `keep_assets:true` + `assets.config.run_worker_first` for only those 14 paths, no jwt | Official field exists, but `keep_assets` does not apply new `assets.config`; community repro shows routing unchanged. Inventing “config-only assets without jwt” would be an unsanctioned API. |
| `keep_assets:true` + extra text modules, no routing change | Live unmatched `/_astro` requests never hit the Worker. |
| `run_worker_first: true` for all requests | Broad asset routing; still needs `assets.config` to take effect; same keep_assets gap. |
| Full local `dist/client` wrangler upload | That **is** a complete replacement ledger from this build. Public JS hashes match, but HTML/unknown live-only files would be replaced. Forbidden here. |
| Extra R2/KV/service/Worker/tunnel | Out of scope. |

## What remains allowed (not a working `/login`)

A script-only PUT with `keep_assets:true` and **no** `assets` object keeps public assets and can ship new Worker JS (`/login` SSR). The emitted `/_astro/LoginForm.DI7HqLqN.js` (and `api._aekQyCR.js`, etc.) still 404 as `404.html`. That is not a staging trial of password login.

Unblockers that are **not** this agent inventing APIs: Cloudflare-provided complete manifest/export of the current staging asset set, or an official documented additive-asset operation. Independent review and staging approval still required before any mutation.

## Provisioning (separate)

Box firewall blocks loopback browser fill. Do not tunnel or expose the hasher. If `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are already in the PM process environment, `node provision-admin.mjs` (standalone zip) or `node scripts/provision-admin-local.mjs` hashes to stdout and does not bind a port. Never log or paste the password.
