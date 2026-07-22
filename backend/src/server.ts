/**
 * ============================================================================
 * CeekayX Hospital Management System (HMS)
 * ============================================================================
 * File: server.ts
 *
 * Description:
 * Application entry point.
 *
 * Responsibilities:
 * ✔ Load application configuration
 * ✔ Connect to MySQL via Prisma
 * ✔ Start Express Server
 * ✔ Handle graceful shutdown
 * ✔ Handle unexpected application errors
 *
 * Author: Mohammad Sani Ibrahim
 * ============================================================================
 */

import app from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDatabase, disconnectDatabase } from "./database";

/**
 * Holds the running HTTP server instance.
 */
let server: ReturnType<typeof app.listen>;

/**
 * Bootstraps the application.
 */
async function bootstrap(): Promise<void> {
  try {
    logger.info("====================================");
    logger.info("Starting CeekayX HMS Backend...");
    logger.info("====================================");

    /**
     * Connect to MySQL
     */
    await connectDatabase();

    /**
     * Start Express server
     */
    server = app.listen(env.PORT, () => {
      logger.info("====================================");
      logger.info("CeekayX Hospital Management System");
      logger.info("Backend Started Successfully");
      logger.info(`Environment : ${env.NODE_ENV}`);
      logger.info(`Port        : ${env.PORT}`);
      logger.info(`URL         : http://localhost:${env.PORT}`);
      logger.info("====================================");
    });
  } catch (error) {
    logger.error("Application failed to start.");
    logger.error(error);

    process.exit(1);
  }
}

/**
 * Gracefully shuts down the application.
 */
async function shutdown(signal: string): Promise<void> {
  logger.warn(`${signal} received. Shutting down...`);

  try {
    if (server) {
      server.close(() => {
        logger.info("HTTP Server Closed");
      });
    }

    await disconnectDatabase();

    logger.info("Application shutdown completed.");

    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown.");
    logger.error(error);

    process.exit(1);
  }
}

/**
 * Handle termination signals.
 */
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

/**
 * Catch unhandled promise rejections.
 */
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection");
  logger.error(reason);
});

/**
 * Catch uncaught exceptions.
 */
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception");
  logger.error(error);

  process.exit(1);
});

/**
 * Start the application.
 */
bootstrap();
