import { Router } from "express";
import { DashboardController } from "./controller";
import { authenticate } from "../../shared/middleware/auth.middleware";

const router = Router();
const controller = new DashboardController();

router.use(authenticate);
router.get("/overview", controller.overview);

export default router;
