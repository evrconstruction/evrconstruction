import { describe, expect, it } from "vitest";
import { parseDataImageUrl } from "@/lib/posts";

describe("parseDataImageUrl", () => {
  it("splits a well-formed base64 image URL", () => {
    expect(parseDataImageUrl("data:image/jpeg;base64,/9j/AA==")).toEqual({
      mimeType: "image/jpeg",
      base64Data: "/9j/AA==",
    });
  });

  it("rejects a data URL it cannot parse instead of passing it through", () => {
    // The route used to store these verbatim in the post document.
    expect(parseDataImageUrl("data:image/jpeg;base64")).toBeNull();
    expect(parseDataImageUrl("data:image/jpeg;base64,")).toBeNull();
    expect(parseDataImageUrl("data:image/png;charset=utf-8,abc")).toBeNull();
    expect(parseDataImageUrl("data:image")).toBeNull();
  });

  it("rejects a value that is not a data URL at all", () => {
    expect(parseDataImageUrl("https://example.com/photo.jpg")).toBeNull();
    expect(parseDataImageUrl("")).toBeNull();
  });
});
