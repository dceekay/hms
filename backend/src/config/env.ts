/**
 * ============================================================================
 * CeekayX Hospital Management System (HMS)
 * ============================================================================
 * File: env.ts
 *
 * Description:
 * Loads all environment variables from the .env file and exposes them
 * throughout the application in a type-safe and centralized manner.
 *
 * Benefits:
 * ✔ Single source of truth
 * ✔ Easier maintenance
 * ✔ Strong typing
 * ✔ Default values for development
 *
 * Author: Mohammad Sani Ibrahim
 * ============================================================================
 */

import dotenv from "dotenv";

// Load .env into process.env
dotenv.config();

/**
 * Export application configuration.
 */
export const env = {
  // ==========================================================================
  // APPLICATION
  // ==========================================================================

  /**
   * Application Name
   */
  APP_NAME: process.env.APP_NAME || "CeekayX HMS",

  /**
   * Environment
   * development | production | test
   */
  NODE_ENV: process.env.NODE_ENV || "development",

  /**
   * Express Server Port
   */
  PORT: Number(process.env.PORT) || 5000,

  /**
   * API Version
   */
  API_VERSION: process.env.API_VERSION || "v1",

  // ==========================================================================
  // DATABASE
  // ==========================================================================

  /**
   * MySQL Database Connection URL
   *
   * Example:
   * mysql://root:password@localhost:3306/hms
   */
  DATABASE_URL: process.env.DATABASE_URL || "",

  // ==========================================================================
  // JWT AUTHENTICATION
  // ==========================================================================

  /**
   * JWT Access Token Secret
   */
  JWT_SECRET: process.env.JWT_SECRET || "",

  /**
   * JWT Refresh Token Secret
   */
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",

  /**
   * Access Token Expiry
   */
  ACCESS_TOKEN_EXPIRES:
    process.env.ACCESS_TOKEN_EXPIRES || "15m",

  /**
   * Refresh Token Expiry
   */
  REFRESH_TOKEN_EXPIRES:
    process.env.REFRESH_TOKEN_EXPIRES || "7d",

  // ==========================================================================
  // PASSWORD SECURITY
  // ==========================================================================

  /**
   * bcrypt Salt Rounds
   */
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  /**
   * Maximum Requests
   */
  RATE_LIMIT_MAX_REQUESTS:
    Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

  /**
   * Rate Limit Window (milliseconds)
   */
  RATE_LIMIT_WINDOW_MS:
    Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,

  // ==========================================================================
  // FRONTEND
  // ==========================================================================

  /**
   * React Frontend URL
   */
  CLIENT_URL:
    process.env.CLIENT_URL || "http://localhost:5173",

  // ==========================================================================
  // LOGGING
  // ==========================================================================

  /**
   * Logging Level
   */
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // ==========================================================================
  // FILE UPLOADS
  // ==========================================================================

  /**
   * Upload Directory
   */
  UPLOAD_PATH:
    process.env.UPLOAD_PATH || "uploads",

  /**
   * Maximum Upload Size (Bytes)
   */
  MAX_FILE_SIZE:
    Number(process.env.MAX_FILE_SIZE) || 10485760,

  // ==========================================================================
  // REDIS (Future)
  // ==========================================================================

  REDIS_HOST:
    process.env.REDIS_HOST || "localhost",

  REDIS_PORT:
    Number(process.env.REDIS_PORT) || 6379,

  REDIS_PASSWORD:
    process.env.REDIS_PASSWORD || "",

  // ==========================================================================
  // SOCKET.IO (Future)
  // ==========================================================================

  SOCKET_PORT:
    Number(process.env.SOCKET_PORT) || 5001,

  // ==========================================================================
  // OFFLINE SYNCHRONIZATION
  // ==========================================================================

  SYNC_BATCH_SIZE:
    Number(process.env.SYNC_BATCH_SIZE) || 100,

  SYNC_INTERVAL:
    Number(process.env.SYNC_INTERVAL) || 30000,

  // ==========================================================================
  // AUDIT
  // ==========================================================================

  ENABLE_AUDIT_LOGS:
    process.env.ENABLE_AUDIT_LOGS === "true",

  // ==========================================================================
  // GENERAL SETTINGS
  // ==========================================================================

  DEFAULT_TIMEZONE:
    process.env.DEFAULT_TIMEZONE || "Africa/Lagos",

  DEFAULT_LANGUAGE:
    process.env.DEFAULT_LANGUAGE || "en",

  // ==========================================================================
  // DEVELOPMENT
  // ==========================================================================

  ENABLE_SWAGGER:
    process.env.ENABLE_SWAGGER === "true",

  ENABLE_QUERY_LOGGING:
    process.env.ENABLE_QUERY_LOGGING === "true",

  ENABLE_REQUEST_LOGGING:
    process.env.ENABLE_REQUEST_LOGGING === "true",
};