# 2026-10-05 — City Tour package details and booking mode

Status: `task_verified` for the package-page details band and the shared City tours booking mode. `user_accepted` and `released` are not established. No commit, push, merge, deployment, production writes, or external messages.

## Outcome and scope

Package pages now show the feature image, then a key-details band, then the existing Markdown article. The shared booking widget has a third mode, City tours, beside Point to point and By the Hour. That mode collects the package, pickup, pickup date and time, and passengers. It hides destination and return. A package page opens the shared sheet with that package already selected. The catalogue hero still has no booking form.

A request remains an enquiry awaiting team confirmation. Passengers stay on the form so the team can suggest how many cars; the default discussion is one car. The package title and id are stored in the booking notes. There is no new database column. Optional `durationHours` is shown and stored only when a package file supplies it. The three sample themes do not set it, and the standard 6-hour and 10-hour planning durations were not assigned to them.

No prices, itineraries, inclusions, availability, or special-offer terms were invented. Staff package editing remains unimplemented.

## Source and preservation

- Checked 2026-10-05, Asia/Macau, repository `C:/cursor/Kaiyue-website/KaiYue-Travel`.
- Branch `codex/city-tour-catalogue`, HEAD `d9db4861ea965de2bcfea3ed785474f4c89a2c03`. The City Tour work is uncommitted.
- Direction comes from the 2026-10-03 voice follow-up after [the planning note](2026-10-03-city-tour-future-planning.md). The owner accepted keeping passenger count so the team can suggest vehicles.
- Existing dirty work outside this task was left in place. Temporary voice-extraction scripts in `.hermes-tmp.uxgxfa/` were removed; the earlier screenshot and unrelated sentinel file in that directory were kept.

## Verification and review

- Focused tests, rerun on 2026-10-05: 26 passed (`booking.test.ts` 12, `store.test.ts` 1, `dispatch.test.ts` 3, `bookings.test.ts` 10). The city-tour integration test stores the package note with a null destination and null return.
- Typecheck earlier on this same uncommitted tree: 0 errors and 0 warnings, with one pre-existing deprecated `FormEvent` hint in `InventoryPanel.tsx`. It was not rerun after the browser pass because application source did not change during that pass.
- Local Chrome on `http://localhost:4321`:
  - English package page shows Private city tour, the confirmation sentence, and Request this tour. No duration row, because the sample has no `durationHours`.
  - Request this tour opens the sheet on City tours with Heritage and old-town walk (draft) selected. Pickup, date, and passengers are present. Destination and return are absent.
  - Portuguese package page uses the localized title, draft label, request button, and English-body notice. The sheet preselects `Passeio pelo património e centro histórico (rascunho)`.
  - Traditional Chinese package page shows 歷史街區漫遊, 套票草稿, 私人城市遊覽, the English-body notice, and 預約此遊覽. The injected catalogue title includes `(草稿)`.
  - Homepage Point to point still shows From, To, and Add return. City tours switches that bar to the package list, pickup, date, and passengers, with the three draft packages.
  - `/services/city-tours` has no form and no React island, on desktop and at 390 px.
  - Width checks at 390 px (package page, open sheet, homepage City tours mode, catalogue) and 320 px (Traditional Chinese package page) found no horizontal overflow.
- A completed Portuguese email request returned reference `KY-JFMM8DFB` and the on-screen notice that the request awaits team confirmation. Local D1 stored `service_type` `city_tour`, pickup `Aeroporto Internacional de Macau`, pickup `2026-10-08T06:00:00.000Z` (14:00 Asia/Macau), `destination` null, `return_at` null, `passenger_count` 2, locale `pt`, source `/pt/services/city-tours/heritage-walk`, trigger `tour-package`, and notes `City tour package: Passeio pelo património e centro histórico (rascunho) (heritage-walk).` Notification state was `skipped` because local Resend is unconfigured. This row is local development data only.
- An earlier English attempt stayed on the sending state after a Vite program reload and did not leave a matching stored row. The Portuguese retry above is the verified submission.

## Preview, limits, and next action

Production build on 2026-10-05 completed and generated the catalogue plus all three sample package pages in English, Portuguese, and Traditional Chinese. Repository-wide Prettier still fails on unrelated files, so full CI is not claimed. Physical devices, screen readers, live email delivery, and a deployed environment were not checked.

Sample packages remain drafts and noindex. Real package copy, image rights, approved durations, special-offer terms, and staff editing are still open. An unrelated existing Traditional Chinese dictionary label renders the English language name as 聯合國; this task did not change that label.

Next action: the owner reviews the package page and City tours mode, then supplies one approved package, its feature image, and any duration that should be shown. Keep unapproved records hidden before any separately authorized release.
