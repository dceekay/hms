import { Router } from "express";
import { DepartmentController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { createDepartmentSchema, updateDepartmentSchema } from "./validators";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";

const router = Router();
const controller = new DepartmentController();

router.use(authenticate);

router.get("/", authorizePermissions(["departments.read"]), controller.list);
router.post(
  "/",
  authorizePermissions(["departments.create"]),
  validateBody(createDepartmentSchema),
  controller.create
);
router.get("/:id", authorizePermissions(["departments.read"]), controller.getById);
router.put(
  "/:id",
  authorizePermissions(["departments.update"]),
  validateBody(updateDepartmentSchema),
  controller.update
);
router.delete("/:id", authorizePermissions(["departments.delete"]), controller.remove);

export default router;
