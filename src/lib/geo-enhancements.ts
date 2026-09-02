export interface GeoTagSuggestion {
  altText: string;
  serviceCategory: string;
  locationTag: string;
  suggestedTags: string[];
}

export function generatePostGeoEnhancements(title: string, caption: string, areaHint?: string): GeoTagSuggestion {
  const cleanTitle = title.toLowerCase();
  const cleanCaption = caption.toLowerCase();

  let category = "Custom Decks";
  if (cleanTitle.includes("gazebo") || cleanCaption.includes("gazebo")) category = "Gazebos & Pergolas";
  else if (cleanTitle.includes("porch") || cleanCaption.includes("screened")) category = "Screened Porches";
  else if (cleanTitle.includes("framing") || cleanCaption.includes("carpentry")) category = "Framing & Carpentry";
  else if (cleanTitle.includes("remodel") || cleanCaption.includes("renovation")) category = "Home Remodeling";

  const area = areaHint || (cleanCaption.includes("farragut") ? "Farragut, TN" : cleanCaption.includes("maryville") ? "Maryville, TN" : "Knoxville, TN");

  return {
    altText: `Custom ${category.toLowerCase()} completed by EVR Construction in ${area} — professional carpentry and craftsmanship`,
    serviceCategory: category,
    locationTag: area,
    suggestedTags: [category, area, "EVR Construction LLC", "East Tennessee Carpentry"],
  };
}
