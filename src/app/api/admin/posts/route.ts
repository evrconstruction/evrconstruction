import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { INITIAL_PROJECT_POSTS, ProjectPost } from "@/lib/posts-store";

const POSTS_COLLECTION = "posts";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection(POSTS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    if (!snapshot.empty) {
      const posts: ProjectPost[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          category: data.category || "Decks",
          src: data.src || "/images/deck-4.jpg",
          alt: data.alt || "",
          caption: data.caption || "",
          createdAt: data.createdAt || new Date().toISOString().split("T")[0],
          published: data.published ?? true,
        };
      });

      return NextResponse.json({
        posts,
        total: posts.length,
        source: "firestore",
      });
    }
  } catch (err) {
    console.warn("Firestore fetch error, falling back to initial posts cache:", err);
  }

  // Fallback to local default posts
  return NextResponse.json({
    posts: INITIAL_PROJECT_POSTS,
    total: INITIAL_PROJECT_POSTS.length,
    source: "local-fallback",
  });
}

export async function POST(request: Request) {
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
          const extension = mimeType.split("/")[1] || "jpg";
          const fileName = `posts/project-${Date.now()}.${extension}`;

          const bucket = adminStorage.bucket();
          const file = bucket.file(fileName);

          await file.save(buffer, {
            metadata: { contentType: mimeType },
            public: true,
          });

          // Public URL on Firebase Storage / Google Storage
          publicImageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }
      } catch (storageErr) {
        console.warn("Cloud Storage upload failed, keeping original image source:", storageErr);
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

    let savedId = `post-${Date.now()}`;

    try {
      const docRef = await adminDb.collection(POSTS_COLLECTION).add(newPostData);
      savedId = docRef.id;
    } catch (firestoreErr) {
      console.warn("Firestore save failed, using local ID:", firestoreErr);
    }

    const savedPost: ProjectPost = {
      id: savedId,
      ...newPostData,
    };

    return NextResponse.json({ status: "ok", post: savedPost });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create post.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing post id" }, { status: 400 });
    }

    try {
      await adminDb.collection(POSTS_COLLECTION).doc(id).delete();
    } catch (firestoreErr) {
      console.warn("Firestore delete failed for ID:", id, firestoreErr);
    }

    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete post.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
