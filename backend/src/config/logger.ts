
/**
 * ============================================================================
 * Logger Configuration
 * ============================================================================
 *
 * Pino is used because it is one of the fastest logging libraries available.
 *
 * Later we will:
 *
 * ✔ Save logs to files
 * ✔ Save errors separately
 * ✔ Integrate with monitoring systems
 * ✔ Support log rotation
 *
 * ============================================================================
 */

import pino from "pino";

export const logger = pino({
  transport: {
    target: "pino-pretty",

    options: {
      colorize: true,
      translateTime: true,
      ignore: "pid,hostname",
    },
  },
});