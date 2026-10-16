import { describe, it, expect } from "vitest";
// Imported, never re-declared. An earlier version of this file defined its own
// copy of the function, so the tests asserted against the clone and could not
// fail when the real implementation broke.
import { resolveStorageSrc } from "@/lib/storage-src";

describe("Image Path Resolution Logic", () => {
  it("resolves static public images starting with /images/ without prepending /api/images/posts/", () => {
    expect(resolveStorageSrc("/images/projects/deck-1.webp")).toBe("/images/projects/deck-1.webp");
    expect(resolveStorageSrc("/images/hero.jpg")).toBe("/images/hero.jpg");
  });

  it("resolves static public images starting with images/ without prepending /api/images/posts/", () => {
    expect(resolveStorageSrc("images/projects/deck-1.webp")).toBe("/images/projects/deck-1.webp");
  });

  it("resolves storage paths with posts/ prefix to /api/images/posts/...", () => {
    expect(resolveStorageSrc("posts/cedar-deck-4.jpg")).toBe("/api/images/posts/cedar-deck-4.jpg");
    expect(resolveStorageSrc("/posts/cedar-deck-4.jpg")).toBe("/api/images/posts/cedar-deck-4.jpg");
  });

  it("resolves legacy storage paths without posts/ prefix by adding posts/", () => {
    expect(resolveStorageSrc("cedar-deck-4.jpg")).toBe("/api/images/posts/cedar-deck-4.jpg");
  });

  it("extracts storage path from Firebase Storage download URLs", () => {
    const firebaseUrl = "https://firebasestorage.googleapis.com/v0/b/evrconstruction-5f7bd.firebasestorage.app/o/posts%2Fsample-gazebo.webp?alt=media&token=12345";
    expect(resolveStorageSrc(firebaseUrl)).toBe("/api/images/posts/sample-gazebo.webp");
  });

  it("passes through external http/https/data URLs untouched", () => {
    expect(resolveStorageSrc("https://externalcdn.com/image.png")).toBe("https://externalcdn.com/image.png");
    expect(resolveStorageSrc("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBe("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==");
  });

  it("returns default fallback for empty strings", () => {
    expect(resolveStorageSrc("")).toBe("/images/hero.jpg");
  });
});
