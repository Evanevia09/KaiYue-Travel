export const site = {
  name: "Kai Yue Travel",
  legalNameDraft: "Kai Yue Travel Group",
  chineseName: "凱悅旅遊",
  chineseGroupName: "凱悅旅遊集團",
  tagline: "Your reliable private chauffeur in Macau",
  description:
    "Request a private airport transfer or chauffeur in Macau. Submit a booking request; a person confirms availability before any trip is treated as booked.",
  url: "https://example.invalid",
  phone: "+853 2833 8882",
  fax: "+853 2833 8885",
  addressLines: [
    "600-E Avenida do Dr. Rodrigo Rodrigues",
    "First International Commercial Centre, 16/F, P16-07",
    "Macau",
  ],
  addressLocal: "澳門羅理基博士大馬路600-E號 第一國際商業中心16樓P16-07",
  timezone: "Asia/Macau",
  locale: "en",
  contentStatus: "draft-unverified",
  logo: "/images/logo.svg",
  defaultOgImage: "/images/hero-home.jpg",
} as const;

export const serviceIconGlyph = {
  plane: "✈",
  building: "⌂",
  route: "▣",
  clock: "◷",
  map: "⌖",
  briefcase: "◆",
} as const;

export const services = [
  {
    slug: "airport-transfer",
    serviceType: "airport_transfer" as const,
    title: "Airport transfer",
    h1: "Private airport transfer in Macau",
    seoTitle: "Airport Transfer in Macau — Private Chauffeur",
    seoDescription:
      "Request a private Macau airport transfer for arrival or departure. A chauffeur request is reviewed by a person before any trip is confirmed.",
    summary: "Scheduled airport pickup or drop-off for arriving and departing guests.",
    description:
      "Use this request for Macau International Airport pickup or drop-off. Share flight timing, passenger count, and luggage notes so the team can review vehicle fit and schedule.",
    intro:
      "A private airport transfer is a one-way chauffeur request between Macau International Airport and a hotel, home, or other address in Macau. Submit the form with pickup, destination, and timing. A team member reviews the request and confirms separately if the trip can proceed.",
    whoFor: [
      "Arriving guests who want a pre-arranged pickup",
      "Departing travelers going from a hotel or home to the airport",
      "Families or groups who need luggage considered in the vehicle review",
    ],
    process: [
      "Submit pickup, destination, flight-aware timing, and passenger details.",
      "The team reviews notice window, vehicle fit, and notes.",
      "You receive a separate confirmation if the transfer can proceed.",
    ],
    useCases: ["Arrival pickup", "Departure drop-off", "Hotel to airport"],
    included: [
      "Private chauffeur request",
      "Meet-and-greet details you provide",
      "Flight-aware scheduling review",
    ],
    notIncluded: ["Guaranteed live flight tracking", "Automatic confirmation"],
    quoteBasis: "One-way transfer: pickup, drop-off, timing, passengers, and luggage",
    icon: "plane" as const,
    faqs: [
      {
        question: "Do you wait if a flight is delayed?",
        answer:
          "Add the flight details and expected delay notes on the form. Waiting time is reviewed with the request and confirmed by the team, not assumed.",
      },
      {
        question: "Can I book a same-day airport transfer?",
        answer:
          "The form asks for at least 24 hours’ notice. Same-day airport requests may be reviewed, but they are not guaranteed.",
      },
    ],
    relatedSlugs: ["hotel-transfer", "point-to-point", "corporate"],
  },
  {
    slug: "hotel-transfer",
    serviceType: "hotel_transfer" as const,
    title: "Hotel transfer",
    h1: "Private hotel transfer in Macau",
    seoTitle: "Hotel Transfer in Macau — Private Car & Chauffeur",
    seoDescription:
      "Request a private hotel transfer in Macau for check-in, inter-hotel moves, or a restaurant drop-off. Confirmation follows a human review.",
    summary: "Point-to-point hotel pickup and drop-off around Macau.",
    description:
      "Use this request when the journey is between a hotel and another address in Macau. Name the hotel, the other stop, and the time you need.",
    intro:
      "Hotel transfers cover private chauffeur journeys that start or end at a Macau hotel. Typical uses include check-in from the airport area, moving between hotels, or a timed drop-off. This is still a request until the team confirms it.",
    whoFor: [
      "Guests arriving at or leaving a Macau hotel",
      "Travelers moving between hotels on the same day",
      "Hosts arranging a pickup for visiting guests",
    ],
    process: [
      "Name the hotel, the other address, and the pickup time.",
      "Add passenger count and any luggage or accessibility notes.",
      "Wait for a person to confirm the transfer after review.",
    ],
    useCases: ["Hotel check-in", "Inter-hotel moves", "Restaurant drop-off"],
    included: ["Private vehicle request", "Named passenger list"],
    notIncluded: ["Room booking", "Event tickets"],
    quoteBasis: "Point-to-point hotel journey: addresses, timing, and passenger count",
    icon: "building" as const,
    faqs: [
      {
        question: "Do you go inside the hotel to collect guests?",
        answer:
          "Describe the meeting point in the notes, such as a lobby or porte-cochère. Exact pickup instructions are confirmed with the request.",
      },
      {
        question: "Can the chauffeur wait while we check in?",
        answer:
          "If you need waiting time, say so in the notes or consider an hourly charter. Waiting is not assumed on a one-way hotel transfer.",
      },
    ],
    relatedSlugs: ["airport-transfer", "point-to-point", "hourly-charter"],
  },
  {
    slug: "point-to-point",
    serviceType: "point_to_point" as const,
    title: "Point to point",
    h1: "Point-to-point private car in Macau",
    seoTitle: "Point-to-Point Chauffeur in Macau — One-Way Private Car",
    seoDescription:
      "Request a one-way private chauffeur journey between two Macau addresses. Share pickup, destination, and timing for a reviewed quote.",
    summary: "A single private journey between two addresses.",
    description: "Tell us pickup, destination, and timing. We confirm the request after review.",
    intro:
      "Point-to-point is the simplest private chauffeur request: one pickup, one destination, one agreed time in Macau. Use it for meetings, a city drop-off, or any one-way journey that is not an airport or hotel-labelled trip.",
    whoFor: [
      "Residents and visitors who need a single private ride",
      "Guests going to a meeting, dinner, or appointment",
      "Anyone who knows both addresses in advance",
    ],
    process: [
      "Enter pickup, destination, date and time, and passenger count.",
      "Add notes that affect the vehicle, such as luggage or child seats.",
      "The team reviews the journey and confirms if it can proceed.",
    ],
    useCases: ["City transfers", "Meetings", "One-way journeys"],
    included: ["Direct journey request", "Passenger count and luggage notes"],
    notIncluded: ["Open-ended waiting unless requested as hourly charter"],
    quoteBasis: "Single one-way journey between two addresses",
    icon: "route" as const,
    faqs: [
      {
        question: "What if I have more than one stop?",
        answer:
          "List extra stops in the notes. Several stops or a flexible itinerary may fit hourly charter better than a single point-to-point request.",
      },
      {
        question: "Can I keep the car for the return?",
        answer:
          "Add an optional return time on the form, or send two one-way requests. Return legs are confirmed with the rest of the booking.",
      },
    ],
    relatedSlugs: ["hotel-transfer", "hourly-charter", "airport-transfer"],
  },
  {
    slug: "hourly-charter",
    serviceType: "hourly_charter" as const,
    title: "Hourly charter",
    h1: "Hourly private chauffeur charter in Macau",
    seoTitle: "Hourly Chauffeur Charter in Macau — Dedicated Private Car",
    seoDescription:
      "Request a dedicated private vehicle for a block of time in Macau. Describe the itinerary so the team can review hours, stops, and fit.",
    summary: "A dedicated vehicle for a block of time rather than a single drop-off.",
    description:
      "Destination can be flexible. Describe the itinerary in notes so the team can assess the request.",
    intro:
      "Hourly charter is for a block of time with a dedicated chauffeur, rather than a single drop-off. Use it when you expect multiple stops, waiting, or a changing itinerary. The hours you request are reviewed; overtime is not unlimited.",
    whoFor: [
      "Guests with several stops in one outing",
      "Families who want the same vehicle for a half-day",
      "Coordinators who cannot fix every drop-off in advance",
    ],
    process: [
      "Request a start time and describe the planned hours in notes.",
      "List likely stops or the area you need to cover in Macau.",
      "The team reviews duration, vehicle fit, and confirms separately.",
    ],
    useCases: ["Half-day movements", "Multiple stops", "Flexible itineraries"],
    included: ["Time-block request", "Itinerary notes"],
    notIncluded: ["Unlimited overtime without confirmation"],
    quoteBasis: "Time block: requested hours, itinerary notes, and vehicle preference",
    icon: "clock" as const,
    faqs: [
      {
        question: "How many hours should I request?",
        answer:
          "Estimate the time you actually need, including waiting. The team confirms the block after review. Extra hours are not automatic.",
      },
      {
        question: "Is destination required?",
        answer:
          "Hourly charter can leave destination optional on the form. Still describe the area and likely stops so the review is realistic.",
      },
    ],
    relatedSlugs: ["sightseeing", "point-to-point", "corporate"],
  },
  {
    slug: "sightseeing",
    serviceType: "sightseeing" as const,
    title: "Macau sightseeing",
    h1: "Private Macau sightseeing chauffeur",
    seoTitle: "Macau Sightseeing with Private Chauffeur — Custom Stops",
    seoDescription:
      "Request private sightseeing transport around Macau. Suggest stops and timing; routes and dwell times are confirmed after review.",
    summary: "Private sightseeing transport around Macau with a dedicated chauffeur.",
    description:
      "Request a sightseeing journey. Specific routes and dwell times are confirmed after review.",
    intro:
      "Sightseeing requests are private chauffeur journeys around Macau with stops you suggest. This is transport, not a ticketed guided tour. Attraction admission, licensed guiding, and fixed itineraries are outside this request unless the team later confirms something different.",
    whoFor: [
      "Families and guests who want a private car between Macau sights",
      "Visitors with a short list of stops and a preferred pace",
      "Hosts planning a half-day outing for arriving guests",
    ],
    process: [
      "Share a start time, passenger count, and suggested stops.",
      "Note any dwell time or accessibility needs.",
      "The team reviews the route and confirms if the outing can proceed.",
    ],
    useCases: ["City highlights", "Custom stops", "Family or guest touring"],
    included: ["Private vehicle request", "Suggested stop notes"],
    notIncluded: ["Guided tour tickets or attraction admission"],
    quoteBasis: "Sightseeing outing: start time, suggested stops, and duration notes",
    icon: "map" as const,
    faqs: [
      {
        question: "Does the chauffeur act as a tour guide?",
        answer:
          "This request is for private transport. Licensed guiding and attraction tickets are not included unless separately confirmed.",
      },
      {
        question: "Can you cover the Greater Bay Area?",
        answer:
          "This site currently offers Macau sightseeing requests. Cross-border coverage is not published as a confirmed fact here.",
      },
    ],
    relatedSlugs: ["hourly-charter", "point-to-point", "hotel-transfer"],
  },
  {
    slug: "corporate",
    serviceType: "corporate" as const,
    title: "Corporate transport",
    h1: "Corporate chauffeur requests in Macau",
    seoTitle: "Corporate Transport in Macau — Executive & Guest Movements",
    seoDescription:
      "Request executive and guest chauffeur movements in Macau. For programmes and recurring needs, send a corporate inquiry after the trip request.",
    summary: "Executive and guest movements for companies, hotels, and event coordinators.",
    description:
      "For recurring or multi-guest programmes, use the corporate inquiry form so the team can follow up.",
    intro:
      "Corporate transport covers chauffeur requests for executives, hotel guests, and event movements in Macau. A single trip can use the booking form. Recurring programmes, multiple vehicles, or event-day coordination should also go through the corporate inquiry path so the team can follow up.",
    whoFor: [
      "Companies arranging executive travel in Macau",
      "Hotels coordinating guest airport and hotel movements",
      "Event coordinators requesting guest transport",
    ],
    process: [
      "Send a trip request for a known movement, or an inquiry for a programme.",
      "Include company name, dates, passenger volume, and a named contact.",
      "A person follows up. This is not a contracted service-level agreement.",
    ],
    useCases: ["Executive travel", "Hotel guest programmes", "Event guest movements"],
    included: ["Named contact and company details", "Human follow-up"],
    notIncluded: ["Dispatch apps or live GPS in this release"],
    quoteBasis: "Programme or trip: dates, volume, vehicle notes, and named contact",
    icon: "briefcase" as const,
    faqs: [
      {
        question: "Should I use this page or the corporate inquiry form?",
        answer:
          "Use Book this service for one known journey. Use the corporate inquiry form when you need a programme, several vehicles, or recurring dates.",
      },
      {
        question: "Do you guarantee a response time?",
        answer:
          "No contracted response time is published. The team follows up using the contact details you provide.",
      },
    ],
    relatedSlugs: ["airport-transfer", "hourly-charter", "hotel-transfer"],
  },
] as const;

export type ServiceRecord = (typeof services)[number];

export const serviceLinks = services.map((service) => ({
  href: `/services/${service.slug}`,
  label: service.title,
}));

export const nav = [
  { href: "/services/airport-transfer", label: "Airport ride" },
  {
    label: "City rides",
    children: [
      { href: "/services/hotel-transfer", label: "Hotel transfer" },
      { href: "/services/point-to-point", label: "Point to point" },
      { href: "/services/sightseeing", label: "Macau sightseeing" },
    ],
  },
  { href: "/services/hourly-charter", label: "Hourly" },
  { href: "/faq", label: "Help" },
  {
    label: "Business",
    children: [
      { href: "/business/travel-agency", label: "Travel agency" },
      { href: "/corporate", label: "Corporate solution" },
      { href: "/business/hotels-resorts", label: "Hotels & resorts" },
    ],
  },
] as const;

export const footerServiceNav = [
  ...serviceLinks,
  { href: "/pricing", label: "Pricing" },
] as const;

export const footerNav = [
  { href: "/fleet", label: "Fleet" },
  { href: "/booking", label: "Book now" },
  { href: "/contact", label: "Contact" },
] as const;

export const faqs = [
  {
    question: "Is submitting the form a confirmed booking?",
    answer:
      "No. Submission creates a request. A team member reviews it and confirms separately. Do not treat the reference as a guaranteed vehicle assignment.",
  },
  {
    question: "How far in advance should I request a car?",
    answer:
      "The form currently asks for at least 24 hours’ notice. Same-day requests may be reviewed, but they are not guaranteed.",
  },
  {
    question: "Do you show prices on the website?",
    answer:
      "Published fares are not listed yet. The pricing page explains how each quote is prepared. Amounts and payment method are confirmed when the team accepts a request.",
  },
  {
    question: "Can I request a specific vehicle?",
    answer:
      "You can add a preference. Preferences are not a guarantee of a particular model or specification.",
  },
  {
    question: "How do companies request recurring transport?",
    answer:
      "Use the corporate page inquiry form. Include company name, expected volume, and timing so the team can follow up.",
  },
] as const;

export function relatedServices(service: ServiceRecord) {
  return service.relatedSlugs
    .map((slug) => services.find((item) => item.slug === slug))
    .filter((item): item is ServiceRecord => Boolean(item));
}
