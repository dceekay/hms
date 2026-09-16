import { Router } from "express";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { SetupController } from "./controller";
import { SeedController } from "./seedController";

const router = Router();
const controller = new SetupController();
const seedController = new SeedController();

// Unauthenticated / token-guarded bootstrap seed endpoints
router.post("/seed-users", seedController.seedUsers);
router.post("/seed-lab-templates", seedController.seedLabTemplates);

router.use(authenticate);

router.get("/:resource", authorizePermissions(["setup.read"]), controller.list);
router.get("/:resource/:id", authorizePermissions(["setup.read"]), controller.getById);
router.post("/:resource", authorizePermissions(["setup.create"]), controller.create);
router.patch("/:resource/:id", authorizePermissions(["setup.update"]), controller.update);
router.put("/:resource/:id", authorizePermissions(["setup.update"]), controller.update);
router.delete("/:resource/:id", authorizePermissions(["setup.delete"]), controller.remove);

export default router;
