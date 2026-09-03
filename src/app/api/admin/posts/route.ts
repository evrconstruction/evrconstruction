import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { ProjectPost } from "@/lib/posts-store";
import { verifyAdminSession } from "@/lib/auth-guard";

const POSTS_COLLECTION = "posts";

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
        src: data.src || "",
        alt: data.alt || "",
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

    let publicImageUrl = src;

    // If image is base64, upload to Firebase Cloud Storage
    if (src.startsWith("data:image")) {
      try {
        const matches = src.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
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
          const fileName = `posts/project-${Date.now()}.${extension}`;

          const bucket = adminStorage.bucket();
          const file = bucket.file(fileName);

          await file.save(buffer, {
            metadata: {
              contentType: mimeType,
              cacheControl: "public, max-age=31536000",
            },
            public: true,
          });

          await file.makePublic().catch(() => {});

          // Standard Firebase Storage download URL
          publicImageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
        }
      } catch (storageErr) {
        console.error("Cloud Storage upload failed:", storageErr);
        return NextResponse.json(
          { error: `Cloud Storage upload failed: ${storageErr instanceof Error ? storageErr.message : "Unknown error"}` },
          { status: 500 }
        );
      }
    }

    const newPostData: Omit<ProjectPost, "id"> = {
      category: category || "Decks",
      src: publicImageUrl,
      alt: alt || caption,
      caption: caption.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      published: true,
    };

    const docRef = await adminDb.collection(POSTS_COLLECTION).add(newPostData);

    const savedPost: ProjectPost = {
      id: docRef.id,
      ...newPostData,
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

    // Check if post exists and has a storage image to clean up
    try {
      const docRef = adminDb.collection(POSTS_COLLECTION).doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (data?.src && typeof data.src === "string") {
          const bucket = adminStorage.bucket();
          try {
            const parsedUrl = new URL(data.src);
            let fileName = "";

            if (parsedUrl.hostname === "firebasestorage.googleapis.com") {
              const match = parsedUrl.pathname.match(/\/o\/([^?]+)/);
              if (match && match[1]) {
                fileName = decodeURIComponent(match[1]);
              }
            } else if (parsedUrl.hostname === "storage.googleapis.com") {
              const pathParts = parsedUrl.pathname.split(`/${bucket.name}/`);
              if (pathParts.length > 1 && pathParts[1]) {
                fileName = decodeURIComponent(pathParts[1]);
              }
            }

            // CodeQL sanitization: strict prefix enforcement and path traversal prevention
            if (fileName && fileName.startsWith("posts/") && !fileName.includes("..")) {
              await bucket.file(fileName).delete().catch(() => {});
            }
          } catch {
            // Not a valid URL, skip storage file deletion
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

