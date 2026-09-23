import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Junk paths that Google discovered (spam referrers / URL artifacts).
 * Returning 410 Gone tells Google these never existed — drop them fast.
 */
const GONE_PATHS = new Set(["/$", "/&"]);

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

export function middleware(request: NextRequest) {
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

  if (GONE_PATHS.has(request.nextUrl.pathname)) {
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
  // broader than the junk-path-only pattern it replaces. Next.js internals and
  // static assets are excluded; the check itself is a cheap header comparison.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|images/).*)"],
};
