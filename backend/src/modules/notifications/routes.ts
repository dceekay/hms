import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { NotificationController } from "./controller";

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

router.get("/", controller.list);
router.post("/:id/read", controller.markRead);
router.post("/read-all", controller.markAllRead);

export default router;
