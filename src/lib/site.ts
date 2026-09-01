export const SITE = {
  name: "EVR Construction LLC",
  phone: {
    english: "(865) 367-9501",
    spanish: "(865) 275-6672",
    englishHref: "tel:+18653679501",
    spanishHref: "tel:+18652756672",
  },
  serviceAreas: [
    "Knoxville",
    "Clinton",
    "Maynardville",
    "Powell",
    "Gatlinburg",
    "Morristown",
    "Oak Ridge",
    "Maryville",
    "Alcoa",
    "Lenoir City",
    "Seymour",
    "Sevierville",
  ],
  region: "East Tennessee, TN",
  directionsUrl: "https://maps.google.com/?q=East%20Tennessee,%20TN",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Contact", href: "/contact" },
] as const;
