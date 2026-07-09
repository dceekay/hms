/**
 * ============================================================================
 * Express Application
 * ============================================================================
 *
 * This file creates the Express application.
 *
 * Responsibilities:
 *
 * ✔ Register middleware
 * ✔ Register routes
 * ✔ Register error handlers
 *
 * The server DOES NOT start here.
 *
 * ============================================================================
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

import routes from "./routes";

import { errorMiddleware } from "./middleware/error.middleware";
import { notFound } from "./middleware/notFound.middleware";

const app = express();

/**
 * Enable CORS
 */
app.use(cors());

/**
 * Secure HTTP headers
 */
app.use(helmet());

/**
 * Compress responses
 */
app.use(compression());

/**
 * Parse Cookies
 */
app.use(cookieParser());

/**
 * Parse JSON Body
 */
app.use(express.json());

/**
 * Parse Form Data
 */
app.use(express.urlencoded({ extended: true }));

/**
 * Register Version 1 API
 */
app.use("/api/v1", routes);

/**
 * 404 Handler
 */
app.use(notFound);

/**
 * Global Error Handler
 */
app.use(errorMiddleware);

export default app;