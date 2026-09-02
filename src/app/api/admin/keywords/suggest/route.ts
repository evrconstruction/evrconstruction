import { NextResponse } from "next/server";

const EAST_TN_LOCATIONS = [
  "Knoxville, TN",
  "Farragut, TN",
  "Hardin Valley, TN",
  "Maryville, TN",
  "Oak Ridge, TN",
  "Lenoir City, TN",
  "Powell, TN",
  "Bearden, TN",
];

const LOCAL_KEYWORD_TEMPLATES = [
  { template: "custom deck builder {city}", category: "Decks" },
  { template: "deck contractor {city} tn", category: "Decks" },
  { template: "covered patio and deck builder {city}", category: "Decks" },
  { template: "cedar gazebo builder {city}", category: "Gazebos" },
  { template: "timber frame gazebo construction {city} tn", category: "Gazebos" },
  { template: "deck restoration and staining {city}", category: "Restoration" },
  { template: "wood deck board replacement {city} tn", category: "Restoration" },
  { template: "home remodeling contractor {city}", category: "Remodeling" },
  { template: "exterior home addition builders {city} tn", category: "Remodeling" },
  { template: "custom finish carpentry {city} tn", category: "Carpentry" },
  { template: "exterior carpentry and trim {city}", category: "Carpentry" },
  { template: "patio and pergola builder {city}", category: "Patios" },
  { template: "attached pergola construction {city} tn", category: "Patios" },
];

export async function POST() {
  try {
    const suggestions: { keyword: string; category: string; location: string }[] = [];

    // Generate diverse recommendations across services and East TN regions
    const shuffledLocations = [...EAST_TN_LOCATIONS].sort(() => Math.random() - 0.5);
    const shuffledTemplates = [...LOCAL_KEYWORD_TEMPLATES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(6, shuffledTemplates.length); i++) {
      const templateItem = shuffledTemplates[i];
      const loc = shuffledLocations[i % shuffledLocations.length];
      const cityName = loc.replace(", TN", "");
      const keyword = templateItem.template.replace("{city}", cityName.toLowerCase());

      suggestions.push({
        keyword,
        category: templateItem.category,
        location: loc,
      });
    }

    return NextResponse.json({
      suggestions,
      total: suggestions.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to suggest keywords";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
