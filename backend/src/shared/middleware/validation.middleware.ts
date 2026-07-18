import { NextFunction, Request, Response } from "express";
import { ZodIssue, ZodTypeAny } from "zod";
import { ApiError } from "../errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((issue: ZodIssue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return next(
        new ApiError(HttpStatus.BAD_REQUEST, "Validation failed: " + JSON.stringify(issues))
      );
    }

    req.body = result.data;
    next();
  };
}
