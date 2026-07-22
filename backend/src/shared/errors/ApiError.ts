/**
 * ============================================================================
 * Custom API Error
 * ============================================================================
 *
 * Instead of throwing normal JavaScript errors,
 * we throw ApiError.
 *
 * Example:
 *
 * throw new ApiError(404, "User Not Found");
 *
 * ============================================================================
 */

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}
