import { Router } from "express";
import { authenticate, authorizePermissions } from "../../shared/middleware/auth.middleware";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { SecurityEntryController } from "./controller";
import {
  securityEntryCheckoutSchema,
  securityEntryCreateSchema,
  securityEntryUpdateSchema,
} from "./validators";

const router = Router();
const controller = new SecurityEntryController();

router.use(authenticate);

router.get(
  "/entry-logs",
  authorizePermissions(["security.entry.read"]),
  controller.list
);
router.post(
  "/entry-logs",
  validateBody(securityEntryCreateSchema),
  authorizePermissions(["security.entry.create"]),
  controller.create
);
router.get(
  "/entry-logs/:id",
  authorizePermissions(["security.entry.read"]),
  controller.getById
);
router.patch(
  "/entry-logs/:id",
  validateBody(securityEntryUpdateSchema),
  authorizePermissions(["security.entry.update"]),
  controller.update
);
router.post(
  "/entry-logs/:id/checkout",
  validateBody(securityEntryCheckoutSchema),
  authorizePermissions(["security.entry.update"]),
  controller.checkout
);

export default router;
