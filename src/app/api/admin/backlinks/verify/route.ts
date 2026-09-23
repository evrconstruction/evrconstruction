import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function POST() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await adminDb.collection("backlinks").get();
    const updatedBacklinks = [];
    const docs = snapshot.docs;
    const chunkSize = 5;

    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const results = await Promise.allSettled(
        chunk.map(async (doc) => {
          const data = doc.data();
          const sourceUrl = data.sourceUrl;
          if (!sourceUrl) return null;

          try {
            const verification = await verifyBacklinkUrl(sourceUrl);
            const updatePayload = {
              status: verification.status,
              type: verification.type,
              lastVerified: verification.lastVerified,
            };

            await doc.ref.update(updatePayload);
            return {
              id: doc.id,
              sourceUrl: data.sourceUrl,
              title: data.title,
              ...updatePayload,
            };
          } catch (itemErr) {
            console.warn(`Failed to verify backlink ${sourceUrl}:`, itemErr);
            const fallbackPayload = {
              status: "Unreachable" as const,
              type: "NoFollow" as const,
              lastVerified: new Date().toLocaleDateString("en-US"),
            };
            await doc.ref
              .update(fallbackPayload)
              .catch((err) => console.warn(`Failed to persist fallback status for ${doc.id}:`, err));
            return {
              id: doc.id,
              sourceUrl: data.sourceUrl,
              title: data.title,
              ...fallbackPayload,
            };
          }
        })
      );

      for (const res of results) {
        if (res.status === "fulfilled" && res.value) {
          updatedBacklinks.push(res.value);
        }
      }
    }

    return NextResponse.json({
      status: "ok",
      totalVerified: updatedBacklinks.length,
      backlinks: updatedBacklinks,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to verify backlinks";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
