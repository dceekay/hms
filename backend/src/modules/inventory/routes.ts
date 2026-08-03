import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { InventoryController } from "./controller";

const router = Router();
const controller = new InventoryController();

router.use(authenticate);

router.get("/items", authorizePermissions(["inventory.read"]), controller.listItems);
router.post("/items", authorizePermissions(["inventory.create"]), controller.createItem);
router.patch("/items/:id", authorizePermissions(["inventory.update"]), controller.updateItem);
router.post("/items/:id/movements", authorizePermissions(["inventory.issue"]), controller.recordMovement);
router.get("/movements", authorizePermissions(["inventory.read"]), controller.listMovements);

export default router;
