import { apiRequest } from "@/lib/api";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  type: string | number;
  isRead: boolean;
  createdAt: string;
};

export async function getNotifications() {
  return apiRequest<{ notifications: NotificationItem[] }>("/notifications", {
    method: "GET",
    credentials: "include",
  });
}

export async function markNotificationAsRead(notificationId: string) {
  return apiRequest<{ message: string }>(`/notifications/${notificationId}/read`, {
    method: "POST",
    credentials: "include",
  });
}
