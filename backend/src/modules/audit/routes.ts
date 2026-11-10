import { Router } from "express";
import { authenticate, authorizeRoles } from "../../shared/middleware/auth.middleware";
import { AuditController } from "./controller";

const router = Router();
const controller = new AuditController();

router.use(authenticate, authorizeRoles(["Super Admin", "Administrator"]));
router.get("/", controller.list);

export default router;
