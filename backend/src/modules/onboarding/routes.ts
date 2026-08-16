import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { OnboardingController } from "./controller";

const router = Router();
const controller = new OnboardingController();

router.use(authenticate);

router.get("/tours", controller.listMine);
router.get("/tours/:tourKey/status", controller.status);
router.post("/tours/events", controller.recordEvent);

export default router;
