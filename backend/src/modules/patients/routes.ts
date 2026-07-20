import { Router } from "express";
import { PatientController } from "./controller";
import { authenticate, authorizeRoles } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { patientCreateSchema } from "./validators";

const router = Router();
const controller = new PatientController();

router.use(authenticate);

router.get("/", controller.list);
router.post(
  "/",
  validateBody(patientCreateSchema),
  authorizeRoles(["Super Admin", "Administrator", "Receptionist"]),
  controller.create
);
router.get("/:id", controller.getById);

export default router;
