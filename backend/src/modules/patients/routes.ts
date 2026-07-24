import { Router } from "express";
import { PatientController } from "./controller";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { patientCreateSchema, patientUpdateSchema } from "./validators";

const router = Router();
const controller = new PatientController();

router.use(authenticate);

router.get("/", authorizePermissions(["patients.read"]), controller.list);
router.get("/lookup/:qrCode", authorizePermissions(["patients.read"]), controller.lookupByQrCode);
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
router.get("/:id", authorizePermissions(["patients.read"]), controller.getById);

export default router;
