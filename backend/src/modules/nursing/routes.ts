import { Router } from "express";
import {
  authenticate,
  authorizePermissionsOrRoles,
} from "../../shared/middleware/auth.middleware";
import { NursingController } from "./controller";

const router = Router();
const controller = new NursingController();

router.use(authenticate);

router.get(
  "/workspace",
  authorizePermissionsOrRoles(["nursing.read"], ["Nurse", "Administrator", "Super Admin"]),
  controller.workspace
);

router.get(
  "/patients",
  authorizePermissionsOrRoles(["nursing.read"], ["Nurse", "Administrator", "Super Admin"]),
  controller.patients
);

router.post(
  "/medication-schedules/:scheduleId/administer",
  authorizePermissionsOrRoles(
    ["nursing.medication.administer"],
    ["Nurse", "Administrator", "Super Admin"]
  ),
  controller.administerMedication
);

router.post(
  "/vitals",
  authorizePermissionsOrRoles(["nursing.vitals.create"], ["Nurse", "Administrator", "Super Admin"]),
  controller.recordVitals
);

router.post(
  "/notes",
  authorizePermissionsOrRoles(["nursing.notes.create"], ["Nurse", "Administrator", "Super Admin"]),
  controller.createNote
);

router.post(
  "/orders/acknowledge",
  authorizePermissionsOrRoles(
    ["nursing.orders.acknowledge"],
    ["Nurse", "Administrator", "Super Admin"]
  ),
  controller.acknowledgeOrder
);

export default router;
