export const SITE = {
  name: "EVR Construction LLC",
  phone: {
    english: "(865) 221-7275",
    spanish: "(865) 275-6672",
    englishHref: "tel:+18652217275",
    spanishHref: "tel:+18652756672",
  },
  serviceAreas: [
    // Knoxville and its surrounding communities first, then the wider region.
    // These are the only places the business advertises, and every surface that
    // names a service area — homepage chips, areaServed JSON-LD, the Posts
    // Manager dropdown, geo detection and the SEO agent's city briefs — derives
    // from this list.
    "Knoxville",
    "Farragut",
    "Bearden",
    "Hardin Valley",
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
 * Appended to every page title. Defined once because three places compose a
 * branded title: the layout's `default` and `template`, and the homepage's
 * Open Graph title, which Next.js does not run through the template.
 */
export const TITLE_SUFFIX = " | EVR Construction LLC";

/**
 * Homepage title WITHOUT the brand — `TITLE_SUFFIX` is appended by the layout's
 * title template and by the homepage's Open Graph title.
 *
 * Google drops the tail of a title longer than roughly 60 characters, and that
 * tail is where the brand sits, so this plus `TITLE_SUFFIX` has to stay under
 * that. The budget is the only reason "Gazebos" is absent here: it still
 * appears in the H1, the meta description and its own service page.
 */
export const HOME_TITLE = "Decks & Carpentry in Knoxville, TN";

/**
 * Homepage / site-wide meta description. Names only cities that appear in
 * SITE.serviceAreas so on-page copy never contradicts the service-area list.
 */
export const HOME_META_DESCRIPTION =
  "Licensed & insured deck, gazebo, railing and carpentry contractor serving Knoxville, Maryville, Oak Ridge and East Tennessee. Free estimates.";
