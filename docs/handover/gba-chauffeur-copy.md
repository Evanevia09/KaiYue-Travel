# Greater Bay Area chauffeur copy — handover

**Date:** 2026-10-16  
**Branch:** `cursor/special-offers-enquiry-pages-e1be`  
**PR:** https://github.com/Evanevia09/KaiYue-Travel/pull/13 into `staging` only. Do not merge to `main`.  
**Decision:** Evan (2026-10-16) — Kai Yue is a chauffeur service across Macau, Mainland China, and Hong Kong (the Greater Bay Area). Do not invent prices, terms, licences, or other operational claims. **City Tours stay Macau only.**

This increment rewrites public B2C framing that presented Kai Yue as Macau-only. Quote-after-review, phones, address, City Tour copy, image alts that describe Macau photographs, admin “Macau time”, and historical “founded in Macau / headquarters in Macau” facts are unchanged.

## What changed

- Site tagline, default meta description, home hero/title, home intro, and Point To Point card now say chauffeur services across the three regions / Greater Bay Area.
- Footer draft note now describes chauffeur requests for Macau, Mainland China, and Hong Kong.
- Airport, cross-border, local transfer, hourly, and wedding service copy and SEO titles/descriptions use the three-region framing. City Tours service and package pages stay Macau-only.
- About hero, portfolio, alliance, business city list (Hong Kong added to the existing GBA city list), and closing inquiry copy follow the same framing.
- Special Offers hero eyebrow is now Greater Bay Area (EN / Grande Baía / 大灣區).
- Travel-agency route-review helper no longer says “Macau-only or Macau–Mainland”.
- Portuguese and Traditional Chinese reviewed dictionaries cover the new English strings. Leftover Macau-only PT/zh-Hant nav labels for Local Transfers / Local Chauffeur were updated; City Tours zh-Hant `澳門市區遊` stays.
- `BUSINESS_INFORMATION.md` owner decision 3, `docs/README.md`, `docs/03-information-architecture-and-content.md`, and `PROJECT-STATE.md` record the 2026-10-16 B2C geography decision.

## Changed strings

English source → new English (pt / zh-Hant added in reviewed dictionaries). City Tours strings are **not** listed because they were not changed.

| Surface | Before | After |
|---|---|---|
| Site tagline | Your reliable private chauffeur in Macau | Your reliable private chauffeur across the Greater Bay Area |
| Default / home meta | Explore private chauffeur services in Macau for airport transfers, local rides, city tours, and chauffeur hire by the hour. Choose the journey that suits your plans. | Explore private chauffeur services across Macau, Mainland China, and Hong Kong for airport transfers, local rides, Macau city tours, and chauffeur hire by the hour. Choose the journey that suits your plans. |
| Home `<title>` | Private chauffeur in Macau | Private chauffeur across the Greater Bay Area |
| Home H1 | Your reliable private chauffeur in Macau | Your reliable private chauffeur across the Greater Bay Area |
| Home hero sub | Airport transfers, city rides, and hourly service — requested in minutes. | Airport transfers, city rides, and hourly service across Macau, Mainland China, and Hong Kong — requested in minutes. |
| Home intro | A direct ride or time to move at your own pace. Share the details and our team will review your request before confirming arrangements. | A direct ride or time to move at your own pace in Macau, Mainland China, or Hong Kong. Share the details and our team will review your request before confirming arrangements. |
| Home Point To Point card | A planned ride between places, from arrivals to local transfers. | A planned ride between places across Macau, Mainland China, and Hong Kong. |
| Footer | Private bookings on this site are Macau chauffeur requests, quoted after review. Corporate, hotel, and agency programmes follow the Kai Yue Group portfolio. | Private bookings on this site are chauffeur requests for Macau, Mainland China, and Hong Kong, quoted after review. Corporate, hotel, and agency programmes follow the Kai Yue Group portfolio. |
| Airport H1 | Private airport transfer in Macau | Private airport transfer |
| Airport SEO title | Airport Transfer in Macau — Private Chauffeur | Airport Transfer — Private Chauffeur |
| Airport SEO description | Private chauffeur transfers to and from Macau International Airport, connecting arriving and departing guests with hotels and local addresses across Macau. | Private chauffeur transfers to and from airports in Macau, Mainland China, and Hong Kong, connecting arriving and departing guests with hotels and local addresses. |
| Airport summary | Private airport pickup and drop-off between Macau International Airport and hotels or local addresses. | Private airport pickup and drop-off between an airport and a hotel or local address in Macau, Mainland China, or Hong Kong. |
| Airport intro | Travel between Macau International Airport and a hotel, home, or other Macau address with a private chauffeur. … | Travel between an airport in Macau, Mainland China, or Hong Kong and a hotel, home, or other local address with a private chauffeur. … |
| Airport process 1 | Connect Macau International Airport with your hotel or another local address. … | Connect the airport with your hotel or another local address. … |
| Airport process 2 | Travel from a hotel, home, or other Macau pickup point to the airport. … | Travel from a hotel, home, or other pickup point to the airport. … |
| Cross-border H1 | Cross-border car journeys from Macau | Cross-border car journeys |
| Cross-border SEO title | Cross-Border Private Car from Macau — Journey Enquiry | Cross-Border Private Car — Journey Enquiry |
| Cross-border SEO description | Enquire about a private car journey between Macau and a Mainland destination. … | Enquire about a private car journey between Macau, Mainland China, and Hong Kong. … |
| Cross-border summary | Plan a private journey that starts or ends in Macau and crosses to the Mainland. | Plan a private journey between Macau, Mainland China, and Hong Kong. |
| Cross-border overview | Journeys beyond Macau | Journeys across the Greater Bay Area |
| Cross-border intro | This enquiry is for a private car journey that begins or ends in Macau and crosses into Mainland China. … | This enquiry is for a private car journey between Macau, Mainland China, and Hong Kong. … |
| Cross-border who 1 | Guests arriving from or departing to the Mainland | Guests travelling between Macau, Mainland China, and Hong Kong |
| Cross-border who 2 | Companies moving staff between Macau and Mainland offices | Companies moving staff between offices in these regions |
| Cross-border process 1 | Describe a Mainland pickup and Macau destination, including the checkpoint you expect to use. | Describe the pickup and destination in Macau, Mainland China, or Hong Kong, including the crossing you expect to use. |
| Cross-border process 2 | For a Macau departure, give the Mainland address and the time you hope to arrive. | Give both addresses and the time you hope to arrive. |
| Cross-border use cases | Mainland to Macau / Macau to Mainland | Macau, Mainland China, and Hong Kong / Onward connections |
| Local transfers H1 | Local transfers within Macau | Local transfers |
| Local transfers SEO title | Private Local Transfers in Macau — Chauffeur Service | Private Local Transfers — Chauffeur Service |
| Local transfers SEO description | Private local transfers within Macau for hotel, restaurant, meeting, and venue journeys. … | Private local transfers in Macau, Mainland China, or Hong Kong for hotel, restaurant, meeting, and venue journeys. … |
| Local transfers summary | Private chauffeur journeys between hotels, restaurants, offices, and venues in Macau. | Private chauffeur journeys between hotels, restaurants, offices, and venues in Macau, Mainland China, or Hong Kong. |
| Local transfers overview | Direct journeys around Macau | Direct journeys in the same city |
| Local transfers intro | Local transfers are private chauffeur journeys that start and finish inside Macau. … two Macau addresses … | … start and finish in the same city in Macau, Mainland China, or Hong Kong. … two local addresses … |
| Local transfers who 1 | Guests moving between venues in Macau | Guests moving between venues in the same city |
| Local transfers process 1 | Travel between a Macau hotel and a restaurant or other local address. | Travel between a hotel and a restaurant or other local address. |
| Local transfers FAQ | … both addresses are inside Macau … | … both addresses are in the same city … |
| Hourly SEO title | Local Chauffeur in Macau by the Hour — Dedicated Private Car | Local Chauffeur by the Hour — Dedicated Private Car |
| Hourly SEO description | Keep a private chauffeur and vehicle by the hour in Macau … | Keep a private chauffeur and vehicle by the hour in Macau, Mainland China, or Hong Kong … |
| Hourly summary | One private vehicle and chauffeur for a planned block of hours in Macau. | One private vehicle and chauffeur for a planned block of hours. |
| Hourly description | … several Macau stops … | … several stops … |
| Hourly intro | Keep one private vehicle and chauffeur for a planned block of hours in Macau … | … in Macau, Mainland China, or Hong Kong … |
| Hourly process 1 | Visit more than one Macau address during the same planned time block. | Visit more than one address in the same city during the same planned time block. |
| Wedding H1 | Wedding chauffeur transport in Macau | Wedding chauffeur transport |
| Wedding SEO title | Macau Wedding Chauffeur — Private Car Transport | Wedding Chauffeur — Private Car Transport |
| Wedding SEO description | Plan private chauffeur transport for a Macau wedding, … | Plan private chauffeur transport for a wedding in Macau, Mainland China, or Hong Kong, … |
| Wedding summary | Private car journeys for ceremony arrivals, photo stops, and wedding guests in Macau. | Private car journeys for ceremony arrivals, photo stops, and wedding guests. |
| Wedding who 1 | Couples arranging ceremony and reception transport in Macau | Couples arranging ceremony and reception transport |
| About meta | … private travel services … | … chauffeur services across Macau, Mainland China, and Hong Kong … |
| About hero title | Kai Yue Travel Group, rooted in Macau | Kai Yue Travel Group, chauffeur services across the Greater Bay Area |
| About hero lede | Private travel in Macau sits alongside business mobility programmes … | Private chauffeur services across Macau, Mainland China, and Hong Kong sit alongside business mobility programmes … |
| About story | … programmes that can span Macau and Mainland destinations. | … programmes that can span Macau, Mainland China, and Hong Kong. |
| About portfolio intro | From a single Macau journey to a recurring company programme, … | From a single chauffeur journey across the Greater Bay Area to a recurring company programme, … |
| About portfolio 01 title | Private travel in Macau | Private chauffeur travel |
| About portfolio 01 body | Airport transfers, local rides, chauffeur hire, weddings, and city journeys planned around your Macau itinerary. | Airport transfers, local rides, chauffeur hire, and weddings across Macau, Mainland China, and Hong Kong. City tours remain a Macau outing. |
| About portfolio 02 | … across Macau and selected Greater Bay Area routes. | … across Macau, Mainland China, Hong Kong, and selected Greater Bay Area routes. |
| About alliance | Kai Yue Travel Group brings Macau travel services and transport capacity to business programmes. | Kai Yue Travel Group brings chauffeur services across Macau, Mainland China, and Hong Kong, plus transport capacity, to business programmes. |
| About business cities | Business programmes cover Macau, Zhuhai, Guangzhou, Shenzhen, Zhongshan, and Jiangmen, … | Business programmes cover Macau, Hong Kong, Zhuhai, Guangzhou, Shenzhen, Zhongshan, and Jiangmen, … |
| About closing | Whether you are planning private travel in Macau or exploring an ongoing business programme, … | Whether you are planning private chauffeur travel across the Greater Bay Area or exploring an ongoing business programme, … |
| Special Offers eyebrow EN | Special offers · Macau | Special offers · Greater Bay Area |
| Special Offers eyebrow pt | Ofertas especiais · Macau | Ofertas especiais · Grande Baía |
| Special Offers eyebrow zh-Hant | 特別優惠 · 澳門 | 特別優惠 · 大灣區 |
| Agency route review | Describe Macau-only or Macau–Mainland movements. | Describe journeys in Macau, Mainland China, or Hong Kong, including any crossings. |
| Nav label PT `Local Chauffeur` | Motorista privado em Macau | Motorista privado |
| Nav/H1 label PT `Local chauffeur by the hour` | Motorista privado à hora em Macau | Motorista privado à hora |
| Nav label zh-Hant `Local Transfers` | 澳門市內接送 | 市內接送 |
| Nav label zh-Hant `Local Chauffeur` | 澳門專屬司機 | 專屬司機 |

Portuguese and Traditional Chinese reviewed keys were added for every new English string above (plus combined `<title> · Kai Yue Travel` variants). City Tours labels that say Macau (for example zh-Hant `澳門市區遊`) were left as they are.

## Not changed

- City Tours catalogue, package Markdown, Home City Tours section, and city-tour service page copy (Macau only).
- Image alt text that describes existing Macau photographs.
- Admin “shown in Macau time”, office address labelled “Macau office”, founding-in-Macau history.
- Prices, fares, licences, fleet counts, 7×24, dual-plate, and other operational claims (existing B2B wording left as previously published).
- D1/R2 bindings. No merge to `main`.

## Limits

- Native-language review of the new pt / zh-Hant strings is still recommended before production publication.
- `user_accepted` and `released` are not established.
