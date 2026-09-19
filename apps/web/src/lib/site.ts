export const site = {
  name: "Kai Yue Travel",
  legalName: "Kai Yue Travel Group Limited",
  legalNameZh: "凱悅旅遊集團有限公司",
  groupLegalName: "Kai Yue Group Limited",
  groupLegalNameZh: "凱悅集團有限公司",
  chineseName: "凱悅旅遊",
  chineseGroupName: "凱悅旅遊集團有限公司",
  tagline: "Your reliable private chauffeur in Macau",
  description:
    "Request a private airport transfer or chauffeur in Macau. Submit a booking request; a person confirms availability before any trip is treated as booked.",
  url: "https://example.invalid",
  phone: "+853 2833 8882",
  fax: "+853 2833 8885",
  businessPhones: ["+853 6366 6665", "+853 6654 8888", "+853 6588 9999"],
  addressLines: [
    "600-E Avenida do Dr. Rodrigo Rodrigues",
    "First International Commercial Centre, 16/F, P16-07",
    "Macau",
  ],
  addressLocal: "澳門羅理基博士大馬路600-E號 第一國際商業中心16樓P16-07",
  timezone: "Asia/Macau",
  locale: "en",
  contentStatus: "b2c-conservative-b2b-group-portfolio",
  logo: "/images/logo.svg",
  defaultOgImage: "/images/hero-home.jpg",
} as const;

export const heroTrustLine = "Macau · Quote after review · Human confirmation";

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
      "Corporate transport covers chauffeur requests for executives, hotel guests, and event movements in Macau. A single trip can use the booking form. Recurring programmes, dual-plate Greater Bay Area work, multiple vehicles, or hotel/agency contracts should go through the corporate inquiry path so the team can follow up.",
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
  {
    slug: "cross-border-rides",
    serviceType: "point_to_point" as const,
    title: "Cross border rides",
    h1: "Cross-border ride requests",
    seoTitle: "Cross-Border Ride Request — Macau Pickup or Drop-Off",
    seoDescription:
      "Send a cross-border ride request for a Macau pickup or drop-off. Availability, documentation, and vehicle eligibility are reviewed by a person before anything is confirmed.",
    summary: "A journey request that crosses the Macau boundary, reviewed before confirmation.",
    description:
      "Describe both ends of the journey, the crossing point, and the timing. Nothing is confirmed until the team has reviewed it.",
    intro:
      "A cross-border ride request covers a journey that begins or ends outside Macau. Border documentation, vehicle eligibility, and vehicle availability are checked by a person before the request is treated as a trip. This page does not publish a claim of a confirmed cross-border licence, permitted routes, or partner arrangements.",
    whoFor: [
      "Guests arriving from or departing to the Mainland",
      "Companies moving staff between Macau and Mainland offices",
      "Hotels arranging onward journeys for guests",
    ],
    process: [
      "Send both addresses, the intended crossing point, and the date and time.",
      "Add passenger count, luggage, and any document notes the journey depends on.",
      "The team reviews eligibility and availability, then confirms separately if it can proceed.",
    ],
    useCases: ["Mainland arrival pickup", "Macau departure drop-off", "Business journeys"],
    included: ["Journey request", "Crossing and document notes you provide"],
    notIncluded: ["Guaranteed border clearance times", "Automatic confirmation"],
    quoteBasis: "Cross-border journey: both addresses, crossing point, timing, and passengers",
    icon: "route" as const,
    faqs: [
      {
        question: "Is a cross-border ride confirmed when I submit the form?",
        answer:
          "No. The form stores a request. Eligibility, documentation, and availability are reviewed by a person, and confirmation is separate.",
      },
      {
        question: "Which crossing points do you use?",
        answer:
          "State the crossing point you need in the notes. Whether that crossing can be used for your journey is confirmed after review, not assumed on this page.",
      },
    ],
    relatedSlugs: ["airport-transfer", "local-transfers", "point-to-point"],
  },
  {
    slug: "local-transfers",
    serviceType: "point_to_point" as const,
    title: "Local transfers",
    h1: "Local transfers within Macau",
    seoTitle: "Local Transfers in Macau — Private Chauffeur Request",
    seoDescription:
      "Request a private transfer between two addresses in Macau. Share pickup, destination, and timing for a quote reviewed by a person.",
    summary: "A private transfer between two Macau addresses, quoted after review.",
    description:
      "Name the pickup and the destination in Macau, then the date and time. The team reviews the journey before confirming.",
    intro:
      "Local transfers are private chauffeur journeys that start and finish inside Macau. Use this request for a hotel to restaurant drop-off, an office to venue move, or any single journey between two Macau addresses that is not an airport or hourly request.",
    whoFor: [
      "Guests moving between venues in Macau",
      "Residents who need a single private journey",
      "Hosts arranging pickups for visiting guests",
    ],
    process: [
      "Enter pickup, destination, and the time you need.",
      "Add passenger count and any luggage or accessibility notes.",
      "A person reviews vehicle fit and timing, then confirms separately.",
    ],
    useCases: ["Venue to venue", "Restaurant drop-off", "Single Macau journey"],
    included: ["Private vehicle request", "Passenger and luggage notes"],
    notIncluded: ["Waiting time unless requested as an hourly service"],
    quoteBasis: "Local journey: pickup, destination, timing, and passenger count",
    icon: "building" as const,
    faqs: [
      {
        question: "How is this different from a point-to-point request?",
        answer:
          "It is the same one-way journey model. Choose this when both addresses are inside Macau and you are not arranging an airport pickup or drop-off.",
      },
      {
        question: "Can I add stops along the way?",
        answer:
          "List extra stops in the notes. Several stops or an open itinerary are usually better requested as an hourly service with a dedicated chauffeur.",
      },
    ],
    relatedSlugs: ["airport-transfer", "point-to-point", "local-chauffeur"],
  },
  {
    slug: "local-chauffeur",
    serviceType: "hourly_charter" as const,
    title: "Local chauffeur",
    h1: "Local chauffeur by the hour",
    seoTitle: "Local Chauffeur in Macau by the Hour — Dedicated Private Car",
    seoDescription:
      "Request a dedicated chauffeur in Macau for a block of hours. Describe the itinerary so the team can review duration, stops, and vehicle fit.",
    summary: "A dedicated chauffeur in Macau for a block of hours you request.",
    description:
      "Give a start time and describe the hours you need. Destination can stay flexible when the itinerary is not fixed yet.",
    intro:
      "A local chauffeur booking gives you one vehicle and one chauffeur for a block of hours in Macau rather than a single drop-off. It suits an afternoon of meetings, several stops in one outing, or any plan that changes as the day goes. The hours you request are reviewed, and extra time is not automatic.",
    whoFor: [
      "Guests with several stops in one outing",
      "Companies moving executives between meetings",
      "Families who want the same vehicle for a half-day",
    ],
    process: [
      "Request a start time and estimate the hours you actually need.",
      "Describe the area and likely stops in the notes.",
      "The team reviews duration and vehicle fit, then confirms separately.",
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
          "Estimate the time you genuinely need, including waiting between stops. The team confirms the block after review.",
      },
      {
        question: "Is a destination required?",
        answer:
          "Not for an hourly booking. Still describe the area and likely stops so the review is realistic.",
      },
    ],
    relatedSlugs: ["weddings", "point-to-point", "local-transfers"],
  },
  {
    slug: "weddings",
    serviceType: "hourly_charter" as const,
    title: "Weddings",
    h1: "Wedding chauffeur requests",
    seoTitle: "Wedding Chauffeur in Macau — Request Private Car Hire",
    seoDescription:
      "Request private chauffeur vehicles for a wedding day in Macau. Share the schedule and guest movements so the team can review vehicle fit and timing.",
    summary: "Private chauffeur requests for a wedding day, reviewed against your schedule.",
    description:
      "Send the date, the schedule you are working to, and the movements you need covered. Vehicles are confirmed after review.",
    intro:
      "Wedding requests cover the day's movements rather than a single journey: ceremony arrivals, photo stops, and guest shuttles between venues. Timing and vehicle count are reviewed against the schedule you send. This is a transport request, not a published wedding package, and decoration or in-car styling is not included unless separately agreed.",
    whoFor: [
      "Couples arranging ceremony and reception transport in Macau",
      "Planners coordinating guest movements between venues",
      "Families who need several vehicles on the same day",
    ],
    process: [
      "Send the date and the schedule you are working to.",
      "List each movement, the passenger count, and which vehicle is needed where.",
      "The team reviews timing and vehicle fit, then confirms separately.",
    ],
    useCases: ["Ceremony arrivals", "Photo stops", "Guest shuttles"],
    included: ["Vehicle request per movement", "Schedule notes you provide"],
    notIncluded: ["In-car decoration or styling", "Automatic confirmation"],
    quoteBasis: "Wedding day: schedule, movements, vehicle count, and hours needed",
    icon: "map" as const,
    faqs: [
      {
        question: "Can we request several vehicles for the same day?",
        answer:
          "Yes. List each movement and how many passengers it covers so the team can review how many vehicles the schedule actually needs.",
      },
      {
        question: "How early should we send a wedding request?",
        answer:
          "The form asks for at least 24 hours' notice, but wedding days involve several movements. Sending the schedule early leaves room for review and confirmation.",
      },
    ],
    relatedSlugs: ["local-chauffeur", "local-transfers", "point-to-point"],
  },
  {
    slug: "city-tours",
    serviceType: "hourly_charter" as const,
    title: "City tours",
    h1: "City tours with a private chauffeur",
    seoTitle: "Macau City Tours by the Hour — Private Chauffeur Request",
    seoDescription:
      "Request a private chauffeur for a Macau city tour by the hour. Suggest the stops and pace; routes and duration are reviewed before anything is confirmed.",
    summary: "A private city tour by the hour, with stops and pace you suggest.",
    description:
      "Suggest the places you want to see and how long you want. This is private transport, not a ticketed guided tour.",
    intro:
      "A city tour booking gives you a vehicle and chauffeur for a block of hours so you can move between Macau's sights at your own pace. Suggest the stops and the dwell time; the route and hours are reviewed before confirmation. Attraction admission and licensed guiding are outside this request unless separately agreed.",
    whoFor: [
      "Visitors with a short list of Macau stops and a preferred pace",
      "Families touring with children and luggage in the car",
      "Hosts showing arriving guests around the city",
    ],
    process: [
      "Request a start time and the hours you expect to need.",
      "List the stops you have in mind, in the order you want them.",
      "The team reviews the route and duration, then confirms separately.",
    ],
    useCases: ["City highlights", "Custom stop lists", "Half-day touring"],
    included: ["Time-block request", "Stop list and pace notes"],
    notIncluded: ["Guided tour tickets or attraction admission"],
    quoteBasis: "City tour: start time, suggested stops, hours needed, and passenger count",
    icon: "map" as const,
    faqs: [
      {
        question: "Does the chauffeur act as a tour guide?",
        answer:
          "This is a private transport request. Licensed guiding and attraction tickets are not included unless separately confirmed.",
      },
      {
        question: "Can we change the order of stops on the day?",
        answer:
          "You can, within the hours you requested. Adding time beyond the confirmed block is reviewed with the team rather than assumed.",
      },
    ],
    relatedSlugs: ["local-chauffeur", "weddings", "sightseeing"],
  },
] as const;

export type ServiceRecord = (typeof services)[number];

export const serviceLinks = services.map((service) => ({
  href: `/services/${service.slug}`,
  label: service.title,
}));

export type NavLink = { readonly href: string; readonly label: string };

export type NavGroup = { readonly label: string; readonly children: readonly NavLink[] };

/**
 * Primary navigation. Every entry is currently a dropdown, but the link branch
 * is kept so a plain top-level page can be added back without touching
 * `BaseLayout` — the union is what makes `"children" in item` narrow.
 */
export type NavItem = NavLink | NavGroup;

/**
 * Service groups are the single source for the service part of the header menus
 * and for the footer services column, so the two cannot drift apart.
 */
export const serviceGroups: readonly NavGroup[] = [
  {
    label: "Point To Point",
    children: [
      { href: "/services/airport-transfer", label: "Airport Transfer" },
      { href: "/services/cross-border-rides", label: "Cross Border Rides" },
      { href: "/services/local-transfers", label: "Local Transfers" },
    ],
  },
  {
    label: "By The Hour",
    children: [
      { href: "/services/local-chauffeur", label: "Local Chauffeur" },
      { href: "/services/weddings", label: "Weddings" },
      { href: "/services/city-tours", label: "City Tours" },
    ],
  },
];

export const nav: readonly NavItem[] = [
  ...serviceGroups,
  {
    label: "Business",
    children: [
      { href: "/business/travel-agency", label: "Travel agency" },
      { href: "/corporate", label: "Corporate solution" },
      { href: "/business/hotels-resorts", label: "Hotels & resorts" },
    ],
  },
];

export const footerServiceGroups = serviceGroups;

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
