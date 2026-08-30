import api from "./api";
import type {
  NotificationListResult,
  PushPublicKeyResult,
} from "../types/notification";

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

export async function fetchPushPublicKey() {
  try {
    const response = await api.get<{ data: PushPublicKeyResult }>(
      "/notifications/push/public-key"
    );

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to load push setup."),
    };
  }
}

export async function subscribeToPush(subscription: PushSubscription) {
  try {
    const response = await api.post<{ data: { subscribed: boolean } }>(
      "/notifications/push/subscribe",
      subscription.toJSON()
    );

    return { result: response.data.data, error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      result: null,
      error: getErrorMessage(error, "Unable to save push subscription."),
    };
  }
}

export async function unsubscribeFromPush(endpoint: string) {
  try {
    await api.post("/notifications/push/unsubscribe", { endpoint });
    return { error: undefined };
  } catch (error: any) {
    console.error(error);
    return {
      error: getErrorMessage(error, "Unable to remove push subscription."),
    };
  }
}
export function openNotificationStream(token: string) {
  const baseUrl = String(api.defaults.baseURL ?? "").replace(/\/$/, "");
  const streamUrl = new URL(`${baseUrl}/notifications/stream`);
  streamUrl.searchParams.set("token", token);

  return new EventSource(streamUrl.toString());
}
