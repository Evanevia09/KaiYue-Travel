# Live staging mobile Playwright — results

**Status:** **PASS** (actual run, not a plan)  
**When:** 2026-11-20T02:24Z  
**Runner:** cloud VM Chromium 156 via repo `pnpm exec playwright test` (`@playwright/test` 1.64.1). Not the PM desktop helper. Not a user computer.  
**Command:** `LIVE_STAGING_E2E=1 pnpm exec playwright test tests/e2e/staging-mobile-contact.spec.ts`  
**Outcome:** 2 passed in 20.0s (strict 144×144 page / 136×136 footer QR squares). Earlier same-spec run 2/2 in 17.2s.  
**Live source:** git `04d98ae0b2e3d71f93b5db881affeabbfe327080` · Worker `kaiyue-travel-staging` `8ac4fe0e-b90e-441a-be21-7e3cbdfef7dc` @100%  
**Origin:** `https://staging.kaiyuemacau.com/`  
**Read-only:** no booking submit, no inquiry submit, no WhatsApp click-through, no mail.

Cloudflare challenge: **none**. Tests loaded the real site.

## Assertions that passed

| Check | 390×844 | 320×844 |
| --- | --- | --- |
| EN / PT / zh-Hant home | PASS | PASS |
| Contact via footer Company link then language switcher (`/contact`, `/pt/contact`, `/zh-Hant/contact`) | PASS | PASS |
| `documentElement.scrollWidth` vs viewport | 390 = 390 | 320 = 320 |
| Header logo overlaps lang or menu | false | false (lang x169.45, menu x256, 8px gap) |
| Header WhatsApp chip | `display:none` (by design &lt;1024px) | same |
| Booking controls overlapped by header/footer | 0 | 0 |
| Footer QR covered by sticky Book now | false | false |
| QR `naturalWidth` × `naturalHeight` | **774×784** | **774×784** |
| Page QR CSS box | **144×144**, aspect 1, `object-fit:contain`, white frame | same |
| Footer QR CSS box | **136×136**, aspect 1, `object-fit:contain` | same |
| Intrinsic ratio 774/784 | 0.9872448979591837 | same |
| Console errors (non-favicon) | none | none |
| Mixed content `http://` | none | none |
| `wa.me/85363128081` | present | present |
| `wa.me/85328338882` | absent | absent |
| Office `tel:+85328338882` | present | present |

Contact is not in the hamburger (desktop primary nav also has no Contact item). The live path is footer Company Contact, which the HTML rewriter localizes.

No layout bug. No product CSS/HTML change.

## Artifacts

- Spec: `tests/e2e/staging-mobile-contact.spec.ts` (skipped unless `LIVE_STAGING_E2E=1`; not in `ci.yml`)
- Repo geometry: `geometry-390x844.json`, `geometry-320x844.json`, `mobile-geometry.json` in this folder
- Cloud-VM files under `/opt/cursor/artifacts/kaiyue-staging-mobile-20261120/`:
  - `390x844-home-en.png`, `390x844-home-pt.png`, `390x844-home-zh.png`
  - `390x844-contact-en.png`, `390x844-contact-pt.png`, `390x844-contact-zh.png`
  - `320x844-home-en.png`, `320x844-home-pt.png`, `320x844-home-zh.png`
  - `320x844-contact-en.png`, `320x844-contact-pt.png`, `320x844-contact-zh.png`
  - `computed-geometry.json`, `geometry-390x844.json`, `geometry-320x844.json`, `PASS.txt`
- Cursor URLs (encode the absolute path): `https://cursor.com/agents/bc-efa1f054-1bf7-5417-ae29-f3d6e04df58e/artifacts?path=%2Fopt%2Fcursor%2Fartifacts%2Fkaiyue-staging-mobile-20261120%2F390x844-home-en.png` (repeat per filename). Full table: `REPORT.md` section 8.1.

## Not this suite

10-tool MCP bot, quote Gmail receipt, WhatsApp formatted-redirect API cases (`kaiyue` test owns those). Desktop PM browser QA is separate and already PASS.
