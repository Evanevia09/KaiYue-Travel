import { site } from "./site.ts";

/** Owner-approved B2B copy source: Kai Yue Group portfolio (2026-09-17). */
export const business = {
  headline: "Premium business mobility in the Greater Bay Area",
  allianceLine: "Kai Yue Travel × Mingmen Tourism × Mingmen Technology",
  idea: "Innovation / Cooperation / Development / Win-win",
  philosophy: ["Safe", "Efficient", "Distinguished", "Intelligent"] as const,
  founded: "2009",
  renamed: "2024",
  formerName: "Zhaoxin International Travel Limited",
  formerNameZh: "昭信國際旅遊有限公司",
  headquarters: "Macau",
  branch: "Hengqin",
  vehicle: "Toyota Alphard 40 Series",
  fleetScale: "200+",
  hours: "7×24, including holidays and peak periods",
  cities: ["Macau", "Zhuhai", "Guangzhou", "Shenzhen", "Zhongshan", "Jiangmen"] as const,
  venetian:
    "one of The Venetian Macao’s official business-car / chauffeur service providers",
  mission:
    "Raise tourism standards and service levels in Macau and across the Greater Bay Area.",
  inquiryNote:
    "This website form is a programme inquiry. A person follows up. Vehicle assignment, live tracking, and dispatch run through the operations team and partner platforms — not automatically from this site.",
} as const;

export const allianceMembers = [
  {
    name: site.legalName,
    nameZh: site.legalNameZh,
    role: "Compliant capacity",
    summary:
      "Lawful cross-border transport capacity. Holds a Macau Government Tourism Office travel-agency licence and related cross-border passenger-transport qualifications, so vehicles and chauffeurs meet Macau and Mainland requirements.",
  },
  {
    name: "Mingmen Tourism Co., Ltd.",
    nameZh: "名門旅遊有限公司",
    role: "Dispatch and operations",
    summary:
      "7×24 dispatch, chauffeur management, quality monitoring, and incident handling: immediate order response, intelligent vehicle matching, and journeys that stay controllable end to end.",
  },
  {
    name: "Mingmen Technology Co., Ltd.",
    nameZh: "名門科技有限公司",
    role: "Intelligent platform",
    summary:
      "Self-developed One-Click Travel (一鍵遊) platform for online booking, intelligent assignment, live journey tracking, data analysis, and customer service.",
  },
] as const;

export const travelAdvantages = [
  {
    title: "Dedicated business-car service",
    body: `A luxury fleet of more than 200 new ${business.vehicle} vehicles, including dual-plate Macau–Mainland cars for Greater Bay Area work.`,
  },
  {
    title: "Professional team",
    body: "Experienced tour guides, customer-service specialists, and logistics support around the journey — not only the car.",
  },
  {
    title: "Personalized programmes",
    body: "Itinerary planning from hotel booking to event arrangements, tailored to frequency, scene, and scale.",
  },
  {
    title: "Partner network",
    body: "Cooperative relationships with five-star hotels, airlines, and related suppliers in Macau and nearby regions.",
  },
] as const;

export const corporateScenarios = [
  {
    title: "Premium business reception",
    audience: "Corporate VIPs, overseas guests, and named client cars",
    points: [
      `${business.vehicle} luxury MPV with drinking water, charging, and a comfortable cabin`,
      "Chauffeurs in uniform; arrive early; luggage assistance; confidentiality throughout",
      "Macau coverage and Macau–Greater Bay Area cross-border transfers",
    ],
  },
  {
    title: "Long-term official cars",
    audience: "Daily corporate use",
    points: [
      "Dedicated chauffeur and vehicle, with regular professional maintenance",
      "Optional body branding; unified billing with trip reports and fuel/toll receipts",
      "An asset-light alternative to owning cars and hiring drivers",
    ],
  },
  {
    title: "Corporate events",
    audience: "Team-building, annual meetings, seminars, client events",
    points: [
      "Departure times and routes adjusted to the event flow, including multi-stop Macau itineraries",
      "Multiple identical premium vehicles for a unified team look",
      "Dedicated customer-service follow-up through the event",
    ],
  },
  {
    title: "Meetings and team travel",
    audience: "Conferences, exhibitions, and group trips",
    points: [
      "Checkpoint, airport, and hotel-to-venue transfers for delegates",
      "Batch dispatch for employee group travel with route planning",
      "Macau–Greater Bay Area connection for regional meetings",
    ],
  },
] as const;

export const compliancePoints = [
  "Macau Government Tourism Office travel-agency licence",
  "DSAT (Transport Bureau) tourist passenger-transport licence",
  "Vehicles marked with company name and licence number for verification",
  "Macau + Mainland dual-plate registration; regular safety inspection and maintenance",
  "Chauffeurs with valid Macau and Mainland licences where the journey requires it",
  "Macau third-party liability and Mainland commercial cover, including passenger-seat insurance",
] as const;

export const programmeCommitments = [
  { title: "Chauffeur appearance", body: "Uniform, staff badge, polite language, luggage assistance." },
  { title: "Journey visibility", body: "GPS track can be shared with the client’s management platform." },
  {
    title: "Emergency cover",
    body: "80%+ of emergency orders aimed to have a vehicle dispatched within 30 minutes; backup vehicle targeted within 5 minutes of a fault report.",
  },
  {
    title: "Punctuality",
    body: "Arrive 15 minutes early. If late beyond the agreed time for reasons on our side, that trip is not charged.",
  },
  { title: "Cleanliness", body: "Interior cleaned after every trip; deep clean and disinfection weekly." },
  { title: "After-sales", body: "Dedicated enterprise channel: response within 10 minutes, resolution within 2 hours." },
] as const;

export const chauffeurStandards = [
  "Valid Macau and Mainland driving licences; cross-border passenger-transport certificate where applicable",
  "No criminal record and no major traffic-violation history",
  "At least three years driving business or luxury vehicles",
  "Familiar with Macau and Greater Bay Area routes and border-crossing procedures",
  "Mandarin and Cantonese; some chauffeurs can receive guests in English",
  "Pre-job training of at least 24 hours, then monthly, quarterly, and annual refreshers",
] as const;

export const supportPoints = [
  "24-hour emergency contact by phone, WhatsApp, and WeChat",
  "Partner workshops in Macau, Zhuhai, and Hengqin",
  "Relay transport at the checkpoint if a border delay is prolonged",
  "Dispatch locates the car and sends a replacement if a chauffeur cannot continue",
] as const;

export function telHref(phone: string) {
  return `tel:${phone.replaceAll(" ", "")}`;
}

export function organizationJsonLd(pageUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.legalName,
    legalName: site.legalName,
    alternateName: [site.groupLegalName, site.legalNameZh, site.groupLegalNameZh, site.name],
    foundingDate: business.founded,
    url: pageUrl,
    telephone: [...site.businessPhones],
    address: {
      "@type": "PostalAddress",
      streetAddress: site.addressLines[0],
      addressLocality: "Macau",
    },
    areaServed: business.cities.map((name) => ({ "@type": "City", name })),
  };
}
