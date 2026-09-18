import { adminDb } from "@/lib/firebase-admin";

export type NotificationType = "alert" | "warning" | "success" | "info";
export type NotificationCategory = "seo_agent" | "keywords" | "backlinks" | "lead" | "system";

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: "high" | "normal";
  category: NotificationCategory;
  actionHref: string;
  read: boolean;
  createdAt: string;
  emailDispatched: boolean;
}

const NOTIFICATIONS_COLLECTION = "admin_notifications";
const ADMIN_EMAIL = "contact@evrconstructions.com";

export async function getNotifications(): Promise<AdminNotification[]> {
  try {
    const snap = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<AdminNotification, "id">),
    }));
  } catch (err) {
    console.error("Failed to fetch notifications from Firestore:", err);
    return [];
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const snap = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("read", "==", false)
      .get();
    return snap.size;
  } catch (err) {
    console.error("Failed to get unread count from Firestore:", err);
    return 0;
  }
}

export async function markAsRead(id: string): Promise<boolean> {
  try {
    await adminDb.collection(NOTIFICATIONS_COLLECTION).doc(id).update({ read: true });
    return true;
  } catch (err) {
    console.error(`Failed to mark notification ${id} as read:`, err);
    return false;
  }
}

export async function markAllAsRead(): Promise<void> {
  try {
    const snap = await adminDb
      .collection(NOTIFICATIONS_COLLECTION)
      .where("read", "==", false)
      .get();

    const batch = adminDb.batch();
    snap.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Failed to mark all notifications as read:", err);
  }
}

export async function addNotification(
  data: Omit<AdminNotification, "id" | "createdAt" | "read" | "emailDispatched"> & {
    triggerEmail?: boolean;
  }
): Promise<AdminNotification> {
  const shouldEmail = data.triggerEmail ?? (data.priority === "high");
  const isoDate = new Date().toISOString();

  let emailSent = false;
  if (shouldEmail) {
    emailSent = await dispatchAdminAlertEmail({
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      category: data.category,
      actionHref: data.actionHref,
      read: false,
      createdAt: isoDate,
      emailDispatched: false,
    });
  }

  const newNotifData: Omit<AdminNotification, "id"> = {
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority,
    category: data.category,
    actionHref: data.actionHref,
    read: false,
    createdAt: isoDate,
    emailDispatched: emailSent,
  };

  try {
    const ref = await adminDb.collection(NOTIFICATIONS_COLLECTION).add(newNotifData);
    return {
      id: ref.id,
      ...newNotifData,
    };
  } catch (err) {
    console.error("Failed to save notification to Firestore:", err);
    return {
      id: `local-${Date.now()}`,
      ...newNotifData,
    };
  }
}

export async function dispatchAdminAlertEmail(notification: Omit<AdminNotification, "id">): Promise<boolean> {
  try {
    await adminDb.collection("mail").add({
      to: ADMIN_EMAIL,
      message: {
        subject: `[EVR Alert] ${notification.title}`,
        text: `${notification.message}\n\nView details: https://evrconstructions.com${notification.actionHref}\nTimestamp: ${notification.createdAt}`,
      },
    });
    return true;
  } catch (err) {
    console.warn("Could not queue alert in mail collection:", err);
    return false;
  }
}
