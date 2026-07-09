/**
 * ============================================================================
 * 404 Middleware
 * ============================================================================
 *
 * Runs when no route matches the incoming request.
 *
 * ============================================================================
 */

import { Request, Response } from "express";

export function notFound(
  req: Request,
  res: Response
) {
  return res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}