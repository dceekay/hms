import { Router } from "express";
import { UserController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { updateUserSchema, assignRolesSchema } from "./dto";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";

const router = Router();
const userController = new UserController();

router.use(authenticate);

router.get("/", authorizePermissions(["users.read"]), userController.list);
router.get("/:id", authorizePermissions(["users.read"]), userController.getById);

router.patch(
  "/:id",
  authorizePermissions(["users.write"]),
  validateBody(updateUserSchema),
  userController.update
);

router.post(
  "/:id/roles",
  authorizePermissions(["users.manage_roles"]),
  validateBody(assignRolesSchema),
  userController.assignRoles
);

router.post("/:id/activate", authorizePermissions(["users.write"]), userController.activate);
router.post("/:id/deactivate", authorizePermissions(["users.write"]), userController.deactivate);

router.delete("/:id", authorizePermissions(["users.delete"]), userController.remove);

export default router;