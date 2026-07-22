import { Router } from "express";
import { PermissionController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { createPermissionSchema, updatePermissionSchema } from "./dto";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";

const router = Router();
const permissionController = new PermissionController();

router.use(authenticate);

router.get("/", authorizePermissions(["permissions.read"]), permissionController.list);
router.get("/:id", authorizePermissions(["permissions.read"]), permissionController.getById);

router.post(
  "/",
  authorizePermissions(["permissions.write"]),
  validateBody(createPermissionSchema),
  permissionController.create
);

router.patch(
  "/:id",
  authorizePermissions(["permissions.write"]),
  validateBody(updatePermissionSchema),
  permissionController.update
);

router.delete("/:id", authorizePermissions(["permissions.delete"]), permissionController.remove);

export default router;