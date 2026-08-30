import { AppNotification } from "@prisma/client";
import { EventEmitter } from "events";

const NOTIFICATION_CREATED_EVENT = "notification.created";
const notificationEmitter = new EventEmitter();
notificationEmitter.setMaxListeners(0);

export type NotificationStreamPayload = Pick<
  AppNotification,
  | "id"
  | "title"
  | "message"
  | "eventKey"
  | "priority"
  | "targetRole"
  | "targetUserId"
  | "linkUrl"
  | "metadata"
  | "createdAt"
  | "expiresAt"
>;

export function serializeNotification(notification: AppNotification): NotificationStreamPayload {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    eventKey: notification.eventKey,
    priority: notification.priority,
    targetRole: notification.targetRole,
    targetUserId: notification.targetUserId,
    linkUrl: notification.linkUrl,
    metadata: notification.metadata,
    createdAt: notification.createdAt,
    expiresAt: notification.expiresAt,
  };
}

export function canReceiveNotification(
  notification: AppNotification,
  userId: string,
  roles: string[]
) {
  if (notification.targetUserId) {
    return notification.targetUserId === userId;
  }

  if (notification.targetRole) {
    return roles.includes(notification.targetRole);
  }

  return true;
}

export function publishNotification(notification: AppNotification) {
  notificationEmitter.emit(NOTIFICATION_CREATED_EVENT, notification);
}

export function subscribeToNotificationEvents(
  listener: (notification: AppNotification) => void
) {
  notificationEmitter.on(NOTIFICATION_CREATED_EVENT, listener);

  return () => {
    notificationEmitter.off(NOTIFICATION_CREATED_EVENT, listener);
  };
}
