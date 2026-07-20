import { Router } from "express";
import { HospitalProfileController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { hospitalProfileSchema } from "./validators";

const router = Router();
const controller = new HospitalProfileController();

router.get("/", controller.get);
router.put("/", validateBody(hospitalProfileSchema), controller.upsert);

export default router;
