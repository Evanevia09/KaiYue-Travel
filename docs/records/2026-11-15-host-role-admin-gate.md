# 2026-11-15 — Host-role admin gate (source only)

Owner Evan approved a simpler Kai Yue layout: one app, with clearly labeled staging and production addresses. This record is source/code only. It is not a merge to `main`, not a production release, and not DNS or Worker-route work.

Base: `cursor/admin-profile-password-2cad` @ `9f998a405769800fc6aa4a4aef975f209352195f` (staff dashboard). Do not start from `main`. Do not trial or merge PR #38 alone (`cursor/main-reconcile-dashboard-2cad`); that restore is an unwanted Access-only gate.

## Host roles

| Role | Hosts | Staff login |
|---|---|---|
| Production marketing | `kaiyuemacau.com`, `www.kaiyuemacau.com`, `kaiyue-travel.scalingsmb.workers.dev`, `kaiyue-travel-staging.kai-yue.workers.dev` | 403 for `/admin`, `/login`, setup, and admin APIs |
| Production admin | `admin.kaiyuemacau.com` | Password when both Access vars are absent; partial Access fails closed. `/` redirects to `/login`. Not attached in this increment. |
| Staging marketing | `staging.kaiyuemacau.com` | Staff login not offered (403). `/` remains the public site. |
| Staging admin | `admin-staging.kaiyuemacau.com` | Password when both Access vars are absent; Access is not a prerequisite; partial Access fails closed. `/` redirects to `/login`; other marketing pages do not render. |

Official staging workers.dev remains production-protected. Do not use it as the staff login URL and do not loosen that 403. Do not add `kaiyue-travel-admin-trial.kai-yue.workers.dev` to any production-host list.

Password policy: production hosts stay at a hardcoded minimum of 12 characters, including `kaiyuemacau.com`, `www.kaiyuemacau.com`, and `admin.kaiyuemacau.com`. Owner-authorized exception: on `admin-staging.kaiyuemacau.com` only, `ADMIN_STAGING_TEST_PASSWORD_MIN` may set a floor from 6 through 11 for login, password change, and create/reset. Do not gate that exception on `ENVIRONMENT=production` (official staging currently has `ENVIRONMENT=production`). The var has no effect on production-admin or marketing hosts even if it is mistakenly present. Do not write real passwords, emails, or credentials into the repo. Staging email notifications and GitHub continuous deployment are out of scope.

## Out of scope

- Merge to `main`
- Deploy to production, official staging, or any Cloudflare Worker
- DNS, routes, paid plans
- Attaching `admin.kaiyuemacau.com`
