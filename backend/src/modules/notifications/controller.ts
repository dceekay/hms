import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  listNotificationsQuerySchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "./dto";
import { NotificationService } from "./service";

export class NotificationController extends BaseController {
  constructor(private readonly notificationService = new NotificationService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.listForUser(
        listNotificationsQuerySchema.parse(req.query),
        String(req.user?.sub),
        req.user?.roles ?? []
      );

      return this.ok(res, "Notifications retrieved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.markRead(
        String(req.params.id),
        String(req.user?.sub),
        req.user?.roles ?? []
      );

      return this.ok(res, "Notification marked as read", result);
    } catch (error) {
      next(error);
    }
  };

  markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.markAllRead(
        String(req.user?.sub),
        req.user?.roles ?? []
      );

      return this.ok(res, "Notifications marked as read", result);
    } catch (error) {
      next(error);
    }
  };

  publicKey = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = this.notificationService.getPushPublicKey();
      return this.ok(res, "Push public key retrieved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  subscribe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.subscribeDevice(
        String(req.user?.sub),
        pushSubscriptionSchema.parse(req.body),
        req.get("user-agent")
      );

      return this.ok(res, "Push subscription saved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  unsubscribe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.unsubscribeDevice(
        String(req.user?.sub),
        pushUnsubscribeSchema.parse(req.body)
      );

      return this.ok(res, "Push subscription removed successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
