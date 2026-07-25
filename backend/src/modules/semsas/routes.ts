import { Router } from "express";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { SemsasController } from "./controller";
import { semsasFilingSchema, semsasTransferCreateSchema, semsasTransferUpdateSchema } from "./validators";

const router = Router();
const controller = new SemsasController();

router.use(authenticate);

router.get("/", authorizePermissions(["semsas.read"]), controller.list);
router.post("/", validateBody(semsasTransferCreateSchema), authorizePermissions(["semsas.create"]), controller.create);
router.post(
  "/filings",
  validateBody(semsasFilingSchema),
  authorizePermissions(["semsas.file"]),
  controller.fileMonthly
);
router.patch(
  "/:id",
  validateBody(semsasTransferUpdateSchema),
  authorizePermissions(["semsas.update"]),
  controller.update
);
router.get("/:id", authorizePermissions(["semsas.read"]), controller.getById);

export default router;
