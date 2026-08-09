import { Router } from "express";
import {
  authenticate,
  authorizePermissionsOrRoles,
} from "../../shared/middleware/auth.middleware";
import { WardController } from "./controller";

const router = Router();
const controller = new WardController();

const wardRoles = ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"];

router.use(authenticate);

router.get(
  "/dashboard",
  authorizePermissionsOrRoles(["setup.read"], wardRoles),
  controller.dashboard
);
router.post(
  "/assignments",
  authorizePermissionsOrRoles(["clinical.update"], wardRoles),
  controller.assignBed
);
router.patch(
  "/assignments/:id/discharge",
  authorizePermissionsOrRoles(["clinical.update"], wardRoles),
  controller.dischargeAssignment
);
router.patch(
  "/beds/:id/status",
  authorizePermissionsOrRoles(["setup.update"], ["Super Admin", "Administrator", "Receptionist", "Nurse"]),
  controller.updateBedStatus
);

export default router;
