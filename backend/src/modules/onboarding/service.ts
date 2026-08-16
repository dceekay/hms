import { UserTourProgress } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { TourEventDto, TourStatusQueryDto } from "./dto";

function serializeProgress(progress: UserTourProgress | null) {
  if (!progress) return null;

  return {
    id: progress.id,
    userId: progress.userId,
    tourKey: progress.tourKey,
    tourVersion: progress.tourVersion,
    roleName: progress.roleName,
    startedAt: progress.startedAt,
    completedAt: progress.completedAt,
    skippedAt: progress.skippedAt,
    dismissedAt: progress.dismissedAt,
    lastSeenAt: progress.lastSeenAt,
    lastStepIndex: progress.lastStepIndex,
    totalSteps: progress.totalSteps,
    viewCount: progress.viewCount,
    completedCount: progress.completedCount,
    skippedCount: progress.skippedCount,
    lastAction: progress.lastAction,
    lastPath: progress.lastPath,
    deviceType: progress.deviceType,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

export class OnboardingService {
  async getTourStatus(userId: string, tourKey: string, query: TourStatusQueryDto) {
    const progress = await prisma.userTourProgress.findUnique({
      where: {
        userId_tourKey_tourVersion: {
          userId,
          tourKey,
          tourVersion: query.tourVersion,
        },
      },
    });

    return {
      progress: serializeProgress(progress),
      shouldShow: !progress?.dismissedAt,
    };
  }

  async listMyTourProgress(userId: string) {
    const items = await prisma.userTourProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return {
      items: items.map(serializeProgress),
    };
  }

  async recordEvent(userId: string, payload: TourEventDto) {
    const now = new Date();
    const actionDates = {
      ...(payload.action === "started" ? { startedAt: now } : {}),
      ...(payload.action === "completed" ? { completedAt: now } : {}),
      ...(payload.action === "skipped" ? { skippedAt: now } : {}),
      ...(payload.action === "dont_show_again" ? { dismissedAt: now } : {}),
    };

    const progress = await prisma.userTourProgress.upsert({
      where: {
        userId_tourKey_tourVersion: {
          userId,
          tourKey: payload.tourKey,
          tourVersion: payload.tourVersion,
        },
      },
      create: {
        userId,
        tourKey: payload.tourKey,
        tourVersion: payload.tourVersion,
        roleName: payload.roleName,
        lastSeenAt: now,
        lastStepIndex: payload.stepIndex,
        totalSteps: payload.totalSteps,
        lastAction: payload.action,
        lastPath: payload.path ?? null,
        deviceType: payload.deviceType,
        viewCount: payload.action === "started" ? 1 : 0,
        completedCount: payload.action === "completed" ? 1 : 0,
        skippedCount: payload.action === "skipped" ? 1 : 0,
        ...actionDates,
      },
      update: {
        roleName: payload.roleName,
        lastSeenAt: now,
        lastStepIndex: payload.stepIndex,
        totalSteps: payload.totalSteps,
        lastAction: payload.action,
        lastPath: payload.path ?? null,
        deviceType: payload.deviceType,
        ...(payload.action === "started" ? { viewCount: { increment: 1 }, startedAt: now } : {}),
        ...(payload.action === "completed"
          ? { completedCount: { increment: 1 }, completedAt: now }
          : {}),
        ...(payload.action === "skipped" ? { skippedCount: { increment: 1 }, skippedAt: now } : {}),
        ...(payload.action === "dont_show_again" ? { dismissedAt: now } : {}),
      },
    });

    return {
      progress: serializeProgress(progress),
      shouldShow: !progress.dismissedAt,
    };
  }
}
