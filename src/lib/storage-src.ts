/**
 * Resolves a stored post image reference into a URL the browser can load.
 *
 * Firestore stores a post's image in one of three shapes, and this is the single
 * place that knows how to turn any of them into a request path:
 *
 *   - a raw storage path: `posts/deck-4.jpg`
 *   - a legacy path with no prefix: `deck-4.jpg`
 *   - a Firebase Storage download URL from an earlier `getDownloadURL` call
 *
 * App Check is enforced on this project's Storage bucket, so a direct
 * `firebasestorage.googleapis.com` URL returns 401 when used in a browser
 * `<img>` tag — plain image requests carry no App Check token. Everything is
 * therefore routed through the image proxy at `/api/images/[...path]`, which
 * reads Storage with the Admin SDK instead.
 *
 * Pure and environment-agnostic: safe on both the server and the client.
 */
export function resolveStorageSrc(src: string | undefined): string {
  if (!src) return "/images/hero.jpg";

  // Already a proxy URL.
  if (src.startsWith("/api/images/")) return src;

  // A Firebase Storage download URL — pull the storage path out of it.
  if (src.includes("firebasestorage.googleapis.com")) {
    try {
      const url = new URL(src);
      const match = url.pathname.match(/\/o\/([^?]+)/);
      if (match?.[1]) {
        const storagePath = decodeURIComponent(match[1]);
        if (storagePath.startsWith("posts/")) {
          return `/api/images/${storagePath}`;
        }
      }
    } catch {
      // Malformed URL — fall through to path-based resolution below.
    }
  }

  // A bundled asset under /public, served directly rather than proxied.
  if (src.startsWith("/images/")) return src;
  if (src.startsWith("images/")) return `/${src}`;

  // Anything else reaching the network as-is (an external URL, or inline data).
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
    return src;
  }

  // A bare storage path. `posts/...` is the current shape; anything else is a
  // legacy value written before the prefix was standardised.
  const storagePath = src.startsWith("/") ? src.slice(1) : src;
  return storagePath.startsWith("posts/")
    ? `/api/images/${storagePath}`
    : `/api/images/posts/${storagePath}`;
}
