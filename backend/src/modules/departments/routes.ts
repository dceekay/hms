import { Router } from "express";
import { DepartmentController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { createDepartmentSchema, updateDepartmentSchema } from "./validators";

const router = Router();
const controller = new DepartmentController();

router.get("/", controller.list);
router.post("/", validateBody(createDepartmentSchema), controller.create);
router.get("/:id", controller.getById);
router.put("/:id", validateBody(updateDepartmentSchema), controller.update);
router.delete("/:id", controller.remove);

export default router;
