import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AuditService } from "./service";

export class AuditController extends BaseController {
  constructor(private readonly service = new AuditService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const query = req.query as Record<string, string | undefined>;
      const result = await this.service.list({
        action: query.action,
        entity: query.entity,
        userId: query.userId,
        query: query.query,
        from: query.from,
        to: query.to,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      });
      this.ok(res, "System activity fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };
}

