import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { LaboratoryController } from "./controller";

const router = Router();
const controller = new LaboratoryController();

router.use(authenticate);

router.get("/templates", authorizePermissions(["laboratory.read"]), controller.listTemplates);
router.post("/templates", authorizePermissions(["laboratory.create"]), controller.createTemplate);
router.patch("/templates/:id", authorizePermissions(["laboratory.update"]), controller.updateTemplate);

router.get("/requests", authorizePermissions(["laboratory.read"]), controller.listRequests);
router.post("/requests", authorizePermissions(["laboratory.create"]), controller.createRequest);
router.patch("/requests/:id", authorizePermissions(["laboratory.update"]), controller.updateRequest);
router.post("/requests/:id/complete", authorizePermissions(["laboratory.result"]), controller.completeRequest);

export default router;
