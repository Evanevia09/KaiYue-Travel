# 2026-10-16 — WeChat QR placeholder

**Status:** `task_verified` for the in-repo placeholder only after preview checks. Not `user_accepted` or `released`.

## Requested outcome

Show a clearly-placeholder WeChat QR in the footer contact column and on the contact page WeChat entry, localized for English, Traditional Chinese, and Portuguese, without inventing a WeChat ID or a scannable fake code.

## Change

- Shared component: `apps/web/src/components/content/WeChatQr.astro`
- Image constant: `WECHAT_QR_SRC = "/images/wechat-qr.svg"`
- Asset: `apps/web/public/images/wechat-qr.svg`
- Surfaces: footer contact column in `BaseLayout.astro`; Reach us list in `contact.astro`
- Copy keys: `WeChat`, `WeChat QR – coming soon`

## Constraints kept

Did not edit booking, admin, offers, `wrangler.jsonc`, or database/migration files. Branched from `staging` and opened a PR into `staging` only.

## Verification

Workers preview `https://cursor-wechat-qr-placeholder-7d43-kaiyue-travel.scalingsmb.workers.dev`. Contact pages in EN, pt, and zh-Hant at 1440×900 and 390×844: two square QRs, localized labels, no overflow, no console errors. GitHub CI `check` passed. Footer overlay was widened after Traditional Chinese wrapped a trailing character.

## Next action

Replace `apps/web/public/images/wechat-qr.svg` with the owner-supplied QR. Do not invent a WeChat ID. Do not merge to `main`.
