import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { listNotificationsQuerySchema } from "./dto";
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
}
