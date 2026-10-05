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
    "Explore private chauffeur services in Macau for airport transfers, local rides, city tours, and chauffeur hire by the hour. Choose the journey that suits your plans.",
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
  logo: "/images/kai-yue-travel-group-logo.png",
  defaultOgImage: "/images/illustrative/home-hero-family-v2.jpg",
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
    heroImage: "/images/illustrative/airport-transfer-hero.jpg",
    heroImageAlt:
      "Illustrative airport pickup with travelers meeting a chauffeur beside a private vehicle",
    featuredImage: "/images/illustrative/airport-transfer-feature.jpg",
    featuredImageAlt:
      "Illustrative airport transfer with luggage being loaded beside a private vehicle",
    serviceType: "airport_transfer" as const,
    title: "Airport transfer",
    h1: "Private airport transfer in Macau",
    seoTitle: "Airport Transfer in Macau — Private Chauffeur",
    seoDescription:
      "Private chauffeur transfers to and from Macau International Airport, connecting arriving and departing guests with hotels and local addresses across Macau.",
    summary:
      "Private airport pickup and drop-off between Macau International Airport and hotels or local addresses.",
    overviewHeading: "Airport arrivals and departures",
    detailsHeading: "Airport transfer journeys",
    description:
      "Plan a direct airport journey around your flight time, with space to share your hotel, meeting point, passenger count, and luggage needs.",
    intro:
      "Travel between Macau International Airport and a hotel, home, or other Macau address with a private chauffeur. Airport transfers suit arrivals, departures, and guests carrying luggage who want one planned journey between the terminal and their destination.",
    whoFor: [
      "Arriving guests who want a pre-arranged pickup",
      "Departing travelers going from a hotel or home to the airport",
      "Families or groups travelling with luggage",
    ],
    process: [
      "Connect Macau International Airport with your hotel or another local address. Add your flight time and preferred meeting point.",
      "Travel from a hotel, home, or other Macau pickup point to the airport. Choose a pickup time that fits your departure plans.",
      "Include the number of travellers and luggage so the journey can be planned around your party.",
    ],
    useCases: ["Airport arrivals", "Airport departures", "Groups and luggage"],
    included: [
      "Private chauffeur request",
      "Meet-and-greet details you provide",
      "Flight timing notes",
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
  },
  {
    slug: "cross-border-rides",
    heroImage: "/images/illustrative/cross-border-rides-hero.jpg",
    heroImageAlt: "Illustrative travelers discussing an onward journey beside a private vehicle",
    featuredImage: "/images/illustrative/cross-border-rides-feature.jpg",
    featuredImageAlt: "Illustrative itinerary discussion beside a private vehicle in Macau",
    serviceType: "point_to_point" as const,
    title: "Cross border rides",
    h1: "Cross-border car journeys from Macau",
    seoTitle: "Cross-Border Private Car from Macau — Journey Enquiry",
    seoDescription:
      "Enquire about a private car journey between Macau and a Mainland destination. Share both addresses, preferred crossing, and travel date for route planning.",
    summary: "Plan a private journey that starts or ends in Macau and crosses to the Mainland.",
    overviewHeading: "Journeys beyond Macau",
    detailsHeading: "Cross-border journey details",
    description:
      "Cross-border travel depends on the origin, destination, crossing point, and journey date. Share those details to discuss a route that fits your plans.",
    intro:
      "This enquiry is for a private car journey that begins or ends in Macau and crosses into Mainland China. It helps to provide both addresses, the intended checkpoint, and your travel date. Crossing options and vehicle availability vary by journey.",
    whoFor: [
      "Guests arriving from or departing to the Mainland",
      "Companies moving staff between Macau and Mainland offices",
      "Hotels arranging onward journeys for guests",
    ],
    process: [
      "Describe a Mainland pickup and Macau destination, including the checkpoint you expect to use.",
      "For a Macau departure, give the Mainland address and the time you hope to arrive.",
      "Border route, passenger documents, and vehicle eligibility all affect how the journey can be arranged.",
    ],
    useCases: ["Mainland to Macau", "Macau to Mainland", "Crossing requirements"],
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
  },
  {
    slug: "local-transfers",
    heroImage: "/images/illustrative/local-transfers-hero.jpg",
    heroImageAlt: "Illustrative guest arriving by private vehicle at a Macau venue",
    featuredImage: "/images/illustrative/local-transfers-feature.jpg",
    featuredImageAlt:
      "Illustrative local drop-off with a chauffeur helping a guest from a private vehicle",
    serviceType: "point_to_point" as const,
    title: "Local transfers",
    h1: "Local transfers within Macau",
    seoTitle: "Private Local Transfers in Macau — Chauffeur Service",
    seoDescription:
      "Private local transfers within Macau for hotel, restaurant, meeting, and venue journeys. Travel directly between two addresses with a chauffeur.",
    summary:
      "Private chauffeur journeys between hotels, restaurants, offices, and venues in Macau.",
    overviewHeading: "Direct journeys around Macau",
    detailsHeading: "Local transfer ideas",
    description:
      "A local transfer fits a known pickup and destination when you need one direct ride rather than several stops or an hourly vehicle.",
    intro:
      "Local transfers are private chauffeur journeys that start and finish inside Macau. Use this request for a hotel to restaurant drop-off, an office to venue move, or any single journey between two Macau addresses that is not an airport or hourly request.",
    whoFor: [
      "Guests moving between venues in Macau",
      "Residents who need a single private journey",
      "Hosts arranging pickups for visiting guests",
    ],
    process: [
      "Travel between a Macau hotel and a restaurant or other local address.",
      "Move from an office to a meeting, event venue, or client appointment.",
      "Choose one pickup and one drop-off for a direct local journey without an hourly itinerary.",
    ],
    useCases: ["Hotel and dining", "Office and events", "Direct one-way travel"],
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
  },
  {
    slug: "local-chauffeur",
    heroImage: "/images/illustrative/local-chauffeur-hero-v2.jpg",
    heroImageAlt:
      "Illustrative view from the rear passenger area of a chauffeur driving through Macau",
    featuredImage: "/images/illustrative/local-chauffeur-feature.jpg",
    featuredImageAlt: "Illustrative chauffeur waiting with a private vehicle between appointments",
    serviceType: "hourly_charter" as const,
    title: "Local chauffeur",
    h1: "Local chauffeur by the hour",
    seoTitle: "Local Chauffeur in Macau by the Hour — Dedicated Private Car",
    seoDescription:
      "Keep a private chauffeur and vehicle by the hour in Macau for meetings, errands, and multiple stops on one flexible local itinerary.",
    summary: "One private vehicle and chauffeur for a planned block of hours in Macau.",
    overviewHeading: "Keep a car for your itinerary",
    detailsHeading: "Ways to use a local chauffeur",
    description:
      "A local chauffeur by the hour suits days with several Macau stops, time between meetings, or plans that may change along the way.",
    intro:
      "Keep one private vehicle and chauffeur for a planned block of hours in Macau instead of booking separate rides for each stop. This service fits meetings across the city, family errands, or a flexible outing with waiting time between destinations.",
    whoFor: [
      "Guests with several stops in one outing",
      "Companies moving executives between meetings",
      "Families who want the same vehicle for a half-day",
    ],
    process: [
      "Visit more than one Macau address during the same planned time block.",
      "Keep the vehicle for travel between business appointments or event venues.",
      "Share a starting point and broad plan while leaving room to adjust the order of stops.",
    ],
    useCases: ["Several local stops", "Business appointments", "Flexible outings"],
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
  },
  {
    slug: "weddings",
    heroImage: "/images/illustrative/weddings-hero.jpg",
    heroImageAlt: "Illustrative couple arriving by private vehicle for a wedding in Macau",
    featuredImage: "/images/illustrative/weddings-feature.jpg",
    featuredImageAlt: "Illustrative wedding guests boarding a private vehicle between venues",
    serviceType: "hourly_charter" as const,
    title: "Weddings",
    h1: "Wedding chauffeur transport in Macau",
    seoTitle: "Macau Wedding Chauffeur — Private Car Transport",
    seoDescription:
      "Plan private chauffeur transport for a Macau wedding, from ceremony arrivals and photo stops to guest journeys between venues.",
    summary:
      "Private car journeys for ceremony arrivals, photo stops, and wedding guests in Macau.",
    overviewHeading: "Travel around the wedding schedule",
    detailsHeading: "Wedding day journeys",
    description:
      "Wedding transport can cover several timed movements in one day, with the schedule, passenger groups, and venue addresses shaping the plan.",
    intro:
      "A wedding day may involve travel to the ceremony, stops for photographs, and guest movements between venues. Private chauffeur transport can be planned around those separate journeys and their timing. Decoration and in-car styling are outside the transport service.",
    whoFor: [
      "Couples arranging ceremony and reception transport in Macau",
      "Planners coordinating guest movements between venues",
      "Families who need several vehicles on the same day",
    ],
    process: [
      "Plan how the couple, family, and guests will arrive at the ceremony location.",
      "Allow for travel between venues or photo locations within the day's schedule.",
      "Describe guest groups and timing when more than one vehicle or movement is needed.",
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
  },
  {
    slug: "city-tours",
    heroImage: "/images/illustrative/city-tours-hero.jpg",
    heroImageAlt: "Illustrative visitors enjoying a Macau city stop near their private vehicle",
    featuredImage: "/images/illustrative/city-tours-feature.jpg",
    featuredImageAlt:
      "Illustrative visitors returning to their private vehicle between Macau sights",
    serviceType: "hourly_charter" as const,
    title: "City tours",
    h1: "City tours with a private chauffeur",
    seoTitle: "Private Macau City Tours by the Hour — Chauffeur Transport",
    seoDescription:
      "Explore Macau by private car with a chauffeur for a planned block of hours. Suggest city sights, photo stops, and a pace that suits your group.",
    summary: "A private city tour by the hour, with stops and pace you suggest.",
    overviewHeading: "Discover Macau between stops",
    detailsHeading: "Shape your city outing",
    description:
      "Suggest the places you want to see and how long you want. This is private transport, not a ticketed guided tour.",
    intro:
      "Explore Macau sights in a private vehicle for a planned block of hours. Choose the places that interest your group, leave time for photographs and breaks, and move between stops with a chauffeur. Attraction admission and licensed guiding are separate from transport.",
    whoFor: [
      "Visitors with a short list of Macau stops and a preferred pace",
      "Families touring with children and luggage in the car",
      "Hosts showing arriving guests around the city",
    ],
    process: [
      "Build your outing around the Macau sights your group most wants to visit.",
      "Choose how long to spend at each stop, including time for photos or breaks.",
      "Keep your party together in one private car between the places on your list.",
    ],
    useCases: ["Macau sights", "Photo stops and breaks", "Travel together"],
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
 * Primary navigation supports both dropdown groups and dedicated page links.
 */
export type NavItem = NavLink | NavGroup;

/**
 * Service groups feed the homepage service cards. The header and footer add
 * City Tours as its own group of package links.
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

const cityTourLinks = [
  { href: "/services/city-tours/special-offer", label: "Special offer" },
  { href: "/services/city-tours/half-day", label: "Half day" },
  { href: "/services/city-tours/full-day", label: "Full day" },
] as const;

const serviceMenus = serviceGroups.map((group) => ({
  ...group,
  children: group.children.filter((child) => child.href !== "/services/city-tours"),
}));

export const nav: readonly NavItem[] = [
  ...serviceMenus,
  {
    label: "City Tours",
    children: cityTourLinks,
  },
  {
    label: "Business",
    children: [
      { href: "/business/travel-agency", label: "Travel agency" },
      { href: "/corporate", label: "Corporate solution" },
      { href: "/business/hotels-resorts", label: "Hotels & resorts" },
    ],
  },
];

export const footerServiceGroups: readonly NavGroup[] = [
  ...serviceMenus,
  {
    label: "City Tours",
    children: cityTourLinks,
  },
];

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
      "Published fares are not listed yet. Our team prepares a quote after reviewing your journey details. Amounts and payment method are confirmed when the team accepts a request.",
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
