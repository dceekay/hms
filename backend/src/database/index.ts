import { logger } from "../config/logger";
import { prisma } from "./prisma";

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("MySQL Connected");
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database Disconnected");
}
