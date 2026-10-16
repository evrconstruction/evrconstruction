import { describe, it, expect } from "vitest";
import { generatePostGeoEnhancements } from "@/lib/geo-enhancements";
import { POST_CATEGORIES } from "@/lib/posts";

const POSTS_CATEGORIES = POST_CATEGORIES;

describe("generatePostGeoEnhancements", () => {
  it("detects Gazebos from pergola and gazebo keywords", () => {
    const result1 = generatePostGeoEnhancements("", "Custom backyard pergola in Knoxville");
    expect(result1.serviceCategory).toBe("Gazebos");
    expect(POSTS_CATEGORIES).toContain(result1.serviceCategory);

    const result2 = generatePostGeoEnhancements("Cedar Gazebo", "Built in Maryville");
    expect(result2.serviceCategory).toBe("Gazebos");
    expect(POSTS_CATEGORIES).toContain(result2.serviceCategory);
  });

  it("detects Carpentry from corbel, trim, and carpentry keywords", () => {
    const caption = "Architectural interior trim, custom corbels, and detailed finish carpentry in Oak Ridge, TN.";
    const result = generatePostGeoEnhancements("", caption);
    expect(result.serviceCategory).toBe("Carpentry");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBe("Oak Ridge, TN");
  });

  it("detects Restoration from stain and repair keywords", () => {
    const result = generatePostGeoEnhancements("", "Deck pressure wash and weather-resistant stain in Maryville");
    expect(result.serviceCategory).toBe("Restoration");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBe("Maryville, TN");
  });

  it("detects Patios from patio and porch keywords", () => {
    const result = generatePostGeoEnhancements("", "Screened patio with cedar ceiling in Powell");
    expect(result.serviceCategory).toBe("Patios");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBe("Powell, TN");
  });

  it("detects Remodeling from remodel and renovation keywords", () => {
    const result = generatePostGeoEnhancements("", "Full home exterior remodel and addition");
    expect(result.serviceCategory).toBe("Remodeling");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
  });

  it("matches multi-word service areas and ignores locations outside the published list", () => {
    const resultLenoir = generatePostGeoEnhancements("", "Custom timber pergola installation in Lenoir City");
    expect(resultLenoir.serviceCategory).toBe("Gazebos");
    expect(resultLenoir.locationTag).toBe("Lenoir City, TN");

    // Loudon is not in SITE.serviceAreas, so generated alt text must not
    // advertise it. It must not substitute a different city either — naming
    // Knoxville here would present a guess as a detected location.
    const resultOutsideList = generatePostGeoEnhancements("", "Covered cedar deck built on lakefront property in Loudon TN");
    expect(resultOutsideList.locationTag).toBeNull();
    expect(resultOutsideList.altText).not.toContain("Loudon");
    expect(resultOutsideList.suggestedTags).not.toContain("Knoxville, TN");
  });

  it("returns null rather than a default city when the text names no location", () => {
    const result = generatePostGeoEnhancements("", "Outdoor project completed");
    expect(result.serviceCategory).toBe("Decks");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBeNull();
    expect(result.altText).not.toContain("Knoxville");
    expect(result.suggestedTags).toEqual([
      "Decks",
      "EVR Construction LLC",
      "East Tennessee Carpentry",
    ]);
  });

  it("prefers the caller's area hint over the text", () => {
    const result = generatePostGeoEnhancements("", "Deck rebuild in Maryville", "Farragut, TN");
    expect(result.locationTag).toBe("Farragut, TN");
    expect(result.altText).toContain("Farragut, TN");
  });
});
