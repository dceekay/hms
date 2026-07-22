import { Router } from "express";
import { RoleController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { createRoleSchema, updateRoleSchema } from "./validator";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { z } from "zod";

const router = Router();
const controller = new RoleController();

router.use(authenticate);

router.get("/", authorizePermissions(["roles.read"]), controller.getAll);

router.get("/:id", authorizePermissions(["roles.read"]), controller.getOne);

router.post(
  "/",
  authorizePermissions(["roles.create"]),
  validateBody(createRoleSchema),
  controller.create
);

router.put(
  "/:id",
  authorizePermissions(["roles.update"]),
  validateBody(updateRoleSchema),
  controller.update
);

router.patch(
  "/:id",
  authorizePermissions(["roles.update"]),
  validateBody(updateRoleSchema),
  controller.update
);

router.post(
  "/:id/permissions",
  authorizePermissions(["roles.update"]),
  validateBody(z.object({ permissionIds: z.array(z.string().uuid()) })),
  controller.assignPermissions
);

router.delete("/:id", authorizePermissions(["roles.delete"]), controller.delete);

export default router;
