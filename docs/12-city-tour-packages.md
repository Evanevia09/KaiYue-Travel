# City tour packages

The `/services/city-tours` catalogue reads Markdown records from `apps/web/src/content/city-tours/`. Each file represents one package and generates an individual package page from the shared page template. Records are catalogue content, not blog posts.

## Add or update a package

Create one `.md` file per package. Its filename becomes the stable content ID and URL segment, so keep the filename when editing an existing package. Required frontmatter is `title`, `summary`, `image`, and `imageAlt`. `status` defaults to `draft`; allowed values are `draft`, `approved`, and `hidden`. `order` defaults to `100` and controls catalogue order. Optional `translations.pt` and `translations.zh-Hant` can each override `title`, `summary`, and `imageAlt`; the English Markdown body remains the details fallback for those locales.

The package page shows the feature image with the shared booking widget already on City tours and that package. Below that, the body is a product block: a photo gallery, the package title, a From price, a description, and terms. Optional `gallery` is a list of `{ src, alt }` images under `/images/`. Optional `altPt` and `altZhHant` translate those alts. Optional `description` and `terms` can also be set under `translations.pt` and `translations.zh-Hant`. Optional `durationHours` (1–24) appears beside the title and on a booking request when the owner supplies it. Optional `priceFrom` is the amount shown after From, and only when the owner supplies it. Until then the price reads From / On request. The current packages are Special offer, Half day (`durationHours: 6`), and Full day (`durationHours: 10`). Each is a car with a driver. Do not invent a fare, discount, or itinerary.

The catalogue page does not embed the booking form. The homepage reads the same collection and shows one card per visible package. Book now on each card opens that package page, where the shared widget is already on City tours and that package. The request stores the package title and id for the operator; it does not confirm the tour.

Minimal example (one file, no translations required):

```md
---
title: Example tour theme
summary: A short description of the proposed theme.
image: /images/city-tours/example.jpg
imageAlt: Illustrative view of Macau waterfront scenery.
---

## About this proposed tour

Describe the proposed tour idea here. It is a draft until owner approval.
```

Save this as `apps/web/src/content/city-tours/example-tour.md` and put its image at `apps/web/public/images/city-tours/example.jpg`. Use lowercase filenames with hyphens. The next build adds a card and `/services/city-tours/example-tour`, plus corresponding `/pt/...` and `/zh-Hant/...` pages. Keep the filename stable when editing. No route or component editing is needed to add another package.

For optional translations, add `translations.pt` or `translations.zh-Hant` with all three fields: `title`, `summary`, and `imageAlt`. Until provided, those fields remain English and carry a visible fallback notice in the localized catalogue. The Markdown body currently stays English in every locale, with a notice on Portuguese and Traditional Chinese detail pages. Full translated package bodies are a later content capability.

## Images and approval

Add package images to `apps/web/public/images/city-tours/` and reference them with a site path such as `/images/city-tours/example.jpg`. The content schema requires this path to stay under `/images/` and checks that the file exists. Use accurate, descriptive alt text. Confirm translations, content, and image rights with the business owner before changing a package to `approved`.

ChatGPT can prepare this Markdown and a feature image generated or supplied by the user for a future package authoring task. Save the image in the repository and commit both assets together after review; this implementation does not add a new ChatGPT integration or publish anything automatically.

The three current packages replace the earlier heritage, waterfront, and visitor-selected-stops examples. They use existing illustrative city-tour images. No fare is published. Draft records stay noindex, and the catalogue is noindex while it contains drafts. Noindex does not restrict access. Set unapproved records to `hidden` before any authorized public release; hidden records generate neither cards nor individual pages.

After owner review, commit the approved Markdown and image assets to GitHub. Run `pnpm --filter @kaiyue/web check` or the repository checks to validate the collection, then run the build to verify generated package pages. The repository contains `.github/workflows/ci.yml` for CI checks and build; there is no deployment workflow in the repository. Hosting Git integration and its release policy are external and unverified, so a commit alone does not establish publication.
