# City Tour package, booking and staff authoring planning

**Discussion date:** 2026-10-03, Asia/Macau  
**Status:** Discussion record for later clarification; documentation only. Future features below are not implemented or approved for publication by this record.

The City Tour catalogue and individual Markdown package pages are already built locally. The next conversation should review the user's package-page example and clarify the future booking and staff-authoring scope before further implementation. This document preserves the latest voice-discussion direction; it does not authorize UI, API, schema, booking, CMS, push, or deployment changes.

## Already implemented

- A dedicated City Tour hero and menu entry, with a catalogue of feature-image cards linking to individual package pages through one shared template.
- One folder of package files: `apps/web/src/content/city-tours/`. Repository-managed feature images are referenced from `apps/web/public/images/`.
- Simple Markdown frontmatter and a rendered Markdown body. Current required fields are `title`, `summary`, `image`, and `imageAlt`; draft/approved/hidden state and optional translated labels are supported.
- English, Portuguese, and Traditional Chinese routes. Package bodies currently remain English, with explicit fallback notices in the other locales.
- Three illustrative draft themes, rather than approved commercial packages. See the [implementation evidence](2026-10-03-city-tour-catalogue.md) and [current authoring guide](../12-city-tour-packages.md).

The earlier hero booking form remains deferred. A package-aware City Tour booking mode, duration/pricing/offer fields, and a staff package editor are not implemented. A shared template and Markdown rendering already exist; the richer detail presentation below is future direction to review against the user's example, rather than a claim that every design requirement is complete.

## User-confirmed package and detail-page direction

The user supplies actual package text and pictures and will provide an example. Do not invent real itineraries, inclusions, prices, discounts, availability, or commercial promises to fill gaps.

The detail page should show the main picture and key package details at the top. Below that, it should support article-style headings, itinerary content, and multiple images throughout. This is a tour-package content system, not a blog; blog dates, categories, or publishing conventions are not requirements.

| Package type | Latest direction | Boundary |
| --- | --- | --- |
| Standard half-day | **6 hours** | User-confirmed planning duration; not yet added to package data or published as a commercial offer |
| Standard full-day | **10 hours** | User-confirmed planning duration; not yet added to package data or published as a commercial offer |
| Special offers | Additional offer packages alongside standard tours | Actual offer content, prices, benefits, validity and terms remain undefined |
| Night tour | Possible future package | Not a confirmed product |

The 6-hour and 10-hour durations supersede earlier illustrative 4-hour/8-hour examples. The user does not want shorter tour choices. Standard packages should remain available as long-term catalogue entries and be defined by hours; that does not mean any requested date or vehicle is automatically available.

Recommended default itineraries should help visitors unfamiliar with Macau. Guests may customize through communication. Keep the customization wording brief. Do not state a guaranteed or maximum number of stops: the actual stops depend on travel time and time spent at each place. Extra hours and charges can be discussed directly; no extra-hour rates or package prices are approved.

## Special offers: examples and unresolved commercial details

Special offers may lower prices or bundle a benefit, such as a border transfer. These are possible structures, not approved package inclusions. A **50% discount was illustrative only**, not a verified or approved promotion.

Before an offer is published, define and review its original price, offer price, savings calculation, validity period, eligibility and terms. Clarify the exact scope and conditions of any bundled transfer or other benefit. No amount, discount, transfer coverage, or offer entitlement should be inferred from this discussion.

## Proposed future booking UX — welcomed, implementation deferred

Guests should be able to start a booking request wherever they become interested, without navigating back to the homepage or catalogue. The shared form/modal should open in place, and a request started on a package page should preselect that package. The user welcomed this proposed flow; it still needs implementation clarification.

Add a City Tour pill/mode to the existing booking interface. The proposed steps are:

1. **Tour request:** choose a package from the active Markdown catalogue (half-day, full-day, or special offer), pickup date/time, and pickup location. This mode has no return-journey or drop-off field.
2. **Communication:** collect contact details and choose WhatsApp or email.
3. **Request received:** associate the request with the chosen package and its duration. The operator confirms availability and discusses changes; submission is not automatic booking confirmation.

The placement on package detail pages remains open: a Book button opening the shared modal, or a floating/sticky side form. The meaning of “active” packages, required contact fields for each channel, and how package/duration details are retained in a request need definition before implementation. Do not treat the current content schema as already supporting this booking model.

## Authoring evolution

The initial simple workflow is for ChatGPT with repository access to prepare or edit package Markdown and generated or user-attached images. After content and image review, approved assets go through the GitHub build/publication workflow. Save images as repository-managed files with accessible alt text and reference them from the package file.

There is no connected ChatGPT authoring integration established by the existing implementation. Repository CI runs checks and builds; hosting auto-publication remains unverified. An approved commit may feed a configured hosting integration, but a commit alone does not prove publication. No push or deployment is requested now.

The latest discussion reopens a future staff-facing backend/dashboard so someone other than the owner can add and edit packages without technical tools. This option is **not permanently rejected**. It is also not authorization to build a CMS now. Its scope and relationship with Markdown must be clarified first.

## Open decisions for the next build discussion

| Area | Decision to clarify |
| --- | --- |
| Detail presentation | Review the user's example; agree the key details at the top and the layout for itinerary headings and multiple images |
| Actual package content | Obtain owner-supplied text/pictures for the 6-hour, 10-hour and any special-offer packages; confirm image rights and publication wording |
| Booking placement | Book button/modal versus floating or sticky side form; desktop/mobile behavior |
| Package-aware requests | Define active catalogue selection, package/duration association, contact fields, and operator confirmation wording |
| Staff editor | Whether and when to add it, who will use it, and the smallest useful editing workflow |
| Content source of truth | Markdown/GitHub versus staff-managed content, and how they remain consistent if both are used |
| Editorial workflow | Draft, review and publish stages; how approval and withdrawal work |
| Roles and access | Who may create, edit, review and publish; authentication and access boundaries |
| Images | Upload/storage, image replacement, alt text, rights review and multiple-image handling |
| Localization | When full translated package bodies are needed and how staff would edit them |
| Hosting and costs | Verify the existing publication integration and release policy; identify any integration, API, hosting or storage costs only after scope is agreed |

Costs are unknown. A staff editor does not inherently require a particular API, provider, or additional fee; do not state such a dependency without evaluating the agreed approach.

## Recommended next step

Review the user's package detail UI example and agree the staff-authoring scope before further implementation.

## Record provenance and limits

Source: the latest user voice-discussion notes passed to this repository task on 2026-10-03, plus inspection of current project instructions, state, authoring guide, schema and shared package template. Latest user clarification governs where older examples differ. This record intentionally retains superseded examples only to prevent reuse as current requirements.

Documentation was saved on branch `codex/city-tour-catalogue`, at HEAD `d9db4861ea965de2bcfea3ed785474f4c89a2c03` plus the existing uncommitted work. The documentation index and project-state pointers were updated. Existing application files and unrelated edits were preserved. Document readback, local links, focused formatting and diff whitespace were checked; no application or runtime checks were rerun for this documentation-only increment. No UI, API, data schema, booking, CMS, production data, commit, push or deployment action was performed.
