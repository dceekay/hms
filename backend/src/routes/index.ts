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
import patientRoutes from "../modules/patients/routes";
import dashboardRoutes from "../modules/dashboard/routes";
import departmentRoutes from "../modules/departments/routes";
import hospitalProfileRoutes from "../modules/hospital/routes";

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
router.use("/patients", patientRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/departments", departmentRoutes);
router.use("/hospital-profile", hospitalProfileRoutes);

export default router;
