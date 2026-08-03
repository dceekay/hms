export type AppNotificationPriority = "info" | "success" | "warning" | "critical";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  eventKey: string;
  priority: AppNotificationPriority;
  targetRole?: string | null;
  targetUserId?: string | null;
  linkUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  expiresAt?: string | null;
  readAt?: string | null;
};

export type NotificationListResult = {
  items: AppNotification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
};
