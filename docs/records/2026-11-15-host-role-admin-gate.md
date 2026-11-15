# 2026-11-15 — Host-role admin gate (source only)

Owner Evan approved a simpler Kai Yue layout: one app, with clearly labeled staging and production addresses. This record is source/code only. It is not a merge to `main`, not a production release, and not DNS or Worker-route work.

Base: `cursor/admin-profile-password-2cad` @ `9f998a405769800fc6aa4a4aef975f209352195f` (staff dashboard). Do not start from `main`. Do not trial or merge PR #38 alone (`cursor/main-reconcile-dashboard-2cad`); that restore is an unwanted Access-only gate.

## Host roles

| Role | Hosts | Staff login |
|---|---|---|
| Production marketing | `kaiyuemacau.com`, `www.kaiyuemacau.com`, `kaiyue-travel.scalingsmb.workers.dev`, `kaiyue-travel-staging.kai-yue.workers.dev` | 403 for `/admin`, `/login`, setup, and admin APIs |
| Production admin | `admin.kaiyuemacau.com` | Password when both Access vars are absent; partial Access fails closed. Not attached in this increment. |
| Staging marketing | `staging.kaiyuemacau.com` | Staff login not offered (403) |
| Staging admin | `admin-staging.kaiyuemacau.com` | Password when both Access vars are absent; Access is not a prerequisite; partial Access fails closed |

Official staging workers.dev remains production-protected. Do not use it as the staff login URL and do not loosen that 403. Do not add `kaiyue-travel-admin-trial.kai-yue.workers.dev` to any production-host list.

Password policy stays minimum 12 characters. Do not inherit `ADMIN_STAGING_TEST_PASSWORD_MIN=6` or UAT `TEMP_ADMIN_EXPIRES_AT`. Staging email notifications and GitHub continuous deployment are out of scope.

## Out of scope

- Merge to `main`
- Deploy to production, official staging, or any Cloudflare Worker
- DNS, routes, paid plans
- Attaching `admin.kaiyuemacau.com`
