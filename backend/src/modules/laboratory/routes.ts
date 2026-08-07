import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
  authorizePermissionsOrRoles,
  authorizeRoles,
} from "../../shared/middleware/auth.middleware";
import { LaboratoryController } from "./controller";

const router = Router();
const controller = new LaboratoryController();

router.use(authenticate);

router.get(
  "/templates",
  authorizePermissionsOrRoles(["laboratory.read"], ["Doctor", "Laboratory", "Administrator", "Super Admin"]),
  controller.listTemplates
);
router.post(
  "/templates",
  authorizeRoles(["Laboratory", "Super Admin"]),
  authorizePermissions(["laboratory.create"]),
  controller.createTemplate
);
router.patch(
  "/templates/:id",
  authorizeRoles(["Laboratory", "Super Admin"]),
  authorizePermissions(["laboratory.update"]),
  controller.updateTemplate
);

router.get(
  "/requests",
  authorizePermissionsOrRoles(["laboratory.read"], ["Doctor", "Laboratory", "Administrator", "Super Admin"]),
  controller.listRequests
);
router.post(
  "/requests",
  authorizePermissionsOrRoles(["laboratory.create"], ["Doctor", "Laboratory", "Administrator", "Super Admin"]),
  controller.createRequest
);
router.patch("/requests/:id", authorizePermissions(["laboratory.update"]), controller.updateRequest);
router.post("/requests/:id/complete", authorizePermissions(["laboratory.result"]), controller.completeRequest);

export default router;
