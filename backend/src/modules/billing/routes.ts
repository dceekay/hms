import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { BillingController } from "./controller";

const router = Router();
const controller = new BillingController();

router.use(authenticate);

router.get("/", authorizePermissions(["billing.read"]), controller.list);
router.post("/", authorizePermissions(["billing.create"]), controller.create);

export default router;
