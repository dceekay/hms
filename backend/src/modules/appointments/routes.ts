import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
  authorizePermissionsOrRoles,
} from "../../shared/middleware/auth.middleware";
import { AppointmentController } from "./controller";

const router = Router();
const controller = new AppointmentController();

router.use(authenticate);

router.get(
  "/doctors",
  authorizePermissionsOrRoles(
    ["appointments.read", "patients.read"],
    ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"]
  ),
  controller.listDoctors
);
router.get(
  "/",
  authorizePermissionsOrRoles(
    ["appointments.read", "patients.read"],
    ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"]
  ),
  controller.list
);
router.post(
  "/",
  authorizePermissionsOrRoles(
    ["appointments.create", "patients.update"],
    ["Super Admin", "Administrator", "Doctor", "Receptionist", "Nurse"]
  ),
  controller.create
);
router.patch(
  "/:id/status",
  authorizePermissionsOrRoles(["appointments.update"], ["Doctor", "Receptionist", "Administrator", "Super Admin"]),
  controller.updateStatus
);

export default router;
