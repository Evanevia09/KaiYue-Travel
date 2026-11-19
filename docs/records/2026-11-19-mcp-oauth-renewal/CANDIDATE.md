# Hosted MCP OAuth renewal — staging candidate

- **task_id:** `kaiyue-mcp-oauth-renewal-20261119`
- **event_id:** `kaiyue-mcp-oauth-renewal-20261119-candidate-01`
- **As of:** 2026-11-19 Asia/Macau
- **State:** `task_verified` locally, not released. No merge, deploy, credential, access, or data change has been made.

## One-writer handover

- Owner handover ref `t262u` (2026-11-19 18:28 Macau) made the cloud agent the sole writer to continue the Codex checkpoint.
- Source checkpoint: PR #51, branch `codex/kaiyue-mcp-renewal` @ `7d847dfda3fcab670403720e75bd0b352ec8024f`. It was re-verified unchanged at takeover and again before this record. All Codex commits are preserved unmodified.
- Successor branch: `cursor/mcp-oauth-renewal-a72c`, built from that head with no reset, force push, or autostash.
- Base: `official-staging` @ `c9173c0f3d564be35a67ba49bd584277badecb43`. The candidate is a fast-forward of it.
- PR #48, #49 and #51 are left open and unchanged.

## Changes on top of the checkpoint

1. A reused authorization code now revokes the connection it created (OAuth 2.1).
2. A concurrent second exchange of the same code that loses the database race is treated as a replay and revokes the connection.
3. Non-staging hosts no longer get an OAuth JSON 404 from `/api/v1/admin/mcp/oauth/*`. The request falls through to the existing admin gate, as it did before PR #51.
4. Storage and other internal failures on the token and register endpoints return `server_error` with status 500 or 503, instead of `invalid_grant`/400. The log line holds only a request ID, the fixed path, and an error code.
5. Off staging, the consent page `/admin/agent-authorize` returns 404. On staging, it returns 400 for a bad request and 503 for a server failure.
6. Added tests: host isolation, unsafe registrations, request validation, token endpoint guards, 3-minute code expiry, code replay, concurrent code exchange, concurrent refresh, cross-client refresh, storage failure mapping, consent-page status, the login return path rejecting anything except the consent page, 8-hour expiry, and access plus renewal ending when the staff operator is disabled.

The checkpoint's existing design is unchanged:

- Writes still need owner browser approval.
- Tool permissions are unchanged.
- No API key was added.
- Staff email/password sessions remain the identity system.

## Verification

All checks below ran locally on the runtime tree of commit `906d56d`. The candidate head adds only documentation on top of it.

| Check | Result |
| --- | --- |
| `pnpm lint` | pass |
| `pnpm typecheck` | 0 errors |
| `pnpm test` | 44 files, 311 tests pass |
| Staging plugin tests | 4/4 pass |
| `PUBLIC_SITE_URL=https://staging.kaiyuemacau.com pnpm build` | pass |
| Official-staging guard | pass |
| Local replay of the post-deploy e2e script (temporary harness, since deleted) | 33/33 pass |

Not verified:

- No deployed staging run.
- No human consent in a real MCP client. The e2e script submits the consent form itself.
- No browser, accessibility, or reduced-motion check of the consent page in this increment.

## Independent review

A read-only reviewer audited the checkpoint and found 2 low-severity defects plus test gaps; all are fixed above.

A second read-only review of the fix diff returned **PASS WITH NOTES**:

- Every prior finding is resolved.
- Mutation testing showed each new test fails when its fix is reverted.
- No blocker, high, or medium findings.

Its one fixable low note, consent-page server errors showing 400, is fixed in `906d56d`.

## Accepted residuals (not fixed here)

- Anyone holding an already-used code can revoke that connection. This is allowed by the spec, and the code is secret. A client that retries after a timeout also revokes its own connection.
- Two simultaneous refreshes with the same token revoke the connection. A client must serialise its refreshes.
- The staff session slides with use (`updateAge`), so an active OAuth connection keeps it alive until the 8-hour grant ends.
- Unexchanged code rows keep their sealed session until a later cleanup.
- Unsupported, by design or not yet built:
  - custom-scheme redirect URIs (for example `cursor://`);
  - an `access_denied` redirect on cancel;
  - an `iss` response parameter.
- Earlier documented gaps stay out of scope:
  - public endpoint channel;
  - status/notes concurrency;
  - mail copy review.

## Deployment plan (needs PM approval)

1. PM reviews this PR and the candidate head SHA.
2. Owner/ops promotes `official-staging` from `c9173c0` to the reviewed head as a non-force fast-forward.
3. The protected staging CD runs lint, typecheck, tests, build, guard, upload, schema check, candidate check, activate, and smoke.
4. There is no D1 migration, binding, secret, DNS, or mail change. Mail stays off.
5. Rollback: re-activate the previous staging Worker version `a8cf1194`. Never restore D1 automatically.
6. Post-deploy, PM runs the read-only e2e script from the agent store `staging-mcp-oauth-e2e.mjs` (SHA-256 `f73696a224bf26cbc8b0bff50d735d790a8c543f4b3799bd4382b604148f9bcc`) on its own computer:
   - It needs a temporary staging staff fixture, supplied through process environment only, plus `MAIL_OFF_CONFIRMED=1`.
   - It reads counts only, makes no writes and sends no mail, and ends by signing out.
   - Disable the fixture afterwards.
7. A real MCP client connection with human consent is a separate owner step. It is not claimed here.
