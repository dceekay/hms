/**
 * ============================================================================
 * Standard API Response
 * ============================================================================
 *
 * Every successful API response MUST follow this structure.
 *
 * Example:
 *
 * {
 *    success: true,
 *    message: "Patient Created",
 *    data: {},
 *    meta: {}
 * }
 *
 * ============================================================================
 */

export class ApiResponse<T> {
  success: boolean;

  message: string;

  data?: T;

  meta?: unknown;

  constructor(
    success: boolean,
    message: string,
    data?: T,
    meta?: unknown
  ) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}