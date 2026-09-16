export const site = {
  name: "Kai Yue Travel",
  legalNameDraft: "Kai Yue Travel Group",
  chineseName: "凱悅旅遊",
  chineseGroupName: "凱悅旅遊集團",
  tagline: "Private Car & Chauffeur Service in Macau",
  description:
    "Request a private chauffeur in Macau. Submit a booking request and our team will confirm availability before any trip is confirmed.",
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
} as const;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/corporate", label: "Corporate" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const footerNav = [
  { href: "/services", label: "Services" },
  { href: "/fleet", label: "Fleet" },
  { href: "/booking", label: "Book now" },
  { href: "/contact", label: "Contact" },
] as const;

export const services = [
  {
    slug: "airport-transfer",
    serviceType: "airport_transfer" as const,
    title: "Airport transfer",
    summary: "Scheduled airport pickup or drop-off for arriving and departing guests.",
    description:
      "Request a private airport transfer. After you submit, our team reviews timing, vehicle fit, and confirms the trip separately.",
    useCases: ["Arrival pickup", "Departure drop-off", "Hotel to airport"],
    included: [
      "Private chauffeur",
      "Meet-and-greet request details",
      "Flight-aware scheduling review",
    ],
    notIncluded: ["Guaranteed live flight tracking", "Automatic confirmation"],
    icon: "plane",
  },
  {
    slug: "hotel-transfer",
    serviceType: "hotel_transfer" as const,
    title: "Hotel transfer",
    summary: "Point-to-point hotel pickup and drop-off around Macau.",
    description:
      "Use this request when your journey is between a hotel and another address in Macau.",
    useCases: ["Hotel check-in", "Inter-hotel moves", "Restaurant drop-off"],
    included: ["Private vehicle request", "Named passenger list"],
    notIncluded: ["Room booking", "Event tickets"],
    icon: "building",
  },
  {
    slug: "point-to-point",
    serviceType: "point_to_point" as const,
    title: "Point to point",
    summary: "A single private journey between two addresses.",
    description: "Tell us pickup, destination, and timing. We confirm the request after review.",
    useCases: ["City transfers", "Meetings", "One-way journeys"],
    included: ["Direct journey request", "Passenger count and luggage notes"],
    notIncluded: ["Open-ended waiting unless requested as hourly charter"],
    icon: "route",
  },
  {
    slug: "hourly-charter",
    serviceType: "hourly_charter" as const,
    title: "Hourly charter",
    summary: "A dedicated vehicle for a block of time rather than a single drop-off.",
    description:
      "Destination can be flexible. Describe the itinerary in notes so the team can assess the request.",
    useCases: ["Half-day movements", "Multiple stops", "Flexible itineraries"],
    included: ["Time-block request", "Itinerary notes"],
    notIncluded: ["Unlimited overtime without confirmation"],
    icon: "clock",
  },
  {
    slug: "sightseeing",
    serviceType: "sightseeing" as const,
    title: "Macau sightseeing",
    summary: "Private sightseeing transport around Macau with a dedicated chauffeur.",
    description:
      "Request a sightseeing journey. Specific routes and dwell times are confirmed after review.",
    useCases: ["City highlights", "Custom stops", "Family or guest touring"],
    included: ["Private vehicle request", "Suggested stop notes"],
    notIncluded: ["Guided tour tickets or attraction admission"],
    icon: "map",
  },
  {
    slug: "corporate",
    serviceType: "corporate" as const,
    title: "Corporate transport",
    summary: "Executive and guest movements for companies, hotels, and event coordinators.",
    description:
      "For recurring or multi-guest programmes, use the corporate inquiry form so the team can follow up.",
    useCases: ["Executive travel", "Hotel guest programmes", "Event guest movements"],
    included: ["Named contact and company details", "Human follow-up"],
    notIncluded: ["Dispatch apps or live GPS in this release"],
    icon: "briefcase",
  },
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
      "Release 1 is quote-based. Pricing and payment method are communicated when the team confirms a request.",
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
