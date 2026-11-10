import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { SetupService } from "./service";
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";

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
      const resource = getParam(req, "resource");
      const result = await this.setupService.create(resource, req.body);
      const item = result as { id?: string; name?: string; code?: string; bedNumber?: string; price?: number | null };
      await recordAudit({
        action: AuditAction.CREATE,
        entity: `Setup ${resource}`,
        entityId: item.id,
        userId: req.user?.sub,
        summary: `Created ${resource.slice(0, -1)} ${item.name ?? item.bedNumber ?? item.code ?? "record"}`,
        reference: item.code ?? item.bedNumber ?? item.name,
        changes: item.price !== undefined ? [{ field: "price", after: item.price }] : [],
      });
      this.created(res, "Setup record created successfully", result);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resource = getParam(req, "resource");
      const result = await this.setupService.update(resource, getParam(req, "id"), req.body);
      const item = result as { id?: string; name?: string; code?: string; bedNumber?: string; price?: number | null };
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: `Setup ${resource}`,
        entityId: item.id,
        userId: req.user?.sub,
        summary: `Updated ${resource.slice(0, -1)} ${item.name ?? item.bedNumber ?? item.code ?? "record"}`,
        reference: item.code ?? item.bedNumber ?? item.name,
        changes: req.body.price !== undefined ? [{ field: "price", after: item.price }] : [],
      });
      this.ok(res, "Setup record updated successfully", result);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resource = getParam(req, "resource");
      const id = getParam(req, "id");
      const result = await this.setupService.remove(resource, id);
      await recordAudit({
        action: AuditAction.DELETE,
        entity: `Setup ${resource}`,
        entityId: id,
        userId: req.user?.sub,
        summary: `Removed ${resource.slice(0, -1)} (${id.slice(0, 8)})`,
        reference: id,
      });
      this.ok(res, "Setup record deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
