import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { NotificationController } from "./controller";

const router = Router();
const controller = new NotificationController();

router.get("/stream", controller.stream);

router.use(authenticate);

router.get("/", controller.list);
router.get("/push/public-key", controller.publicKey);
router.post("/push/subscribe", controller.subscribe);
router.post("/push/unsubscribe", controller.unsubscribe);
router.post("/:id/read", controller.markRead);
router.post("/read-all", controller.markAllRead);

export default router;
