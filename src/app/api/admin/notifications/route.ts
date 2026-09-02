import { NextResponse } from "next/server";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  addNotification,
} from "@/lib/notifications";
import { verifyAdminSession } from "@/lib/auth-guard";

export async function GET() {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const notifications = getNotifications();
    const unreadCount = getUnreadCount();
    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, id, notification } = body;

    if (action === "mark-all-read") {
      markAllAsRead();
      return NextResponse.json({ success: true, unreadCount: 0 });
    }

    if (action === "mark-read" && id) {
      const success = markAsRead(id);
      return NextResponse.json({ success, unreadCount: getUnreadCount() });
    }

    if (action === "create" && notification) {
      const created = addNotification(notification);
      return NextResponse.json({ success: true, notification: created });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error handling notification request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
