import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";

export async function POST() {
  try {
    const snapshot = await adminDb.collection("backlinks").get();
    const updatedBacklinks = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const sourceUrl = data.sourceUrl;

      if (sourceUrl) {
        const verification = await verifyBacklinkUrl(sourceUrl);
        const updatePayload = {
          status: verification.status,
          type: verification.type,
          lastVerified: verification.lastVerified,
        };

        await doc.ref.update(updatePayload);
        updatedBacklinks.push({
          id: doc.id,
          sourceUrl: data.sourceUrl,
          title: data.title,
          ...updatePayload,
        });
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
