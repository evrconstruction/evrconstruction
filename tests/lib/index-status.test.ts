import { describe, it, expect } from "vitest";
import { canonicalsAgree } from "@/lib/integrations/google-search-console-index";

describe("canonicalsAgree", () => {
  it("treats an identical canonical as a match", () => {
    expect(
      canonicalsAgree(
        "https://evrconstructions.com/contact",
        "https://evrconstructions.com/contact"
      )
    ).toBe(true);
  });

  it("ignores a trailing slash on the homepage", () => {
    // Regression: Google reports the homepage canonical with a trailing slash
    // while the sitemap lists it without one. Comparing raw strings flagged the
    // homepage as a mismatch when it is indexed exactly as intended.
    expect(
      canonicalsAgree(
        "https://evrconstructions.com",
        "https://evrconstructions.com/"
      )
    ).toBe(true);
    expect(
      canonicalsAgree(
        "https://evrconstructions.com/",
        "https://evrconstructions.com"
      )
    ).toBe(true);
  });

  it("still reports a genuine mismatch when Google picks a different page", () => {
    // The whole point of the signal: normalising must not mask a real one.
    expect(
      canonicalsAgree(
        "https://evrconstructions.com/projects",
        "https://evrconstructions.com/projects/decks"
      )
    ).toBe(false);
  });

  it("returns null rather than claiming a match when a canonical is missing", () => {
    expect(canonicalsAgree(null, "https://evrconstructions.com/")).toBeNull();
    expect(canonicalsAgree("https://evrconstructions.com/", null)).toBeNull();
    expect(canonicalsAgree(null, null)).toBeNull();
  });
});
