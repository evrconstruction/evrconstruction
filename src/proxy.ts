import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Junk paths that Google discovered (spam referrers / URL artifacts).
 * Returning 410 Gone tells Google these never existed — drop them fast.
 *
 * Compared after decoding, so both the literal and percent-encoded spellings of
 * each entry match: "/$" and "/%24", "/&" and "/%26", "/%" and "/%25".
 */
const GONE_PATHS = new Set(["/$", "/&", "/%"]);

/**
 * `request.nextUrl.pathname` keeps its percent-encoding, so a request for
 * `/%24` arrives as "/%24" and can never equal the decoded "/$". Decoding first
 * means the encoded and literal forms are both caught.
 *
 * `decodeURIComponent` is required rather than `decodeURI`: the latter leaves
 * reserved characters such as "$" and "&" encoded, which is exactly the case
 * being handled. It throws on malformed input like "/%", so fall back to the
 * raw value rather than failing the request — that fallback is what lets the
 * bare "/%" form match too.
 */
function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

/** Canonical public host. Any other hostname serving this app is a duplicate. */
const CANONICAL_HOST = "evrconstructions.com";
const WWW_HOST = `www.${CANONICAL_HOST}`;

/**
 * Firebase App Hosting terminates TLS for the custom domains before forwarding
 * to the Next.js server, so the original hostname arrives as `x-forwarded-host`
 * while `host` may hold the backend's own address. Checking both keeps this
 * correct behind that proxy and in local development. The forwarded value can
 * be a comma-separated chain, where the first entry is the client-facing host.
 */
function clientHost(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  return (forwardedHost ?? host ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

export function proxy(request: NextRequest) {
  // www.<domain> serves a full duplicate of the site, so every page could be
  // indexed twice. Consolidate on the canonical host, preserving path and
  // query string, with a permanent (308) redirect.
  if (clientHost(request) === WWW_HOST) {
    const canonical = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      `https://${CANONICAL_HOST}`
    );
    return NextResponse.redirect(canonical, 308);
  }

  if (GONE_PATHS.has(decodePath(request.nextUrl.pathname))) {
    return new NextResponse(null, {
      status: 410,
      statusText: "Gone",
      headers: { "X-Robots-Tag": "noindex" },
    });
  }

  return NextResponse.next();
}

export const config = {
  // Canonicalising the host requires running on every route, so this matcher is
  // broader than the junk-path-only pattern it replaced. Excluded: API routes
  // (which should never redirect) and Next.js internals plus the asset
  // directories, which only ever serve files. The check itself is a cheap
  // header comparison.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|brand/|images/|posts/).*)"],
};
