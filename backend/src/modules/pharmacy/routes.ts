import { Router } from "express";
import {
  authenticate,
  authorizePermissions,
} from "../../shared/middleware/auth.middleware";
import { PharmacyController } from "./controller";

const router = Router();
const controller = new PharmacyController();

router.use(authenticate);

router.get("/medications", authorizePermissions(["pharmacy.read"]), controller.listMedications);
router.post("/medications", authorizePermissions(["pharmacy.create"]), controller.createMedication);
router.patch("/medications/:id", authorizePermissions(["pharmacy.update"]), controller.updateMedication);
router.post("/medications/:id/stock", authorizePermissions(["pharmacy.update"]), controller.adjustStock);

router.get("/dispenses", authorizePermissions(["pharmacy.read"]), controller.listDispenses);
router.post("/dispenses", authorizePermissions(["pharmacy.dispense"]), controller.dispense);

router.get("/sales", authorizePermissions(["pharmacy.read"]), controller.listSales);
router.post("/sales", authorizePermissions(["pharmacy.dispense"]), controller.createSale);

router.get("/stock-movements", authorizePermissions(["pharmacy.read"]), controller.listMovements);

export default router;
