import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { ProjectPost } from "@/lib/posts-store";
import { verifyAdminSession } from "@/lib/auth-guard";

const POSTS_COLLECTION = "posts";

/**
 * Converts a Firestore `src` value into a URL the browser can load.
 *
 * Firestore stores either:
 *   - A raw storage path: "posts/deck-4.jpg"
 *   - A Firebase Storage URL from a previous getDownloadURL call:
 *     "https://firebasestorage.googleapis.com/v0/b/.../o/posts%2Fdeck-4.jpg?alt=media&token=..."
 *
 * Because App Check is enforced on the bucket, direct Firebase Storage
 * URLs return 401 in the browser. We route everything through our own
 * image proxy at /api/images/[...path] which uses the Admin SDK.
 */
function resolveStorageSrc(src: string): string {
  if (!src) return "/images/hero.jpg";

  // Already a proxy URL
  if (src.startsWith("/api/images/")) return src;

  // Firebase Storage URL → extract the storage path
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
      // Fall through to path-based resolution
    }
  }

  // Raw storage path (e.g. "posts/deck-4.jpg")
  if (!src.startsWith("http://") && !src.startsWith("https://") && !src.startsWith("data:")) {
    const clean = src.startsWith("/") ? src.slice(1) : src;
    if (clean.startsWith("posts/")) {
      return `/api/images/${clean}`;
    }
    // Legacy path without posts/ prefix
    return `/api/images/posts/${clean}`;
  }

  // Any other URL (unlikely) — pass through
  return src;
}

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb
      .collection(POSTS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const posts: ProjectPost[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        category: data.category || "Decks",
        src: resolveStorageSrc(data.src || ""),
        alt: data.alt || data.caption || "",
        caption: data.caption || "",
        createdAt: data.createdAt || "",
        published: data.published ?? true,
      };
    });

    return NextResponse.json({
      posts,
      total: posts.length,
      source: "firestore",
    });
  } catch (err) {
    console.error("Firestore fetch error:", err);
    return NextResponse.json(
      {
        posts: [],
        total: 0,
        source: "firestore-error",
        error: err instanceof Error ? err.message : "Database fetch failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { category, src, alt, caption } = body;

    if (!src || !caption) {
      return NextResponse.json(
        { error: "Image and caption are required." },
        { status: 400 }
      );
    }

    let storagePath = "";

    // If image is base64, upload to Firebase Cloud Storage
    if (src.startsWith("data:image")) {
      try {
        const matches = src.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");

          const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
          const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

          if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
            return NextResponse.json({ error: "Unsupported image format" }, { status: 400 });
          }
          if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
            return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });
          }

          const extension = mimeType.split("/")[1] || "jpg";
          storagePath = `posts/project-${Date.now()}.${extension}`;

          const bucket = adminStorage.bucket();
          const file = bucket.file(storagePath);

          await file.save(buffer, {
            metadata: {
              contentType: mimeType,
              cacheControl: "public, max-age=31536000",
            },
          });
        }
      } catch (storageErr) {
        console.error("Cloud Storage upload failed:", storageErr);
        return NextResponse.json(
          { error: `Cloud Storage upload failed: ${storageErr instanceof Error ? storageErr.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    // Store the raw storage path in Firestore (the GET handler resolves it to a proxy URL)
    const newPostData: Omit<ProjectPost, "id"> = {
      category: category || "Decks",
      src: storagePath || src,
      alt: alt || caption,
      caption: caption.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      published: true,
    };

    const docRef = await adminDb.collection(POSTS_COLLECTION).add(newPostData);

    const savedPost: ProjectPost = {
      id: docRef.id,
      ...newPostData,
      // Return the proxy URL to the client so it renders immediately
      src: resolveStorageSrc(newPostData.src),
    };

    return NextResponse.json({ status: "ok", post: savedPost });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create post.";
    console.error("POST /api/admin/posts error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });
    }

    try {
      const docRef = adminDb.collection(POSTS_COLLECTION).doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (data?.src && typeof data.src === "string") {
          const bucket = adminStorage.bucket();
          let fileName = "";

          // Extract storage path from various src formats
          if (data.src.includes("firebasestorage.googleapis.com")) {
            try {
              const parsedUrl = new URL(data.src);
              const match = parsedUrl.pathname.match(/\/o\/([^?]+)/);
              if (match?.[1]) {
                fileName = decodeURIComponent(match[1]);
              }
            } catch {
              // Not a valid URL
            }
          } else if (!data.src.startsWith("http") && !data.src.startsWith("data:")) {
            // Raw storage path
            fileName = data.src.startsWith("/") ? data.src.slice(1) : data.src;
          }

          // Security: strict prefix enforcement and path traversal prevention
          if (fileName && fileName.startsWith("posts/") && !fileName.includes("..")) {
            await bucket.file(fileName).delete().catch(() => {});
          }
        }
        await docRef.delete();
      }
    } catch (firestoreErr) {
      console.error("Firestore delete failed for ID:", id, firestoreErr);
      return NextResponse.json(
        { error: "Failed to delete post from database." },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete post.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
