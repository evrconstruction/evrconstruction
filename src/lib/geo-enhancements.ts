export interface GeoTagSuggestion {
  altText: string;
  serviceCategory: string;
  locationTag: string;
  suggestedTags: string[];
}

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

  const EAST_TN_LOCATIONS: Array<{ tag: string; keywords: string[] }> = [
    { tag: "Farragut, TN", keywords: ["farragut"] },
    { tag: "Hardin Valley, TN", keywords: ["hardin valley"] },
    { tag: "Lenoir City, TN", keywords: ["lenoir city", "lenoir"] },
    { tag: "Loudon, TN", keywords: ["loudon"] },
    { tag: "Maryville, TN", keywords: ["maryville"] },
    { tag: "Alcoa, TN", keywords: ["alcoa"] },
    { tag: "Oak Ridge, TN", keywords: ["oak ridge"] },
    { tag: "Powell, TN", keywords: ["powell"] },
    { tag: "Clinton, TN", keywords: ["clinton"] },
    { tag: "Bearden, TN", keywords: ["bearden"] },
    { tag: "Sevierville, TN", keywords: ["sevierville"] },
    { tag: "Pigeon Forge, TN", keywords: ["pigeon forge"] },
    { tag: "Gatlinburg, TN", keywords: ["gatlinburg"] },
    { tag: "Seymour, TN", keywords: ["seymour"] },
    { tag: "Morristown, TN", keywords: ["morristown"] },
    { tag: "Maynardville, TN", keywords: ["maynardville"] },
    { tag: "Kingston, TN", keywords: ["kingston"] },
    { tag: "Tellico Plains, TN", keywords: ["tellico"] },
  ];

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
