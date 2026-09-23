import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyBacklinkUrl } from "@/lib/integrations/backlink-verifier";
import { verifyAdminSession } from "@/lib/auth-guard";

export interface BacklinkItem {
  id: string;
  sourceUrl: string;
  title: string;
  status: BacklinkStatus;
  type: "DoFollow" | "NoFollow";
  lastVerified: string;
}

/**
 * `Pending` means the listing has never been checked.
 * `Blocked` means the directory refused the check, so the listing state is
 * unknown — it is not evidence that the citation is missing.
 */
export type BacklinkStatus = "Active" | "Missing" | "Unreachable" | "Blocked" | "Pending";

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
    status: "Pending",
    type: "NoFollow",
    lastVerified: "",
  },
  {
    sourceUrl: "https://m.yelp.com/biz/evr-construction-knoxville",
    title: "Yelp Knoxville — EVR Construction",
    status: "Pending",
    type: "NoFollow",
    lastVerified: "",
  },
  {
    sourceUrl: "https://www.bizapedia.com/tn/evr-construction-llc.html",
    title: "Bizapedia Tennessee — EVR Construction LLC Company Profile",
    status: "Pending",
    type: "DoFollow",
    lastVerified: "",
  },
];

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
        status: (d.status as BacklinkStatus) || "Pending",
        type: d.type || "DoFollow",
        lastVerified: d.lastVerified || new Date().toLocaleDateString("en-US"),
      };
    });
  } catch (err) {
    console.warn("Firestore fetch error on backlinks:", err);
  }

  const total = backlinksList.length;
  const active = backlinksList.filter((b) => b.status === "Active").length;
  const needsAttention = backlinksList.filter(
    (b) => b.status === "Missing" || b.status === "Unreachable"
  ).length;
  const noFollow = backlinksList.filter((b) => b.type === "NoFollow").length;

  let outreachList: OutreachDraft[] = [];
  try {
    const outreachSnap = await adminDb.collection("outreach_drafts").get();
    outreachList = outreachSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        targetDomain: d.targetDomain || "",
        opportunity: d.opportunity || "",
        suggestedAnchor: d.suggestedAnchor || "",
        status: d.status || "Draft",
      };
    });
  } catch (err) {
    console.warn("Firestore fetch error on outreach_drafts:", err);
  }

  return NextResponse.json({
    metrics: {
      total,
      active,
      needsAttention,
      noFollow,
    },
    backlinks: backlinksList,
    outreach: outreachList,
  });
}

export async function POST(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
