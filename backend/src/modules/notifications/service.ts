import {
  AppNotification,
  NotificationPriority,
  Prisma,
  PushSubscription,
} from "@prisma/client";
import webpush from "web-push";
import { prisma } from "../../database/prisma";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { env } from "../../config/env";
import { publishNotification } from "./realtime";
import {
  ListNotificationsQueryDto,
  PushSubscriptionDto,
  PushUnsubscribeDto,
} from "./dto";

type CreateNotificationInput = {
  title: string;
  message: string;
  eventKey: string;
  priority?: NotificationPriority;
  targetRole?: string | null;
  targetUserId?: string | null;
  linkUrl?: string | null;
  metadata?: Prisma.InputJsonValue;
  expiresAt?: Date | null;
};

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function pushEnabled() {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
}

if (pushEnabled()) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

function toWebPushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

function notificationPayload(notification: AppNotification) {
  return JSON.stringify({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    body: notification.message,
    priority: notification.priority,
    eventKey: notification.eventKey,
    linkUrl: notification.linkUrl ?? "/",
    url: notification.linkUrl ?? "/",
    createdAt: notification.createdAt,
  });
}

export class NotificationService {
  getPushPublicKey() {
    return {
      enabled: pushEnabled(),
      publicKey: env.VAPID_PUBLIC_KEY || null,
    };
  }

  async subscribeDevice(
    userId: string,
    payload: PushSubscriptionDto,
    userAgent?: string
  ) {
    if (!pushEnabled()) {
      return {
        enabled: false,
        subscribed: false,
        message: "Push notifications are not configured on this server.",
      };
    }

    await prisma.pushSubscription.upsert({
      where: {
        endpoint: payload.endpoint,
      },
      update: {
        userId,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: cleanText(userAgent),
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        endpoint: payload.endpoint,
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
        userAgent: cleanText(userAgent),
      },
    });

    return {
      enabled: true,
      subscribed: true,
    };
  }

  async unsubscribeDevice(userId: string, payload: PushUnsubscribeDto) {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint: payload.endpoint,
      },
    });

    return {
      unsubscribed: true,
    };
  }

  async listForUser(params: ListNotificationsQueryDto, userId: string, roles: string[]) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;
    const now = new Date();

    const visibilityWhere: Prisma.AppNotificationWhereInput = {
      OR: [
        { targetUserId: userId },
        { targetRole: { in: roles } },
        { targetUserId: null, targetRole: null },
      ],
      AND: [
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
    };

    const where: Prisma.AppNotificationWhereInput = {
      ...visibilityWhere,
      ...(params.unreadOnly
        ? {
            readReceipts: {
              none: {
                userId,
              },
            },
          }
        : {}),
    };

    const unreadWhere: Prisma.AppNotificationWhereInput = {
      ...visibilityWhere,
      readReceipts: {
        none: {
          userId,
        },
      },
    };

    const [items, total, unreadCount] = await prisma.$transaction([
      prisma.appNotification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          readReceipts: {
            where: { userId },
            select: { readAt: true },
          },
        },
      }),
      prisma.appNotification.count({ where }),
      prisma.appNotification.count({ where: unreadWhere }),
    ]);

    return {
      items: items.map(({ readReceipts, ...notification }) => ({
        ...notification,
        readAt: readReceipts[0]?.readAt ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async markRead(notificationId: string, userId: string, roles: string[]) {
    const notification = await this.findVisibleNotification(notificationId, userId, roles);

    await prisma.notificationRead.upsert({
      where: {
        notificationId_userId: {
          notificationId: notification.id,
          userId,
        },
      },
      update: { readAt: new Date() },
      create: {
        notificationId: notification.id,
        userId,
      },
    });

    return { id: notification.id };
  }

  async markAllRead(userId: string, roles: string[]) {
    const notifications = await prisma.appNotification.findMany({
      where: {
        OR: [
          { targetUserId: userId },
          { targetRole: { in: roles } },
          { targetUserId: null, targetRole: null },
        ],
        readReceipts: {
          none: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    if (notifications.length === 0) {
      return { count: 0 };
    }

    await prisma.notificationRead.createMany({
      data: notifications.map((notification) => ({
        notificationId: notification.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return { count: notifications.length };
  }

  private async findVisibleNotification(notificationId: string, userId: string, roles: string[]) {
    const notification = await prisma.appNotification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { targetUserId: userId },
          { targetRole: { in: roles } },
          { targetUserId: null, targetRole: null },
        ],
      },
    });

    if (!notification) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Notification not found");
    }

    return notification;
  }

  static async create(input: CreateNotificationInput) {
    const notification = await prisma.appNotification.create({
      data: {
        title: input.title,
        message: input.message,
        eventKey: input.eventKey,
        priority: input.priority ?? NotificationPriority.info,
        targetRole: cleanText(input.targetRole),
        targetUserId: cleanText(input.targetUserId),
        linkUrl: cleanText(input.linkUrl),
        metadata: input.metadata,
        expiresAt: input.expiresAt ?? null,
      },
    });

    publishNotification(notification);
    void NotificationService.dispatchPush(notification);

    return notification;
  }

  private static async dispatchPush(notification: AppNotification) {
    if (!pushEnabled()) return;

    try {
      const subscriptions = await NotificationService.findTargetSubscriptions(notification);

      if (subscriptions.length === 0) return;

      const payload = notificationPayload(notification);

      await Promise.all(
        subscriptions.map(async (subscription) => {
          try {
            await webpush.sendNotification(
              toWebPushSubscription(subscription),
              payload
            );

            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { lastSeenAt: new Date() },
            });
          } catch (error: any) {
            if ([404, 410].includes(Number(error?.statusCode))) {
              await prisma.pushSubscription.delete({
                where: { id: subscription.id },
              });
              return;
            }

            console.error("Unable to send push notification", error);
          }
        })
      );
    } catch (error) {
      console.error("Unable to dispatch push notifications", error);
    }
  }

  private static async findTargetSubscriptions(notification: AppNotification) {
    if (notification.targetUserId) {
      return prisma.pushSubscription.findMany({
        where: {
          userId: notification.targetUserId,
          user: {
            isActive: true,
            deletedAt: null,
          },
        },
      });
    }

    if (notification.targetRole) {
      return prisma.pushSubscription.findMany({
        where: {
          user: {
            isActive: true,
            deletedAt: null,
            roles: {
              some: {
                role: {
                  name: notification.targetRole,
                },
              },
            },
          },
        },
      });
    }

    return prisma.pushSubscription.findMany({
      where: {
        user: {
          isActive: true,
          deletedAt: null,
        },
      },
    });
  }

  static async notifyRoles(
    targetRoles: string[],
    input: Omit<CreateNotificationInput, "targetRole" | "targetUserId">
  ) {
    await Promise.all(
      targetRoles.map((targetRole) =>
        NotificationService.create({
          ...input,
          targetRole,
        })
      )
    ).catch((error) => {
      console.error("Unable to create notification", error);
    });
  }

  static async notifyUsers(
    targetUserIds: string[],
    input: Omit<CreateNotificationInput, "targetRole" | "targetUserId">
  ) {
    await Promise.all(
      targetUserIds.map((targetUserId) =>
        NotificationService.create({
          ...input,
          targetUserId,
        })
      )
    ).catch((error) => {
      console.error("Unable to create notification", error);
    });
  }
}
