import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { SecurityEntryService } from "./service";

export class SecurityEntryController extends BaseController {
  constructor(private readonly service = new SecurityEntryService()) {
    super();
  }

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const entry = await this.service.create(req.body, req.user?.sub);
      return this.created(res, "Security entry recorded successfully", entry);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const entries = await this.service.list({
        page: Number(req.query.page) || 1,
        take: Number(req.query.take) || 20,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        personType: typeof req.query.personType === "string" ? req.query.personType : undefined,
        activeOnly: req.query.activeOnly === "true",
      });

      return this.ok(res, "Security entries retrieved successfully", entries);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const entry = await this.service.getById(id);
      return this.ok(res, "Security entry retrieved successfully", entry);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const entry = await this.service.update(id, req.body);
      return this.ok(res, "Security entry updated successfully", entry);
    } catch (error) {
      next(error);
    }
  };

  checkout = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const entry = await this.service.checkout(id, req.body);
      return this.ok(res, "Security entry checked out successfully", entry);
    } catch (error) {
      next(error);
    }
  };
}
