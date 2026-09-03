import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import fs from "fs";
import path from "path";

/**
 * Image proxy for Firebase Cloud Storage.
 *
 * App Check is enforced on this project's Storage bucket, so direct
 * firebasestorage.googleapis.com URLs return 401 when loaded in a
 * browser <img> tag (no App Check token is sent with plain GET requests).
 *
 * This route acts as a server-side proxy: the Admin SDK authenticates
 * against Cloud Storage (bypassing App Check), downloads the file, and
 * streams it to the client with aggressive cache headers so the CDN
 * and browser cache it on the first load.
 *
 * Usage: /api/images/posts/deck-4.jpg
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Security: only allow posts/ prefix, block path traversal
  if (!filePath.startsWith("posts/") || filePath.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const bucket = adminStorage.bucket();
    let file = bucket.file(filePath);
    let [exists] = await file.exists();

    if (!exists) {
      if (filePath.endsWith(".jpg")) {
        const alt = bucket.file(filePath.replace(/\.jpg$/, ".jpeg"));
        const [altExists] = await alt.exists();
        if (altExists) {
          file = alt;
          exists = true;
        }
      } else if (filePath.endsWith(".jpeg")) {
        const alt = bucket.file(filePath.replace(/\.jpeg$/, ".jpg"));
        const [altExists] = await alt.exists();
        if (altExists) {
          file = alt;
          exists = true;
        }
      }
    }

    if (!exists) {
      const baseName = filePath.replace(/^posts\//, "");
      const localPaths = [
        path.join(process.cwd(), "public", "images", baseName),
        path.join(process.cwd(), "public", "images", baseName.replace(/\.jpg$/, ".jpeg")),
        path.join(process.cwd(), "public", "images", baseName.replace(/\.jpeg$/, ".jpg")),
      ];
      for (const lp of localPaths) {
        if (fs.existsSync(/*turbopackIgnore: true*/ lp)) {
          const buffer = fs.readFileSync(/*turbopackIgnore: true*/ lp);
          const ext = path.extname(lp).toLowerCase();
          const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          file.save(buffer, { metadata: { contentType, cacheControl: "public, max-age=31536000" } }).catch(() => {});
          return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=31536000, immutable",
              "Content-Length": buffer.length.toString(),
            },
          });
        }
      }
      return new NextResponse("Not found", { status: 404 });
    }

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || "image/jpeg";

    const [buffer] = await file.download();
    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error(`Image proxy error for ${filePath}:`, err);
    return new NextResponse("Not found", { status: 404 });
  }
}
