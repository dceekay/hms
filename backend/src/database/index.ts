/**
 * ============================================================================
 * Database Connection
 * ============================================================================
 */

import { prisma } from "./prisma";
import { logger } from "../config/logger";

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();

    logger.info("✅ PostgreSQL Connected");
  } catch (error) {
    logger.error(error);

    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();

  logger.info("Database Disconnected");
}