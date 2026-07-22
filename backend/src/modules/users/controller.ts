import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { UserService } from "./service";

function getParamId(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class UserController extends BaseController {
  constructor(private readonly userService = new UserService()) {
    super();
  }

  list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.userService.list(req.query as any);
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

  update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.update(getParamId(req), req.body);
      this.ok(res, "User updated successfully", user);
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
      this.ok(res, "User roles updated successfully", user);
    } catch (error) {
      next(error);
    }
  };

  activate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.userService.activate(getParamId(req));
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
      this.ok(res, "User deleted successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
