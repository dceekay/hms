import { Router } from "express";
import { UserController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { updateUserSchema, assignRolesSchema, createDoctorSchema, createUserSchema } from "./dto";
import { authenticate, authorizePermissions, authorizeRoles } from "../../shared/middleware/auth.middleware";

const router = Router();
const userController = new UserController();

router.use(authenticate);

router.get("/", authorizePermissions(["users.read"]), userController.list);
router.post(
  "/",
  authorizeRoles(["Super Admin"]),
  authorizePermissions(["users.create"]),
  validateBody(createUserSchema),
  userController.create
);
router.post(
  "/doctors",
  authorizeRoles(["Super Admin"]),
  authorizePermissions(["users.create"]),
  validateBody(createDoctorSchema),
  userController.createDoctor
);
router.get("/:id", authorizePermissions(["users.read"]), userController.getById);

router.patch(
  "/:id",
  authorizePermissions(["users.update"]),
  validateBody(updateUserSchema),
  userController.update
);

router.post(
  "/:id/roles",
  authorizePermissions(["users.manage_roles"]),
  validateBody(assignRolesSchema),
  userController.assignRoles
);

router.post(
  "/:id/activate",
  authorizePermissions(["users.update"]),
  userController.activate
);

router.post(
  "/:id/deactivate",
  authorizePermissions(["users.update"]),
  userController.deactivate
);

router.delete("/:id", authorizePermissions(["users.delete"]), userController.remove);

export default router;
