import { SERVICE_AREA_TAGS } from "@/lib/site";
import type { PostCategory } from "@/lib/posts";

export interface GeoTagSuggestion {
  altText: string;
  serviceCategory: PostCategory;
  /**
   * The city named by the text or by the caller's hint, or `null` when neither
   * named one. There is deliberately no fallback city — inventing one produced
   * alt text and tags advertising a location that was never detected.
   */
  locationTag: string | null;
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

/**
 * Suggests a category, a location, alt text and tags for a project post.
 *
 * @param title   Post title. May be empty — posts only require a caption.
 * @param caption Post caption.
 * @param areaHint A location chosen by the caller. Takes precedence over anything detected in the text.
 */
export function generatePostGeoEnhancements(
  title: string,
  caption: string,
  areaHint?: string
): GeoTagSuggestion {
  const cleanTitle = title.toLowerCase();
  const cleanCaption = caption.toLowerCase();

  // Category names come from POST_CATEGORIES — adding one there is the only
  // change needed to offer it here, in the picker, and from the API.
  let category: PostCategory = "Decks";
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
  const area = detectedArea ?? null;

  return {
    altText: area
      ? `Custom ${category.toLowerCase()} completed by EVR Construction in ${area} — professional carpentry and craftsmanship`
      : `Custom ${category.toLowerCase()} completed by EVR Construction — professional carpentry and craftsmanship`,
    serviceCategory: category,
    locationTag: area,
    suggestedTags: area
      ? [category, area, "EVR Construction LLC", "East Tennessee Carpentry"]
      : [category, "EVR Construction LLC", "East Tennessee Carpentry"],
  };
}
