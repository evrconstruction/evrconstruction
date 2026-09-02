import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";

export interface BacklinkItem {
  id: string;
  sourceUrl: string;
  title: string;
  status: "Active" | "Lost" | "Pending";
  type: "DoFollow" | "NoFollow";
  lastVerified: string;
}

export interface OutreachDraft {
  id: string;
  targetDomain: string;
  opportunity: string;
  suggestedAnchor: string;
  status: "Draft" | "Sent" | "Accepted";
}

const INITIAL_VERIFIED_CITATIONS: Omit<BacklinkItem, "id">[] = [
  {
    sourceUrl: "https://www.bbb.org/us/tn/knoxville/profile/deck-builder/evr-construction-llc-0533-90046668",
    title: "Better Business Bureau — EVR Construction LLC (Knoxville, TN)",
    status: "Active",
    type: "NoFollow",
    lastVerified: new Date().toLocaleDateString("en-US"),
  },
  {
    sourceUrl: "https://m.yelp.com/biz/evr-construction-knoxville",
    title: "Yelp Knoxville — EVR Construction",
    status: "Active",
    type: "NoFollow",
    lastVerified: new Date().toLocaleDateString("en-US"),
  },
  {
    sourceUrl: "https://www.bizapedia.com/tn/evr-construction-llc.html",
    title: "Bizapedia Tennessee — EVR Construction LLC Company Profile",
    status: "Active",
    type: "DoFollow",
    lastVerified: new Date().toLocaleDateString("en-US"),
  },
];

export async function GET() {
  let backlinksList: BacklinkItem[] = [];

  try {
    let snapshot = await adminDb.collection("backlinks").get();

    // Auto-seed initial real citations if collection is empty
    if (snapshot.empty) {
      const batch = adminDb.batch();
      for (const cit of INITIAL_VERIFIED_CITATIONS) {
        const ref = adminDb.collection("backlinks").doc();
        batch.set(ref, cit);
      }
      await batch.commit();
      snapshot = await adminDb.collection("backlinks").get();
    }

    backlinksList = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        sourceUrl: d.sourceUrl || "",
        title: d.title || "",
        status: d.status || "Active",
        type: d.type || "DoFollow",
        lastVerified: d.lastVerified || new Date().toLocaleDateString("en-US"),
      };
    });
  } catch (err) {
    console.warn("Firestore fetch error on backlinks:", err);
  }

  const total = backlinksList.length;
  const active = backlinksList.filter((b) => b.status === "Active").length;
  const lost = backlinksList.filter((b) => b.status === "Lost").length;
  const noFollow = backlinksList.filter((b) => b.type === "NoFollow").length;

  return NextResponse.json({
    metrics: {
      total,
      active,
      lost,
      noFollow,
    },
    backlinks: backlinksList,
    outreach: [
      {
        id: "out-1",
        targetDomain: "knoxvillechamber.com",
        opportunity: "Knoxville Chamber of Commerce General Contractor Directory listing",
        suggestedAnchor: "EVR Construction Knoxville",
        status: "Draft",
      },
      {
        id: "out-2",
        targetDomain: "farragutchamber.com",
        opportunity: "Farragut West Knox Chamber Directory — Local Deck & Remodeling Contractor",
        suggestedAnchor: "deck builder Farragut TN",
        status: "Draft",
      },
      {
        id: "out-3",
        targetDomain: "trex.com/find-a-builder",
        opportunity: "Trex Pro Authorized Deck Contractor East Tennessee partner listing",
        suggestedAnchor: "EVR Construction LLC",
        status: "Draft",
      },
    ],
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceUrl, title, type } = body;

    if (!sourceUrl) {
      return NextResponse.json({ error: "Source URL is required" }, { status: 400 });
    }

    const trimmedUrl = sourceUrl.trim();
    const verification = await verifyBacklinkUrl(trimmedUrl);

    const newBacklink = {
      sourceUrl: trimmedUrl,
      title: (title || trimmedUrl).trim(),
      status: verification.status,
      type: type || verification.type,
      lastVerified: verification.lastVerified,
    };

    const docRef = await adminDb.collection("backlinks").add(newBacklink);

    return NextResponse.json({
      status: "ok",
      backlink: { id: docRef.id, ...newBacklink },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to add backlink";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing backlink ID" }, { status: 400 });
    }

    await adminDb.collection("backlinks").doc(id).delete();

    return NextResponse.json({ status: "ok", deleted: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete backlink";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
