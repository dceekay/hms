/**
 * ============================================================================
 * Global Error Handler
 * ============================================================================
 *
 * Every uncaught error eventually reaches this middleware.
 *
 * Never expose stack traces in production.
 *
 * ============================================================================
 */

import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Ignore unused warning
  void next;

  /**
   * Handle custom API errors.
   */
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  /**
   * Log unexpected errors.
   */
  console.error(error);

  /**
   * Hide stack trace in production.
   */
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",

    ...(env.NODE_ENV === "development" && {
      stack: error.stack,
    }),
  });
}