import { Router } from "express";
import { PatientController } from "./controller";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { patientCreateSchema, patientUpdateSchema } from "./validators";

const router = Router();
const controller = new PatientController();

router.use(authenticate);

router.get(
  "/insurance-providers",
  authorizePermissions(["patients.read"]),
  controller.insuranceProviders
);

router.get("/", authorizePermissions(["patients.read"]), controller.list);
router.get("/lookup/:qrCode", authorizePermissions(["patients.read"]), controller.lookupByQrCode);
router.post(
  "/investigations",
  validateBody(patientCreateSchema),
  authorizePermissions(["patients.investigation.create"]),
  controller.createInvestigation
);
router.post(
  "/",
  validateBody(patientCreateSchema),
  authorizePermissions(["patients.create"]),
  controller.create
);
router.patch(
  "/:id",
  validateBody(patientUpdateSchema),
  authorizePermissions(["patients.update"]),
  controller.update
);
router.get("/:id/summary", authorizePermissions(["patients.read"]), controller.summary);
router.get("/:id/qr", authorizePermissions(["patients.read"]), controller.qr);
router.post(
  "/:id/convert-to-hospital",
  authorizePermissions(["patients.convert"]),
  controller.convertInvestigationToHospital
);
router.post(
  "/:id/reactivate",
  authorizePermissions(["patients.reactivate"]),
  controller.reactivate
);
router.post(
  "/:id/deactivate",
  authorizePermissions(["patients.update"]),
  controller.deactivate
);
router.get("/:id", authorizePermissions(["patients.read"]), controller.getById);

export default router;
