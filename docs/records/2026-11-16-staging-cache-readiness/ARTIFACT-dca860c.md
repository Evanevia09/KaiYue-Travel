# Artifact verification — `dca860c59b03c0407293f087a158a855b04c60df`

**task_id:** `kaiyue-production-readiness-20261116`  
**Kind:** read-only generated overlay-main / Wrangler-bundle inspection. Not a promotion. No Cloudflare upload, purge, auth, D1, mail, or secrets.

Mika source PASS of exact `dca860c59b03c0407293f087a158a855b04c60df` (B1–B3 closed). This packet is the remaining artifact mapping: overlay `main` → wrapper → real Astro `handle` → `ASSETS`, executed against the **built** marketing `index.html`.

## Commands / SHA

| Item | Value |
|---|---|
| Source SHA | `dca860c59b03c0407293f087a158a855b04c60df` (git clean) |
| Staging-URL build | `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com pnpm build` (existing `apps/web/dist` from that SHA’s functional tree; wrap logged `wrapped dist/server/entry.mjs ahead of adapter asset fallback`) |
| Wrangler bundle | Wrangler **4.132.0** `deploy --dry-run --outdir … --config deploy/official-staging/wrangler.jsonc` with `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` unset. Exit `--dry-run: exiting now.` No upload. |
| Outside git | `/opt/cursor/artifacts/kaiyue_dca860c_entry_artifact_20261116/` |

Generated `apps/web/dist/server/wrangler.json` is **not** the upload overlay: Astro wrote it from `apps/web/wrangler.jsonc` (`no_bundle: true`, local/dev vars). Official-staging overlay `main` is `../../apps/web/dist/server/entry.mjs` and **does** bundle.

## Mapping

```
deploy/official-staging/wrangler.jsonc
  main: ../../apps/web/dist/server/entry.mjs          (wrapper)
  assets.directory: ../../apps/web/dist/client
  assets.run_worker_first: true
        │
        ▼
dist/server/entry.mjs
  import astro from "./astro-entry.mjs"
  import { createWorkerFetch } from "../../src/lib/server/worker-entry.ts"
  export default { fetch: createWorkerFetch((req, env, ctx) => astro.fetch(...)) }
        │
        ▼
dist/server/astro-entry.mjs  (= generated @astrojs/cloudflare handle)
  worker_entry_default = { fetch: handle }
  handle:
    matchStaticAsset(manifest, url, env)     // if pathname in manifest.assets → ASSETS.fetch(url minus .html)
    app.match(request)                       // prerendered `/` is undefined
    fallbackToAssets(url, env)               // ASSETS.fetch(url minus index.html / .html); keep non-404
    app.render(...)                          // middleware only after that
        │
        ▼
Wrangler dry-run bundle entry.js (export)
  export default {
    fetch: createWorkerFetch((req, env, ctx) => worker_entry_default.fetch(...))
  }
```

Git blobs at this SHA: `worker-entry.ts` `4de801950c3477523607c71c3e6bc6b3893d01db`; `wrap-worker-entry.mjs` `b9dad02de9ee86565d287841c8beeb1b01f5b85d`; overlay `666e3d9b6500032de0074394046e57fb9c300f4a`.

## Hashes (content SHA256)

| File | bytes | sha256 |
|---|---:|---|
| overlay `main` wrapper `dist/server/entry.mjs` | 217 | `6ccca660aaf21aa42bb685d1ca238cabe5aa22adcd6c27898f970e32dc66a518` |
| generated adapter `dist/server/astro-entry.mjs` | 5693 | `5af87f618e6a76acfcbb3a28a83fe026ee499d00a094fcf5259f5550d6f3fc6e` |
| built marketing `dist/client/index.html` | 31184 | `69edbe4e5d29a7750e0544ebfaa8d803816bec7cd7f1c9db68e3f06d2c3a2ae7` |
| overlay jsonc | 1428 | `fdf1b2139c04e74f3e5085ffb6d3dce685f1ba2fb49b54346b2e8a785a54a268` |
| Wrangler dry-run `entry.js` | 5085113 | `6ef91c823117b4b7406ee693378e85c9bb2d7e44ac7bbb1e70c68d5934d28496` |
| artifact MANIFEST.json | 2442 | `7fc113539bd37a6e9f2a795297ca6a06645f966523e2240c8f4a2f6fe1e5b4b9` |
| probe result.json | 1947 | `57f184793a32908d511a56939caafb41d160c23c3fe0fef787b19a8da6588a83` |

This build’s `index.html` is **not** live HIT body `9831b439a1ed…` (31145 bytes on `2a270e59`). Canonical in this file is `https://staging.kaiyuemacau.com/`. Title: “Private chauffeur across the Greater Bay Area · Kai Yue Travel”.

Generated manifest.assets **includes** `/index.html` and hashed `/_astro/*`; it **does not** include `/`. Ungated `/` therefore uses `fallbackToAssets` (`ASSETS.fetch` of `/`). Ungated `/index.html` uses `matchStaticAsset` (`ASSETS.fetch` of URL with `.html` stripped → `/index`). That is adapter behavior, not a wrap defect: the wrap still runs first on dedicated-admin hosts.

## Execution (real built HTML, real Wrangler `entry.js`)

Node imported the dry-run bundle with a local `cloudflare:workers` stub only. `env.ASSETS.fetch` read `apps/web/dist/client` files. No network.

| Request | status | Location | ASSETS calls | body |
|---|---:|---|---|---|
| `https://admin-staging.kaiyuemacau.com/` | 302 | `/login` | **none** | empty; `cache-control: private, no-store, no-cache, must-revalidate` |
| `https://admin-staging.kaiyuemacau.com/index.html` | 302 | `/login` | **none** | empty; same no-store |
| `https://staging.kaiyuemacau.com/` | 200 | — | `https://staging.kaiyuemacau.com/` | 31184 bytes, sha256 `69edbe4e…` = built `index.html` |
| `https://staging.kaiyuemacau.com/index.html` | 200 | — | `https://staging.kaiyuemacau.com/index` | same 31184 / `69edbe4e…` |
| `https://admin-staging.kaiyuemacau.com/_astro/BaseLayout.2fC54KN7.css` | 200 | — | that CSS URL | hashed asset; not marketing |

No functional defect. Gate runs before `ASSETS.fetch` on dedicated-admin `/` and `/index.html`. Public marketing and hashed `/_astro/` still serve the real build.

## Limits

- This is local workerd-bundle **import** + filesystem ASSETS, not a Cloudflare origin miss and not live admin-staging.
- Dry-run is compile-only; it is not `versions upload` / activate.
- Not `user_accepted`. Not `released`. Do not push `official-staging` / `main`.
