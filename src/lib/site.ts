export const SITE = {
  name: "EVR Construction LLC",
  phone: {
    english: "(865) 221-7275",
    spanish: "(865) 275-6672",
    englishHref: "tel:+18652217275",
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

/**
 * Service areas written as "City, TN" for keyword targeting and post tagging.
 * Derived from SITE.serviceAreas so there is a single list to maintain.
 */
export const SERVICE_AREA_TAGS: readonly string[] = SITE.serviceAreas.map(
  (city) => `${city}, TN`
);

/**
 * Homepage title WITHOUT the brand — `src/app/layout.tsx` appends
 * "| EVR Construction LLC" via its title template.
 */
export const HOME_TITLE = "Decks, Gazebos & Carpentry in Knoxville, TN";

/**
 * Homepage / site-wide meta description. Names only cities that appear in
 * SITE.serviceAreas so on-page copy never contradicts the service-area list.
 */
export const HOME_META_DESCRIPTION =
  "Licensed & insured deck, gazebo, railing and carpentry contractor serving Knoxville, Maryville, Oak Ridge and East Tennessee. Free estimates.";
