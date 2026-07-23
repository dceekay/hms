import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { SetupService } from "./service";

function getParam(req: AuthRequest, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}

export class SetupController extends BaseController {
  constructor(private readonly setupService = new SetupService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, search } = req.query as Record<string, string>;
      const result = await this.setupService.list(getParam(req, "resource"), {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
      });

      this.ok(res, "Setup records fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.setupService.getById(getParam(req, "resource"), getParam(req, "id"));
      this.ok(res, "Setup record fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.setupService.create(getParam(req, "resource"), req.body);
      this.created(res, "Setup record created successfully", result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.setupService.update(getParam(req, "resource"), getParam(req, "id"), req.body);
      this.ok(res, "Setup record updated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.setupService.remove(getParam(req, "resource"), getParam(req, "id"));
      this.ok(res, "Setup record deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
