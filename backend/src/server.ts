/**
 * ============================================================================
 * Application Entry Point
 * ============================================================================
 *
 * Starts the Express server.
 *
 * Future Responsibilities:
 *
 * ✔ Connect PostgreSQL
 * ✔ Connect Redis
 * ✔ Connect Socket.IO
 * ✔ Start Background Jobs
 *
 * ============================================================================
 */

import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";

/**
 * Start Express Server
 */
app.listen(env.PORT, () => {
  logger.info("====================================");
  logger.info("CeekayX Hospital Management System");
  logger.info("Backend Server Started Successfully");
  logger.info(`Environment : ${env.NODE_ENV}`);
  logger.info(`Port        : ${env.PORT}`);
  logger.info(`URL         : http://localhost:${env.PORT}`);
  logger.info("====================================");
});