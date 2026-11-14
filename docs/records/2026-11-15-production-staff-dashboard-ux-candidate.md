# Production-safe staff-dashboard UX candidate — prepare-only → live closeout

**As-of:** 2026-11-15 Asia/Macau
**Branch:** `cursor/promote-staff-dashboard-ux-from-live-2cad` (PR #35; do **not** merge into `main`)
**Freeze SHA (package):** `cd33cf8c8bb876171d55de1d062668877f51e833`
**Docs HEAD after this closeout:** recorded at commit time
**Writer run (not a parent Lab id):** `bc-38ae08ab-8286-5b33-ac65-b28874582cad`
**Owner authorizations recorded as given:** t139u / t143u / t146u. Parent Lab event id is **unavailable here and is not invented**.
**Production source pointer (pre-release):** `9ff81925d722bb5f9fbdd2af3ef609d72ada8ecc`
**UX delta source:** `8ed952a7ec7ec96d306ac44b226723640fc99c55`

**Statuses (keep distinct):**
- `implemented` / `checked` / `pushed` / report delivered: this candidate branch
- owner-authorized live: Evan t139u/t143u/t146u; board site approval direct 06:06
- `user_accepted` as live Worker: user result delivered 06:29
- `deployed` / `released` on account `33ecc` script `kaiyue-travel`: inactive upload `71a66a99-0605-401f-9997-e6d3c3e9561b` at 06:21:29; separate 100% activation 15 Nov 06:23:32 Macau, deployment `f3169afb-ccb7-4c52-9fde-b043cd15854d`
- GitHub `main` is **not** merged. Staging PR #34 is unchanged.

Historical candidate provenance below is preserved. Frozen zip was **not** rebuilt.

## Isolation

- Sole RUNNING cloud writer observed: this run. PR #33/#26 agents not RUNNING.
- PR #34 `dad60edf` / runtime `d8c8bd20` **must not merge**. Official staging Worker `61bc5a03` / deployment `278d6872` stays as-is.
- PR #26 `2b12338c` preserved (temp-admin). Never ship to production.
- PR #32 preserved (this SHA is its head). Do not merge #32 from this writer.
- Agent Lab `shared-project-start-close.md` / `project-context-pointers.md` / `mika-github-return-producer.md`: **unavailable** in this environment. SHA/as-of not inventable. Queue not published. Obsidian not written.

## Independent live-source check (not authority)

`git rev-list --left-right --count 9ff81925...origin/main` = **10 8**.

From `main` `037b93ad`: 8 ahead / 10 behind `9ff81925`. Matches the technical-review count.

| Layer | Evidence |
|---|---|
| Photos | `apps/web/public/images` 41/41 blobs equal between `9ff81925` and `037b93ad`. Illustrative subset 32/32 equal. (A “37/37” count was not reproduced as a path set; equal-blob result is 41 and 32.) |
| Admin gate | blobs differ: `9ff81925` `8c68e42c` vs `main`/`8ed952a7` `787f013a` |
| Middleware | blobs differ: `9ff81925` `ad7117e1` vs `main` `18249e34` |
| `auth.ts` | blobs differ: `9ff81925` `597d12da` vs `main` `7e9494af` |
| Git `wrangler.jsonc` | **same** blob `60a190d3` on `9ff81925`, `main`, and `8ed952a7` (live Worker name + obsolete D1 `069aa442` + `ADMIN_EMAILS=admin-test@kaiyue.test`). **Do not upload git wrangler.** |
| Schema | no migration diff in the UX cherry-pick vs `9ff81925` |

This branch keeps `9ff81925` admin-gate / middleware / auth / git wrangler. UX files match the `8ed952a7` delta set (29 product files + docs/07 UX bullets).

Live assets mode recorded for overlay: **serve_directly=true**, **run_worker_first=false**. Do not copy staging overlay `run_worker_first=true`.

Live production currently has **no** `ADMIN_EMAILS`, `TEMP_ADMIN_EXPIRES_AT`, `ADMIN_STAGING_TEST_PASSWORD_MIN`, or `BETTER_AUTH_SECRET` (technical-review statement; overlay omits them; `--keep-vars` must not add them). This branch does **not** add staging D1 `043cd0ff` to git wrangler.

## Tourist-board / MGTO / DSAT (evidence only)

`BUSINESS_INFORMATION.md` is the **same blob** on `9ff81925` and `037b93ad` (`73283182`).

Recorded there, not re-interpreted as current licence status:

- Tourism license (older extract): Macau Tourism Bureau license No. 0162
- Source-reported license validity (older extract): **2026-09-20**
- File says this “should be reconfirmed before being featured prominently”
- Reconfirmation list still includes “Current Macau Tourism Bureau license status and expiry date”
- Group-portfolio B2B pages mention MGTO travel-agency licence and DSAT tourist passenger-transport licence **with no numbers published**

Repo search found **no** current MGTO/DSAT clearance document or dated approval for this dashboard UX promote. Owner 05:47 promotion request is **not** tourist-board approval. This writer does **not** claim licence valid or expired and does **not** waive the publication gate.

**Closeout update:** owner separately answered YES at 06:06 that Macao tourist board has approved the **site**. That clears the publication gate for this release. Licence number/validity claims remain **unverified** and are not asserted.

## Admin 403 regression (automated)

`tests/integration/admin-gate.test.ts` asserts fail-closed 403 on:

- `https://kaiyue-travel.scalingsmb.workers.dev`
- `https://kaiyuemacau.com`
- `https://www.kaiyuemacau.com`

for `/admin`, `/login`, `/setup-admin`, `/api/v1/admin/bookings`, `/api/admin/offers` (and listed password paths via `assertLiveAdminSurface`). `DEV_ADMIN_BYPASS=true` does not open apex `/login`. Existing `admin.kaiyuemacau.com` Access-host tests from `9ff81925` are unchanged.

375px / <480px staff UX: **unverified** (staging browser min ~485–500px only).

## Overlay / package hashes

Freeze SHA (do not rerun the ledger on later docs-only commits): `cd33cf8c8bb876171d55de1d062668877f51e833`.
Overlay path: `docs/records/wrangler.production-artifact.jsonc`.
Zip is local-only (`artifacts/` gitignored). Dry-run wrangler printed git bindings (`069aa442`, `ADMIN_EMAILS=admin-test@kaiyue.test`); that is **not** the upload config. Zip `wrangler.jsonc` is the overlay (D1 `06cf879d`, `run_worker_first=false`, no those vars).

| Item | Value |
|---|---|
| Overlay SHA256 | `fbed31586d74ac2ebdae03e047294eda6da0456c07d4ea553081e0eba888e03d` |
| Zip wrangler.jsonc SHA256 | `6b0597e7ee05a0ea0551fc58b1f047557e41d7f61248600d09ccd5722eb1b276` |
| Ledger zip SHA256 | `dbac8f9b957d1d09b18c58a0df25718f2582af90790ffa236c59587238261ca5` (9992675 bytes) |
| entry.js SHA256 | `024ab81b3e7bcdfb929d070ec1c72a3a38ce1505c070997257028b7108a70797` |
| Ledger files | 136 |
| Freeze SHA | `cd33cf8c8bb876171d55de1d062668877f51e833` |

Report SHA256 is of this file after the hash-record commit (not inside the freeze zip).

## Local checks

| Check | Result |
|---|---|
| lint | pass (`prettier --check .`; `artifacts/` gitignored) |
| typecheck | pass (0 errors, 3 existing hints) |
| unit/integration | **137/137**, including public-host `/admin` `/login` 403 on apex, www, and legacy workers.dev |
| production build | pass (`PUBLIC_SITE_URL=https://kaiyuemacau.com`); built `/zh-Hant` still contains 包車接送 |
| ledger dry-run | pass; `--dry-run` only; no upload |

## Conflicts / blockers

- GitHub `main` is **not** the live Worker source. Merging this PR into `main` would also bring `9ff81925` Access-host gate history that `main` does not have. Review against `9ff81925`, not as a main+UX cherry-pick.
- Git `wrangler.jsonc` remains unsafe to upload (069aa442 + live name + `admin-test@kaiyue.test`). Operators must use the overlay.
- Do not upload this branch to staging (would omit live UAT password policy on PR #34).
- Tourist-board/MGTO current clearance absent.
- Email Service / notifications: **separate**; not implemented here.

## Safe release plan (review only; not execution)

1. Review UX file diff vs `9ff81925` and confirm admin-gate blob still `8c68e42c`.
2. Confirm overlay: `run_worker_first=false`, D1 `06cf879d`, no forbidden vars/staging D1.
3. After a **separate** upload authorization: unzip ledger, `npx wrangler versions upload --no-bundle --keep-vars --strict --name kaiyue-travel` on account `33ecc` only. Do not `wrangler deploy` (100%) until a second activate authorization. Rollback of a new 100% is current live `5b859f36`.
4. Post-activate verify: `/admin` `/login` 403 on apex/www; Version 2 photos; 包車接送; EN/zh-Hant/PT.

## Notifications (inventory only; next work)

Unchanged from live source: Resend persist-first staff mail on email-channel bookings and all contact creates; skip without `RESEND_API_KEY`. No `send_email` binding. Cloudflare Email Service requires Cloudflare DNS, domain onboard, `cf-bounce` SPF/DKIM/DMARC, and a `send_email` binding — **not verified/onboarded this run**. No sends.

Next separate task (plan only): `kai-yue-cloudflare-form-notifications-20261115` after this closeout checkpoint. Owner 06:24: later create email notifications for form submissions using Cloudflare mail.

## CLOSEOUT — live on 33ecc (2026-11-15)

Do **not** merge this PR into `main`. Do **not** rebuild the freeze.

| Item | Value |
|---|---|
| Freeze SHA | `cd33cf8c8bb876171d55de1d062668877f51e833` |
| Zip SHA256 | `dbac8f9b957d1d09b18c58a0df25718f2582af90790ffa236c59587238261ca5` (9992675 bytes) |
| entry.js | `024ab81b3e7bcdfb929d070ec1c72a3a38ce1505c070997257028b7108a70797` |
| Overlay | `fbed31586d74ac2ebdae03e047294eda6da0456c07d4ea553081e0eba888e03d` |
| Independent review | Mika ARTIFACT PASS on those hashes + all 136 assets; post-commit exact-tree **137/137** on `cd33cf8c` |
| Account / script | `33ecc75158a1cdd23ba1a62eb70c5103` / `kaiyue-travel` |
| Inactive upload | `71a66a99-0605-401f-9997-e6d3c3e9561b` 06:21:29 |
| 100% activation | 15 Nov 06:23:32 Macau, deployment `f3169afb-ccb7-4c52-9fde-b043cd15854d` |
| Rollback | version `5b859f36-39c5-43aa-817a-434d56ae8214` / deployment `7c72bf5a-df8b-407c-83d5-774159d10b41` |
| Readback | production D1 `06cf879d`; R2 `kaiyue-offers-production`; `serve_directly=true` / `run_worker_first=false`; no temporary vars/secrets |
| HTTP | GET 12 pages + 30 images 200; apex/www `/admin` `/login` 403 |
| Browser final 06:29 | EN/zh-Hant/PT homes and `/special-offers` catalogs render; Version 2 hero/cards good; 包車接送; catalog proper no-published-offers state; no public console errors/failed requests; all 4 admin/login 403. Real Chrome ~460px public layout/menu + PT catalog usable. **Not** 375px staff-mobile verification. |
| Screenshots | parent `/workspace/...browser-qa`. **This VM does not have them.** |
| User result | delivered 06:29 |
| Not done | no submissions/mail/WhatsApp/data/DNS/`main` merge/staging/CD/41386f mutations |

Git `wrangler.jsonc` on this branch is still the live-source blob and remains unsafe to upload. Live used the overlay.
