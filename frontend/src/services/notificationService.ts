import api from "./api";
import type { NotificationListResult } from "../types/notification";

function getErrorMessage(error: any, fallback: string) {
  return error?.response?.data?.message ?? fallback;
}

export async function fetchNotifications(unreadOnly = false) {
  try {
    const response = await api.get<{ data: NotificationListResult }>("/notifications", {
      params: {
        limit: 30,
        unreadOnly,
      },
    });

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load notifications."),
    };
  }
}

export async function markNotificationRead(id: string) {
  try {
    await api.post(`/notifications/${id}/read`);
    return { error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      error: getErrorMessage(error, "Unable to mark notification as read."),
    };
  }
}

export async function markAllNotificationsRead() {
  try {
    await api.post("/notifications/read-all");
    return { error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      error: getErrorMessage(error, "Unable to mark notifications as read."),
    };
  }
}
