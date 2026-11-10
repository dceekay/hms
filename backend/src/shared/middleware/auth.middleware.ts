import { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { verifyAccessToken } from "../helpers/jwt";
import { HttpStatus } from "../../core/HttpStatus";
import { JwtPayload } from "../types/JwtPayload";
import { PresenceService } from "../../modules/notifications/presence";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!token && req.cookies) {
      token = req.cookies.accessToken || req.cookies.hms_access_token || req.cookies.token;
    }

    if (!token) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Authentication token is required");
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid token type");
    }

    req.user = payload;
    if (payload.sub) {
      PresenceService.touch(payload.sub);
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    next(new ApiError(HttpStatus.UNAUTHORIZED, "Invalid or expired token"));
  }
}

export function authorizeRoles(requiredRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    if (requiredRoles.length === 0) {
      return next();
    }

    const normalizedRequired = requiredRoles.map((r) => r.trim().toLowerCase());
    const hasRole = (user.roles ?? []).some((role) =>
      normalizedRequired.includes(role.trim().toLowerCase())
    );

    if (!hasRole) {
      return next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient role"));
    }

    next();
  };
}

export function authorizePermissions(requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    if (requiredPermissions.length === 0) {
      return next();
    }

    const hasPermission = requiredPermissions.every((permission) =>
      (user.permissions ?? []).includes(permission)
    );

    if (!hasPermission) {
      return next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient permissions"));
    }

    next();
  };
}

export function authorizeAnyPermission(possiblePermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    if (possiblePermissions.length === 0) {
      return next();
    }

    const hasAny = possiblePermissions.some((permission) =>
      (user.permissions ?? []).includes(permission)
    );

    if (!hasAny) {
      return next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient permissions"));
    }

    next();
  };
}

export function authorizePermissionsOrRoles(
  requiredPermissions: string[],
  fallbackRoles: string[]
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized"));
    }

    const hasFallbackRole = (user.roles ?? []).some((role) =>
      fallbackRoles.some((fallbackRole) => fallbackRole.toLowerCase() === role.toLowerCase())
    );

    if (hasFallbackRole) {
      return next();
    }

    const hasPermission = requiredPermissions.every((permission) =>
      (user.permissions ?? []).includes(permission)
    );

    if (!hasPermission) {
      return next(new ApiError(HttpStatus.FORBIDDEN, "Insufficient permissions"));
    }

    next();
  };
}
