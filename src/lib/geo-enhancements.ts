import { SERVICE_AREA_TAGS } from "@/lib/site";

export interface GeoTagSuggestion {
  altText: string;
  serviceCategory: string;
  locationTag: string;
  suggestedTags: string[];
}

/** Extra spellings that should match a service area in post text. */
const LOCATION_ALIASES: Record<string, readonly string[]> = {
  "Lenoir City, TN": ["lenoir city", "lenoir"],
};

/**
 * City matchers used to detect a location from post text.
 *
 * Derived from SITE.serviceAreas, which is the single published list. Do not
 * add cities here that the site does not advertise, otherwise generated alt
 * text will name locations the service-areas section omits.
 */
const EAST_TN_LOCATIONS: ReadonlyArray<{ tag: string; keywords: readonly string[] }> =
  SERVICE_AREA_TAGS.map((tag) => ({
    tag,
    keywords: LOCATION_ALIASES[tag] ?? [tag.replace(/, TN$/, "").toLowerCase()],
  }));

export function generatePostGeoEnhancements(title: string, caption: string, areaHint?: string): GeoTagSuggestion {
  const cleanTitle = title.toLowerCase();
  const cleanCaption = caption.toLowerCase();

  // Category names MUST match the CATEGORIES array in Posts Manager exactly:
  // ["Decks", "Gazebos", "Restoration", "Remodeling", "Carpentry", "Patios"]
  let category = "Decks";
  if (cleanTitle.includes("gazebo") || cleanCaption.includes("gazebo") || cleanCaption.includes("pergola") || cleanCaption.includes("pavilion")) {
    category = "Gazebos";
  } else if (cleanTitle.includes("patio") || cleanCaption.includes("patio") || cleanCaption.includes("porch") || cleanCaption.includes("screened")) {
    category = "Patios";
  } else if (cleanTitle.includes("restor") || cleanCaption.includes("restor") || cleanCaption.includes("stain") || cleanCaption.includes("sand") || cleanCaption.includes("repair") || cleanCaption.includes("rebuild")) {
    category = "Restoration";
  } else if (cleanTitle.includes("remodel") || cleanCaption.includes("remodel") || cleanCaption.includes("renovation") || cleanCaption.includes("addition")) {
    category = "Remodeling";
  } else if (cleanTitle.includes("framing") || cleanCaption.includes("carpentry") || cleanCaption.includes("corbel") || cleanCaption.includes("trim") || cleanCaption.includes("header")) {
    category = "Carpentry";
  }

  let detectedArea = areaHint;
  if (!detectedArea) {
    const combinedText = `${cleanTitle} ${cleanCaption}`;
    for (const loc of EAST_TN_LOCATIONS) {
      if (loc.keywords.some((kw) => combinedText.includes(kw))) {
        detectedArea = loc.tag;
        break;
      }
    }
  }
  const area = detectedArea || "Knoxville, TN";

  return {
    altText: `Custom ${category.toLowerCase()} completed by EVR Construction in ${area} — professional carpentry and craftsmanship`,
    serviceCategory: category,
    locationTag: area,
    suggestedTags: [category, area, "EVR Construction LLC", "East Tennessee Carpentry"],
  };
}
