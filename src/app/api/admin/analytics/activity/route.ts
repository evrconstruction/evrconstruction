import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/auth-guard";

const ACTIVITY_COLLECTION = "activity_logs";

export interface ActivityEvent {
  id: string;
  event: "form_submit" | "click" | "page_view" | "user_engagement";
  label: string;
  detail: string;
  location: string;
  device: string;
  page: string;
  timestamp: number;
  timeAgo?: string;
}

function formatTimeAgo(timestamp: number): string {
  const diffSecs = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export async function GET(request: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const snapshot = await adminDb
      .collection(ACTIVITY_COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const events: ActivityEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const ts = data.timestamp || Date.now();
      return {
        id: doc.id,
        event: data.event || "page_view",
        label: data.label || "Page Visit",
        detail: data.detail || "",
        location: data.location || "East Tennessee",
        device: data.device || "Desktop",
        page: data.page || "/",
        timestamp: ts,
        timeAgo: formatTimeAgo(ts),
      };
    });

    const filtered = filter === "all" ? events : events.filter((e) => e.event === filter);

    // Event type counts
    const counts = {
      page_view: events.filter((e) => e.event === "page_view").length,
      user_engagement: events.filter((e) => e.event === "user_engagement").length,
      click: events.filter((e) => e.event === "click").length,
      form_submit: events.filter((e) => e.event === "form_submit").length,
    };

    return NextResponse.json({
      events: filtered,
      total: filtered.length,
      counts,
      source: "firestore",
    });
  } catch (err) {
    console.error("Failed to load activity logs:", err);
    return NextResponse.json({
      events: [],
      total: 0,
      counts: { page_view: 0, user_engagement: 0, click: 0, form_submit: 0 },
      source: "firestore",
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, label, detail, location, device, page } = body;

    if (!event || !label) {
      return NextResponse.json({ error: "Event and label required" }, { status: 400 });
    }

    // Restrict public calls to form_submit only
    if (event !== "form_submit") {
      try {
        await verifyAdminSession();
      } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Payload validation
    if (typeof label !== "string" || label.length > 200) {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }
    if (detail && (typeof detail !== "string" || detail.length > 1000)) {
      return NextResponse.json({ error: "Invalid detail" }, { status: 400 });
    }

    const newEvent: Omit<ActivityEvent, "id" | "timeAgo"> = {
      event,
      label,
      detail: detail || "",
      location: typeof location === "string" ? location.substring(0, 100) : "East Tennessee",
      device: typeof device === "string" ? device.substring(0, 50) : "Web Client",
      page: typeof page === "string" ? page.substring(0, 200) : "/",
      timestamp: Date.now(),
    };

    const docRef = await adminDb.collection(ACTIVITY_COLLECTION).add(newEvent);

    return NextResponse.json({ status: "ok", id: docRef.id, event: newEvent });
  } catch (err) {
    console.error("Failed to log activity:", err);
    return NextResponse.json({ error: "Failed to log activity" }, { status: 500 });
  }
}
