import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { DeskOfficeController } from "./controller";

const router = Router();
const controller = new DeskOfficeController();

router.use(authenticate);

router.get("/claims", authorizePermissions(["claims.read"]), controller.dashboard);
router.post("/claims", authorizePermissions(["claims.create"]), controller.createClaim);
router.patch("/claims/:id", authorizePermissions(["claims.update"]), controller.updateClaim);

export default router;
