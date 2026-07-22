import { NextFunction, Request, Response } from "express";
import { ApiError } from "../errors/ApiError";
import { verifyAccessToken } from "../helpers/jwt";
import { HttpStatus } from "../../core/HttpStatus";
import { JwtPayload } from "../types/JwtPayload";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Authentication token is required");
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Invalid token type");
    }

    req.user = payload;

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

    const hasRole = (user.roles ?? []).some((role) => requiredRoles.includes(role));

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
