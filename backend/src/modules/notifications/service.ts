import { NotificationPriority, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { ListNotificationsQueryDto } from "./dto";

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

export class NotificationService {
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
    return prisma.appNotification.create({
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
