import { Router } from "express";
import { PatientController } from "./controller";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { patientCreateSchema } from "./validators";

const router = Router();
const controller = new PatientController();

router.use(authenticate);

router.get("/", authorizePermissions(["patients.read"]), controller.list);
router.post(
  "/",
  validateBody(patientCreateSchema),
  authorizePermissions(["patients.create"]),
  controller.create
);
router.get("/:id", authorizePermissions(["patients.read"]), controller.getById);

export default router;
