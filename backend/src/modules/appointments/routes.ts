import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { AppointmentController } from "./controller";

const router = Router();
const controller = new AppointmentController();

router.use(authenticate);

router.get("/doctors", authorizePermissions(["appointments.read"]), controller.listDoctors);
router.get("/", authorizePermissions(["appointments.read"]), controller.list);
router.post("/", authorizePermissions(["appointments.create"]), controller.create);
router.patch("/:id/status", authorizePermissions(["appointments.update"]), controller.updateStatus);

export default router;
