export interface GeoTagSuggestion {
  altText: string;
  serviceCategory: string;
  locationTag: string;
  suggestedTags: string[];
}

export function generatePostGeoEnhancements(title: string, caption: string, areaHint?: string): GeoTagSuggestion {
  const cleanTitle = title.toLowerCase();
  const cleanCaption = caption.toLowerCase();

  // Category names MUST match the CATEGORIES array in the Posts Manager exactly
  let category = "Decks";
  if (cleanTitle.includes("gazebo") || cleanCaption.includes("gazebo") || cleanCaption.includes("pergola") || cleanCaption.includes("pavilion")) {
    category = "Gazebos";
  } else if (cleanTitle.includes("patio") || cleanCaption.includes("patio") || cleanCaption.includes("porch") || cleanCaption.includes("screened")) {
    category = "Patios";
  } else if (cleanTitle.includes("restor") || cleanCaption.includes("restor") || cleanCaption.includes("stain") || cleanCaption.includes("sand") || cleanCaption.includes("repair") || cleanCaption.includes("replacement")) {
    category = "Restoration";
  } else if (cleanTitle.includes("remodel") || cleanCaption.includes("remodel") || cleanCaption.includes("renovation")) {
    category = "Remodeling";
  } else if (cleanTitle.includes("framing") || cleanCaption.includes("carpentry") || cleanCaption.includes("trim") || cleanCaption.includes("corbel") || cleanCaption.includes("framing")) {
    category = "Carpentry";
  }

  const area = areaHint || (cleanCaption.includes("farragut") ? "Farragut, TN" : cleanCaption.includes("maryville") ? "Maryville, TN" : cleanCaption.includes("hardin valley") ? "Hardin Valley, TN" : cleanCaption.includes("powell") ? "Powell, TN" : "Knoxville, TN");

  return {
    altText: `Custom ${category.toLowerCase()} completed by EVR Construction in ${area} — professional carpentry and craftsmanship`,
    serviceCategory: category,
    locationTag: area,
    suggestedTags: [category, area, "EVR Construction LLC", "East Tennessee Carpentry"],
  };
}
