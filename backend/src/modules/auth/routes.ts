import { Router } from "express";
import { AuthController } from "./controller";
import { validateBody } from "../../shared/middleware/validation.middleware";
import { registerSchema, loginSchema } from "../../shared/dto/auth.dto";
import {
  authenticate,
  authorizeRoles,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";

const router = Router();
const authController = new AuthController();

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

router.get("/profile", authenticate, authController.profile);
router.get(
  "/admin",
  authenticate,
  authorizeRoles(["Super Admin"]),
  authController.profile
);
router.get(
  "/permissions",
  authenticate,
  authorizePermissions(["roles.read"]),
  authController.profile
);

export default router;
