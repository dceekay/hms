import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { UserService } from "./service";
import { listUsersQuerySchema } from "./dto";
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";

function getParamId(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function getParamStaffId(req: AuthRequest): string {
  return Array.isArray(req.params.staffId) ? req.params.staffId[0] : req.params.staffId;
}

export class UserController extends BaseController {
  constructor(private readonly userService = new UserService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.userService.list(listUsersQuerySchema.parse(req.query));
      this.ok(res, "Users fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.getById(getParamId(req));
      this.ok(res, "User fetched successfully", user);
    } catch (error) {
      next(error);
    }
  };

  verifyStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.verifyStaff(getParamId(req));
      this.ok(res, "Staff verification fetched successfully", user);
    } catch (error) {
      next(error);
    }
  };

  lookupStaff = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.lookupStaffByCardNumber(getParamStaffId(req));
      this.ok(res, "Staff card lookup fetched successfully", user);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.create(req.body);
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "User account",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Created staff account ${user.username}`,
        reference: user.username,
      });
      this.created(res, "User account created successfully", user);
    } catch (error) {
      next(error);
    }
  };

  createDoctor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.createDoctor(req.body);
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "User account",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Created doctor account ${user.username}`,
        reference: user.username,
      });
      this.created(res, "Doctor account created successfully", user);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.update(getParamId(req), req.body);
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "User account",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Updated staff account ${user.username}`,
        reference: user.username,
      });
      this.ok(res, "User updated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.updateOwnAccount(req.user?.sub, req.body);
      this.ok(res, "Account settings updated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  assignRoles = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);

      if (req.user?.sub === id) {
        throw new ApiError(HttpStatus.FORBIDDEN, "You cannot change your own roles");
      }

      const user = await this.userService.assignRoles(id, req.body);
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "User access",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Changed access roles for ${user.username}`,
        reference: user.username,
        changes: [{ field: "role count", after: user.roles?.length ?? 0 }],
      });
      this.ok(res, "User roles updated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  activate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.activate(getParamId(req));
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "User account",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Activated staff account ${user.username}`,
        reference: user.username,
        changes: [{ field: "account status", after: "active" }],
      });
      this.ok(res, "User activated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);

      if (req.user?.sub === id) {
        throw new ApiError(HttpStatus.FORBIDDEN, "You cannot deactivate your own account");
      }

      const user = await this.userService.deactivate(id);
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "User account",
        entityId: user.id,
        userId: req.user?.sub,
        summary: `Deactivated staff account ${user.username}`,
        reference: user.username,
        changes: [{ field: "account status", after: "inactive" }],
      });
      this.ok(res, "User deactivated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);

      if (req.user?.sub === id) {
        throw new ApiError(HttpStatus.FORBIDDEN, "You cannot delete your own account");
      }

      const result = await this.userService.remove(id);
      await recordAudit({
        action: AuditAction.DELETE,
        entity: "User account",
        entityId: id,
        userId: req.user?.sub,
        summary: `Deleted staff account (${id.slice(0, 8)})`,
        reference: id,
      });
      this.ok(res, "User deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
