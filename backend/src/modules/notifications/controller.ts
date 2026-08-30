import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  listNotificationsQuerySchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from "./dto";
import { NotificationService } from "./service";
import { verifyAccessToken } from "../../shared/helpers/jwt";
import {
  canReceiveNotification,
  serializeNotification,
  subscribeToNotificationEvents,
} from "./realtime";

export class NotificationController extends BaseController {
  constructor(private readonly notificationService = new NotificationService()) {
    super();
  }


  stream = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = typeof req.query.token === "string" ? req.query.token : "";
      let payload: ReturnType<typeof verifyAccessToken>;

      try {
        payload = verifyAccessToken(token);
      } catch {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
      }

      if (payload.type !== "access") {
        return res.status(401).json({ success: false, message: "Invalid token type" });
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

      const heartbeat = setInterval(() => {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
      }, 25000);

      const unsubscribe = subscribeToNotificationEvents((notification) => {
        if (!canReceiveNotification(notification, payload.sub, payload.roles ?? [])) {
          return;
        }

        res.write(`event: notification\ndata: ${JSON.stringify(serializeNotification(notification))}\n\n`);
      });

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        res.end();
      });
    } catch (error) {
      next(error);
    }
  };
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
