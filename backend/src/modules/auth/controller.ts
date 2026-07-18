import { Response, NextFunction } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AuthService } from "./service";

export class AuthController extends BaseController {
  constructor(private readonly authService = new AuthService()) {
    super();
  }

  register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      this.created(res, "User registered successfully", result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      this.ok(res, "Login successful", result);
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const result = await this.authService.refreshToken(refreshToken);
      this.ok(res, "Token refreshed successfully", result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      await this.authService.logout(refreshToken);
      this.ok(res, "Logout successful");
    } catch (error) {
      next(error);
    }
  };

  profile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, "Authenticated user", { user: req.user });
    } catch (error) {
      next(error);
    }
  };
}
