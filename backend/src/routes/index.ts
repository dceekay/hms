/**
 * ============================================================================
 * API Routes
 * ============================================================================
 *
 * Every feature module registers its routes here.
 *
 * Example:
 *
 * router.use("/auth", authRoutes);
 * router.use("/patients", patientRoutes);
 *
 * ============================================================================
 */

import { Router } from "express";
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

/**
 * Health Check Endpoint
 */
router.get("/health", (req, res) => {
  return res.json(
    new ApiResponse(
      true,
      "CeekayX HMS API is running successfully."
    )
  );
});

export default router;