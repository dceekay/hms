import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { PermissionService } from "./service";

function getParamId(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class PermissionController extends BaseController {
  constructor(private readonly permissionService = new PermissionService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page, limit, search } = req.query as Record<string, string>;
      const result = await this.permissionService.list({
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        search,
      });
      this.ok(res, "Permissions fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permission = await this.permissionService.getById(getParamId(req));
      this.ok(res, "Permission fetched successfully", permission);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permission = await this.permissionService.create(req.body);
      this.created(res, "Permission created successfully", permission);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permission = await this.permissionService.update(getParamId(req), req.body);
      this.ok(res, "Permission updated successfully", permission);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.permissionService.remove(getParamId(req));
      this.ok(res, "Permission deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
