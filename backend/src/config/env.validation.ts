/**
 * ============================================================================
 * CeekayX Hospital Management System (HMS)
 * ============================================================================
 * File: env.validation.ts
 *
 * Description:
 * Validates all required environment variables before the application starts.
 *
 * Why?
 * ----
 * Instead of discovering configuration problems while the application
 * is running, we fail immediately with clear error messages.
 *
 * Example:
 *
 * ❌ Missing JWT_SECRET
 * ❌ Invalid PORT
 * ❌ Missing DATABASE_URL
 *
 * The application will stop until the configuration is corrected.
 *
 * ============================================================================
 */

import { z } from "zod";

/**
 * Environment Variable Schema
 *
 * Every variable defined here becomes required (unless marked optional).
 */
const envSchema = z.object({
  /**
   * Application
   */
  APP_NAME: z.string().default("CeekayX HMS"),

  NODE_ENV: z.enum([
    "development",
    "production",
    "test",
  ]),

  PORT: z.coerce.number().positive(),

  API_VERSION: z.string().default("v1"),

  /**
   * Database
   */
  DATABASE_URL: z.string().min(1),

  /**
   * Authentication
   */
  JWT_SECRET: z.string().min(32, {
    message:
      "JWT_SECRET should be at least 32 characters long.",
  }),

  JWT_REFRESH_SECRET: z.string().min(32, {
    message:
      "JWT_REFRESH_SECRET should be at least 32 characters long.",
  }),

  ACCESS_TOKEN_EXPIRES: z.string(),

  REFRESH_TOKEN_EXPIRES: z.string(),

  /**
   * Security
   */
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(15),

  /**
   * Rate Limiting
   */
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number(),

  RATE_LIMIT_WINDOW_MS: z.coerce.number(),

  /**
   * Frontend
   */
  CLIENT_URL: z.string().url(),

  /**
   * Logging
   */
  LOG_LEVEL: z.enum([
    "trace",
    "debug",
    "info",
    "warn",
    "error",
  ]),

  /**
   * Uploads
   */
  UPLOAD_PATH: z.string(),

  MAX_FILE_SIZE: z.coerce.number(),

  /**
   * Email
   */
  SMTP_HOST: z.string().optional(),

  SMTP_PORT: z.string().optional(),

  SMTP_USER: z.string().optional(),

  SMTP_PASSWORD: z.string().optional(),

  SMTP_FROM: z.string().optional(),

  /**
   * Redis
   */
  REDIS_HOST: z.string(),

  REDIS_PORT: z.coerce.number(),

  REDIS_PASSWORD: z.string().optional(),

  /**
   * Socket.IO
   */
  SOCKET_PORT: z.coerce.number(),

  /**
   * Offline Sync
   */
  SYNC_BATCH_SIZE: z.coerce.number(),

  SYNC_INTERVAL: z.coerce.number(),

  /**
   * Audit
   */
  ENABLE_AUDIT_LOGS: z.coerce.boolean(),

  /**
   * General
   */
  DEFAULT_TIMEZONE: z.string(),

  DEFAULT_LANGUAGE: z.string(),

  /**
   * Development
   */
  ENABLE_SWAGGER: z.coerce.boolean(),

  ENABLE_QUERY_LOGGING: z.coerce.boolean(),

  ENABLE_REQUEST_LOGGING: z.coerce.boolean(),
});

/**
 * Parse & Validate
 */
const parsed = envSchema.safeParse(process.env);

/**
 * Stop the application if validation fails.
 */
if (!parsed.success) {
  console.error("\n======================================");
  console.error(" Environment Validation Failed");
  console.error("======================================\n");

  console.table(parsed.error.flatten().fieldErrors);

  process.exit(1);
}

/**
 * Export validated configuration.
 */
export const validatedEnv = parsed.data;