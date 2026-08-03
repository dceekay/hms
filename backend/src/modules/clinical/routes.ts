import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { ClinicalController } from "./controller";

const router = Router();
const controller = new ClinicalController();

router.use(authenticate);

router.get(
  "/doctor-workspace",
  authorizePermissions(["clinical.read"]),
  controller.doctorWorkspace
);

router.get("/encounters", authorizePermissions(["clinical.read"]), controller.listEncounters);
router.post("/encounters", authorizePermissions(["clinical.create"]), controller.createEncounter);
router.patch("/encounters/:id", authorizePermissions(["clinical.update"]), controller.updateEncounter);

router.get("/prescriptions", authorizePermissions(["prescriptions.read"]), controller.listPrescriptions);
router.post(
  "/prescriptions",
  authorizePermissions(["prescriptions.create"]),
  controller.createPrescription
);
router.patch(
  "/prescriptions/:id/status",
  authorizePermissions(["prescriptions.update"]),
  controller.updatePrescriptionStatus
);

export default router;
