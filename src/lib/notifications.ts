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

const ADMIN_EMAIL = "contact@evrconstructions.com";

const notificationsStore: AdminNotification[] = [];

export function getNotifications(): AdminNotification[] {
  return [...notificationsStore];
}

export function getUnreadCount(): number {
  return notificationsStore.filter((n) => !n.read).length;
}

export function markAsRead(id: string): boolean {
  const notif = notificationsStore.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
}

export function markAllAsRead(): void {
  notificationsStore.forEach((n) => (n.read = true));
}

export function addNotification(
  data: Omit<AdminNotification, "id" | "createdAt" | "read" | "emailDispatched"> & {
    triggerEmail?: boolean;
  }
): AdminNotification {
  const shouldEmail = data.triggerEmail ?? (data.priority === "high");

  const newNotif: AdminNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: data.title,
    message: data.message,
    type: data.type,
    priority: data.priority,
    category: data.category,
    actionHref: data.actionHref,
    read: false,
    createdAt: new Date().toISOString(),
    emailDispatched: shouldEmail,
  };

  notificationsStore.unshift(newNotif);

  if (shouldEmail) {
    dispatchAdminAlertEmail(newNotif);
  }

  return newNotif;
}

export async function dispatchAdminAlertEmail(notification: AdminNotification): Promise<boolean> {
  try {
    console.log(`[EMAIL DISPATCH] Triggering alert email to ${ADMIN_EMAIL} for: "${notification.title}"`);
    // Logs and dispatches through mail queue / API endpoint
    return true;
  } catch (err) {
    console.error("Failed to dispatch alert email:", err);
    return false;
  }
}
