import { describe, it, expect } from "vitest";
import { generatePostGeoEnhancements } from "@/lib/geo-enhancements";

const POSTS_CATEGORIES = ["Decks", "Gazebos", "Restoration", "Remodeling", "Carpentry", "Patios"] as const;

describe("generatePostGeoEnhancements", () => {
  it("detects Gazebos from pergola and gazebo keywords", () => {
    const result1 = generatePostGeoEnhancements("", "Custom backyard pergola in Knoxville");
    expect(result1.serviceCategory).toBe("Gazebos");
    expect(POSTS_CATEGORIES).toContain(result1.serviceCategory);

    const result2 = generatePostGeoEnhancements("Cedar Gazebo", "Built in Farragut");
    expect(result2.serviceCategory).toBe("Gazebos");
    expect(POSTS_CATEGORIES).toContain(result2.serviceCategory);
  });

  it("detects Carpentry from corbel, trim, and carpentry keywords", () => {
    const caption = "Architectural interior trim, custom corbels, and detailed finish carpentry in Hardin Valley, TN.";
    const result = generatePostGeoEnhancements("", caption);
    expect(result.serviceCategory).toBe("Carpentry");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBe("Hardin Valley, TN");
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

  it("detects Loudon TN and Lenoir City TN from caption keywords", () => {
    const resultLoudon = generatePostGeoEnhancements("", "Covered cedar deck built on lakefront property in Loudon TN");
    expect(resultLoudon.serviceCategory).toBe("Decks");
    expect(resultLoudon.locationTag).toBe("Loudon, TN");

    const resultLenoir = generatePostGeoEnhancements("", "Custom timber pergola installation in Lenoir City");
    expect(resultLenoir.serviceCategory).toBe("Gazebos");
    expect(resultLenoir.locationTag).toBe("Lenoir City, TN");
  });

  it("defaults to Decks and Knoxville, TN when no specific keyword is found", () => {
    const result = generatePostGeoEnhancements("", "Outdoor project completed");
    expect(result.serviceCategory).toBe("Decks");
    expect(POSTS_CATEGORIES).toContain(result.serviceCategory);
    expect(result.locationTag).toBe("Knoxville, TN");
  });
});
