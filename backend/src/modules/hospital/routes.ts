import { Router } from "express";
import { HospitalProfileController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { hospitalProfileSchema } from "./validators";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";

const router = Router();
const controller = new HospitalProfileController();

router.use(authenticate);

router.get("/", authorizePermissions(["hospital_profile.read"]), controller.get);
router.put(
  "/",
  authorizePermissions(["hospital_profile.update"]),
  validateBody(hospitalProfileSchema),
  controller.upsert
);

export default router;
