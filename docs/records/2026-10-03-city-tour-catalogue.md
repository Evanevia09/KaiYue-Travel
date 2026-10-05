# 2026-10-03 — City Tour catalogue and Markdown package pages

Status: `task_verified` for the City Tour UI and content scope; `user_accepted` and `released` are not established. No commit, push, merge, deployment, production writes, or external messages.

## Outcome and scope

Owner instructions evolved during this task: the City Tour hero booking form was explicitly deferred, then package details were clarified as individual pages generated from one simple Markdown folder. The final UI has a dedicated hero/browse action, one direct City Tours entry per header/mobile menu, feature-image package cards, and individual shared-template pages. The existing URL, homepage/footer service links, and booking behavior elsewhere are preserved.

Each package uses four required frontmatter fields (`title`, `summary`, `image`, `imageAlt`) and a visitor-facing Markdown body. Optional `status` defaults to draft, `order` defaults to 100, and Portuguese/Traditional Chinese labels are optional. Local image existence is validated. Full Markdown bodies currently remain English, explicitly labelled in other locales. Hidden records generate neither catalogue cards nor individual pages. Drafts are labelled and noindex; noindex is not access control. Three sample themes contain no confirmed commercial offer or price.

## Source and preservation

- Checked 2026-10-03, Asia/Macau, repository `C:/cursor/Kaiyue-website/KaiYue-Travel`.
- Starting branch `main`, HEAD `d9db4861ea965de2bcfea3ed785474f4c89a2c03`; final work is uncommitted on `codex/city-tour-catalogue` at that same HEAD.
- Starting dirty paths: `AGENTS.md`, `PROJECT-STATE.md`, `docs/README.md`; untracked workflow adapter/records and `.hermes-tmp.uxgxfa/`. Existing manual changes were retained. AGENTS SHA-256 remains `C5F1C6DA857C1CF01D27BA349CB0F3B92DC6F9DBC1EE72B9C00C137C91463E1C`; initial state and index hashes were `D3A1B61D3DFFA615AF82688808806FD5E302BEFCA526B358AF24D716097E4B04` and `8AA942A40C8BF5E7EB0B8BBDD2A9513223AC5695732C0EA067507BE5F160A222` respectively.
- Read project instructions, living state, business source, docs index, relevant UX/content/booking/architecture/delivery/quality guides, personal workflow and project adapter. No Obsidian access.
- A screenshot was added to the existing untracked temporary directory; no pre-existing temporary file was removed. Other screenshots are outside the repository in the task visualization directory.

## Verification and review

- Type checking: zero errors/warnings; one pre-existing deprecated FormEvent hint in InventoryPanel.
- Tests: 45 passed, including regression checks protecting English Markdown/author metadata and preserving ordinary metadata localization when the new preservation flags are disabled.
- Production build: generated the catalogue and all three individual sample pages in all three locales.
- Temporary minimal four-field English-only package: build generated all three routes; Portuguese title exactly `City Tours` stayed English with `lang=en`; fallback notices displayed; Markdown heading/list rendered. Temporary hidden record was absent from all generated routes and the catalogue. Both temporary records were removed and the final output rebuilt.
- Actual Chrome: desktop catalogue → browse → detail → return, Portuguese mobile menu/card-image navigation, Traditional Chinese card keyboard Enter navigation, language context, English-body notices, and no mounted forms on City Tour pages. Width checks at 320, 390, and 1024 pixels found no horizontal overflow. Feature images were visually inspected in desktop and mobile screenshots. Console error collection was empty for these journeys.
- Focused formatting and `git diff --check` passed. Repository-wide lint initially failed on 72 files and the final run on 69 files with existing formatting drift; this work did not reformat unrelated files. Full CI is therefore not claimed green.
- Independent read-only review identified full-card click targets, dictionary rewriting of English fallback/metadata, and an Astro custom-attribute default-off regression; all were corrected and affected behavior rechecked. Final review returned no outstanding actionable findings. Shared PageHero/HeroBackdrop/BaseLayout preservation flags omit their attributes when disabled for other pages. Live Portuguese airport-transfer metadata was rechecked in its original localized form. Dropdown summary text now matches direct-link font size and does not wrap; Portuguese 1024px header height was 54.9px without overflow.
- No City Tour booking submission is required by the revised scope. Existing booking contracts/integration tests passed; live provider delivery and production data were not exercised.
- Runtime limit: a development Home/airport booking island raised `_jsxDEV is not a function` during concurrent build/dev verification. Booking source was not changed by this task. The production-built homepage form hydrated successfully (one visible form). City Tour pages have no React booking island and their browser journeys had no errors. Do not infer that all development booking-runtime behavior was validated from passing static UI checks.

## Preview, limits, and next action

Local development preview: `http://localhost:4321/services/city-tours`. Static production-output check: `http://localhost:4322/services/city-tours/` (static asset server only, no API). Initial managed Astro startup failed during content edits; an explicit foreground local server started successfully once the schema/files were consistent.

The checkout contains only GitHub CI (`.github/workflows/ci.yml`), not a deployment workflow. Publication depends on external hosting Git integration and the approved release policy, neither verified here. Future ChatGPT authoring can prepare Markdown and generated/user-supplied feature images; no new integration was built.

Next action: owner reviews the UI and supplies one approved real package plus feature image. Full translations, image rights, business facts, and publication configuration remain open. Physical-device, screen-reader, and deployment testing were not performed. Usage totals are unavailable; no token-saving claim.
