import { NextFunction, Request, Response } from "express";
import { ZodIssue, ZodTypeAny } from "zod";
import { ApiError } from "../errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((issue: ZodIssue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
      });

      return next(new ApiError(HttpStatus.BAD_REQUEST, `Validation failed: ${issues.join("; ")}`));
    }

    req.body = result.data;
    next();
  };
}
