# Kai Yue admin-trial resource create and synthetic REST /query atomicity probes

Captured for parent closeout. Times below are Asia/Macau (UTC+8) unless a raw UTC value is quoted from an API.

Owner approval: 15 Nov 2026 16:47 Asia/Macau, answering existing PM widget t164s918. Scope used exactly as given: ONLY new empty D1/R2 on official account 33ecc75158a1cdd23ba1a62eb70c5103 (Kai Yue) plus synthetic noncredential atomicity/account-creation probes. No Worker create/upload/activation, real identity/Daniel/secret provisioning, migrations 0001-0008 full dataset, DNS/Access, sends, paid-plan change, existing prod/UAT writes, or cleanup/deletions.

Official Cloudflare MCP `user-Cloudflare` execute was used with `account_id=33ecc75158a1cdd23ba1a62eb70c5103` only. Old account 41386f was not queried. Runtime freeze 74c30236 was not edited. Provisioner `/workspace/kaiyue-admin-74c3023-verified-artifacts/provision_primary_admin.mjs` was read non-executing earlier for SQL shape only and was not executed with secret values.

## Created resources

| Resource | Name | ID | Created (Asia/Macau) |
|---|---|---|---|
| D1 | kaiyue-travel-admin-trial | 06aa844b-da6b-4c37-896c-fd13dd265fe6 | 2026-11-15 16:50:38.957 Asia/Macau |
| R2 | kaiyue-offers-admin-trial | bucketId d937f5bc01e448afa679bdbf3769ed50 | 2026-11-15 16:50:47.719 Asia/Macau |

Account confirmed Kai Yue / 33ecc75158a1cdd23ba1a62eb70c5103. New D1 is not production 06cf879d-8fea-4088-8881-7d382e1b8c11 and not UAT 043cd0ff-a1e6-4b5e-98c1-968c286e0c70. Those two existing databases were listed for collision inventory only and were never used as SQL targets.

## Collision and billing gate

Read-only inventory at 2026-11-15 16:49:55.091 Asia/Macau:

- Existing D1 (2): kaiyue-travel-production, kaiyue-travel-staging. Name query for kaiyue-travel-admin-trial returned no hits.
- Existing R2 (2, default jurisdiction): kaiyue-offers-production, kaiyue-offers-staging. Target name unused.
- Existing Workers (2): kaiyue-travel, kaiyue-travel-staging. Planned Worker name kaiyue-travel-admin-trial was unused (list miss + GET script-settings HTTP 404 code 10007, Ray a5ad015e1f5f9e28-IAD). The Worker was NOT created.
- GET /accounts/.../subscriptions returned HTTP 403 code 10000 (no OAuth scope, Ray a5ad0154fb969e28-IAD). Not routed around. Workers account-settings showed default_usage_model=standard. Products were already enabled (existing D1 and R2). One additional empty D1 and one empty Standard R2 with minimal `{name}` only were created. No paid upgrade and no checkout.

Creates used official endpoints:

- POST /accounts/33ecc75158a1cdd23ba1a62eb70c5103/d1/database  body `{"name":"kaiyue-travel-admin-trial"}`
- POST /accounts/33ecc75158a1cdd23ba1a62eb70c5103/r2/buckets  body `{"name":"kaiyue-offers-admin-trial"}`

A first local execute attempt failed with parser error `Unexpected token '||'` before a successful mutate request; the retry used simpler code against the same official endpoints and same scope. This was not an Auto-review block.

## Empty baselines

D1 identity readback at 2026-11-15 16:50:46.003 Asia/Macau: uuid/name/account matched. sqlite_master (excluding sqlite_%) contained only platform table `_cf_KV`. No application tables. file_size 12288, API num_tables 0.

R2 readback at 2026-11-15 16:50:54.875-16:50:56.453 Asia/Macau:

- location ENAM, storage_class Standard, jurisdiction default
- managed r2.dev domain reserved as `pub-d937f5bc01e448afa679bdbf3769ed50.r2.dev` but **enabled=false** (private). This work did not enable it.
- custom domains: 0
- objects: 0
- left empty and private

Identity was requeried immediately before every synthetic SQL call; all matched.

## Synthetic probes (REST /query only)

Method for every probe: `POST /accounts/33ecc75158a1cdd23ba1a62eb70c5103/d1/database/06aa844b-da6b-4c37-896c-fd13dd265fe6/query` with body `{sql: "<multiple statements joined by semicolons>"}`. This is the intended single REST /query execution method (provisioner-generated SQL semantics). Isolated tables `synth_user` / `synth_account` used provisioner-like columns, conditional INSERTs, and `_synth_create_guard (ok INTEGER NOT NULL CHECK (ok = 1))` postcondition. Fake fixture IDs/emails only. Password column used literal marker `SYNTHETIC_NONCREDENTIAL_MARKER_NOT_A_PASSWORD`. No real password/hash/token values. After every error, an immediate readonly readback was issued in the same execute call. Failed mutations were not retried.

Schema setup at 2026-11-15 16:51:37.621 Asia/Macau: baseline counts synth_user=0, synth_account=0.

### A positive create — PASS

16:51:50.777-16:51:50.924 Asia/Macau. Six statements all succeeded (user changes=1, account changes=1, guard create, delete, insert ok=1, drop). Readback: 1 user `00000000-0000-4000-a000-000000000001` / `synth-atomicity-positive@kaiyue.test`, 1 account `...000101`, guard table dropped.

### B duplicate / existing-credential no-op + CHECK failure — PASS

16:52:02.802-16:52:02.939 Asia/Macau. Same email, new IDs `...0002` / `...0102`. HTTP 400 code 7500 CHECK constraint failed: ok = 1, Ray a5ad047d8dead79d-IAD, API result []. Immediate readback: still only the original 1+1 rows; new IDs absent; guard table absent. Postcondition refused a silent no-op. User/account statements were no-ops, so this test alone does not prove DML rollback; absence of the guard table after the error is consistent with rollback of that earlier schema write because DROP could not have run.

### C case-variant refusal — PASS

16:52:18.556-16:52:18.768 Asia/Macau. Email `Synth-Atomicity-Positive@kaiyue.test`, IDs `...0003` / `...0103`. HTTP 400 code 7500, Ray a5ad04e02d54059b-IAD. Readback unchanged; case-variant row and new IDs absent.

### D user-only / preexisting user without credential refusal — PASS

16:52:33.678-16:52:33.947 Asia/Macau. Intentional prior setup inserted user-only `00000000-0000-4000-a000-000000000004` / `synth-atomicity-useronly@kaiyue.test` (committed, no account). Then provisioner-shaped CREATE with fresh IDs `...0005` / `...0105` failed CHECK (HTTP 400 code 7500, Ray a5ad053f5f6ac958-IAD). Readback: still 2 users / 1 account; 0004 remains; no 0005/0105; no credential for the user-only email; no guard table. A fresh-UUID CREATE against a preexisting user-without-credential is refused by the postcondition rather than silently succeeding.

### E earlier write then forced CHECK failure — PASS (observed REST /query rollback)

16:52:51.292-16:52:51.440 Asia/Macau. Provisioner-shaped INSERTs for new email `synth-atomicity-rollback@kaiyue.test` / IDs `...0006` / `...0106`, then `INSERT INTO "_synth_create_guard" ("ok") SELECT 0`. HTTP 400 code 7500, Ray a5ad05acbb37d65c-IAD, API result []. Immediate readonly readback:

- rollback_user_present_0006 = 0
- rollback_account_present_0106 = 0
- guard table absent
- counts still 2 users / 1 account (only previously committed A and D-setup fixtures)
- size_after 28672, last_row_id still 2

No unexpected partial writes, so no stop-and-report of leftover rows, and no wipe/recovery was performed.

## Exact atomicity scope

Observed on this run: a single REST POST /query with one `sql` string of multiple semicolon-joined statements rolled back earlier INSERTs and the guard CREATE when a later statement failed CHECK, on D1 06aa844b-da6b-4c37-896c-fd13dd265fe6, served_by v3-prod, region ENAM, colo IAD.

This is executor evidence for the intended provisioner SQL path. It is not a published Cloudflare REST contract. Official docs document whole-sequence rollback for Worker binding `D1Database.batch()` and do not restate that guarantee for REST /query (they say multiple statements "will be executed as a batch"). This result must not be substituted for the documented binding-batch guarantee.

Explicitly unproven / not tested:

- Intentional mid-request interruption or crash (no shell-kill or random API interruption; well-defined non-destructive interrupt was not available)
- Worker `D1Database.batch()` (no Worker upload)
- REST body `{batch:[{sql}, ...]}`
- `wrangler d1 execute --file`

## Residual synthetic state (left in place; no cleanup)

Final readonly snapshot 2026-11-15 16:53:15.087 Asia/Macau. Identity still matched.

D1 06aa844b-da6b-4c37-896c-fd13dd265fe6 / kaiyue-travel-admin-trial: file_size 28672, API num_tables 2 (plus platform `_cf_KV`). Tables: `_cf_KV`, `synth_user`, `synth_account`. No `_synth_create_guard`.

- synth_user 2: `...0001` synth-atomicity-positive@kaiyue.test ; `...0004` synth-atomicity-useronly@kaiyue.test (user-only fixture)
- synth_account 1: `...0101` provider credential, password column = SYNTHETIC_NONCREDENTIAL_MARKER_NOT_A_PASSWORD

R2 kaiyue-offers-admin-trial still empty (0 objects), private (managed enabled=false), 0 custom domains, Standard, ENAM, default jurisdiction.

## Verdicts

- Resource creation: PASS
- Empty baselines: PASS
- A positive create: PASS
- B duplicate/existing-credential CHECK refusal: PASS
- C case-variant refusal: PASS
- D user-only refusal: PASS
- E REST /query earlier-write CHECK rollback (observed): PASS within the scope above
- Interruption atomicity: UNPROVEN

No Auto-review blocks occurred on the successful official MCP calls. No billing gate. No new owner question was asked.

## What was NOT done

- No Worker named kaiyue-travel-admin-trial (or any other) was created, uploaded, or activated
- No real identity, Daniel, or secret provisioning; provisioner CLI was not executed with secrets
- Migrations 0001-0008 were not applied; no production data was read or copied onto the trial D1
- No DNS, Access, mail sends, or paid-plan/checkout changes
- No writes to production D1 06cf879d or UAT D1 043cd0ff, or to production/staging R2
- No cleanup or deletions of the new resources or residual synthetic rows
- No r2.dev public access or custom domain enabled
- No repo or vault writes
- Runtime source 74c30236 was not modified
