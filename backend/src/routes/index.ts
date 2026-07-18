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
import { ApiResponse } from "../shared/responses/ApiResponce";
import authRoutes from "../modules/auth/routes";

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

router.use("/auth", authRoutes);

export default router;