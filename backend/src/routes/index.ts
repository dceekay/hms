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
import userRoutes from "../modules/users/routes";
import roleRoutes from "../modules/roles/routes";
import permissionRoutes from "../modules/permissions/routes";
import setupRoutes from "../modules/setup/routes";

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
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/setup", setupRoutes);

export default router;
