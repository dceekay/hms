import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
  authorizePermissionsOrRoles,
} from "../../shared/middleware/auth.middleware";
import { ClinicalController } from "./controller";

const router = Router();
const controller = new ClinicalController();

router.use(authenticate);

router.get(
  "/doctor-workspace",
  authorizePermissionsOrRoles(["clinical.read"], ["Doctor", "Administrator", "Super Admin"]),
  controller.doctorWorkspace
);

router.get(
  "/encounters",
  authorizePermissionsOrRoles(["clinical.read"], ["Doctor", "Administrator", "Super Admin"]),
  controller.listEncounters
);
router.post(
  "/encounters",
  authorizePermissionsOrRoles(["clinical.create"], ["Doctor", "Administrator", "Super Admin"]),
  controller.createEncounter
);
router.patch(
  "/encounters/:id",
  authorizePermissionsOrRoles(["clinical.update"], ["Doctor", "Administrator", "Super Admin"]),
  controller.updateEncounter
);

router.get(
  "/prescriptions",
  authorizePermissionsOrRoles(["prescriptions.read"], ["Doctor", "Pharmacist", "Administrator", "Super Admin"]),
  controller.listPrescriptions
);
router.post(
  "/prescriptions",
  authorizePermissionsOrRoles(["prescriptions.create"], ["Doctor", "Administrator", "Super Admin"]),
  controller.createPrescription
);
router.patch(
  "/prescriptions/:id/status",
  authorizePermissions(["prescriptions.update"]),
  controller.updatePrescriptionStatus
);

export default router;
