/**
 * ============================================================================
 * Environment Configuration
 * ============================================================================
 *
 * This file loads and exposes all environment variables used throughout
 * the application.
 *
 * Keeping environment variables in one place makes the project easier
 * to maintain and provides type safety.
 *
 * Author: Mohammad Sani Ibrahim
 * Project: CeekayX Hospital Management System
 * ============================================================================
 */

import dotenv from "dotenv";

// Load .env file into process.env
dotenv.config();

/**
 * Export application configuration.
 */
export const env = {
  /**
   * Current application environment.
   * development | production | test
   */
  NODE_ENV: process.env.NODE_ENV || "development",

  /**
   * Express server port.
   */
  PORT: Number(process.env.PORT) || 5000,

  /**
   * PostgreSQL Connection String
   */
  DATABASE_URL: process.env.DATABASE_URL || "",

  /**
   * JWT Secret
   */
  JWT_SECRET: process.env.JWT_SECRET || "",

  /**
   * Refresh Token Secret
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
};