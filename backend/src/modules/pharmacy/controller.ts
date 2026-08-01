import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  dispenseMedicationSchema,
  createPharmacySaleSchema,
  listMedicationsQuerySchema,
  medicationSchema,
  stockAdjustmentSchema,
  updateMedicationSchema,
} from "./dto";
import { PharmacyService } from "./service";

export class PharmacyController extends BaseController {
  constructor(private readonly pharmacyService = new PharmacyService()) {
    super();
  }

  listMedications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.pharmacyService.listMedications(
        listMedicationsQuerySchema.parse(req.query)
      );

      this.ok(res, "Medications fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createMedication = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const medication = await this.pharmacyService.createMedication(
        medicationSchema.parse(req.body)
      );

      this.created(res, "Medication created successfully", medication);
    } catch (error) {
      next(error);
    }
  };

  updateMedication = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const medication = await this.pharmacyService.updateMedication(
        String(req.params.id),
        updateMedicationSchema.parse(req.body)
      );

      this.ok(res, "Medication updated successfully", medication);
    } catch (error) {
      next(error);
    }
  };

  adjustStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const medication = await this.pharmacyService.adjustStock(
        String(req.params.id),
        stockAdjustmentSchema.parse(req.body),
        req.user?.sub
      );

      this.ok(res, "Medication stock updated successfully", medication);
    } catch (error) {
      next(error);
    }
  };

  dispense = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dispense = await this.pharmacyService.dispense(
        dispenseMedicationSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Medication dispensed successfully", dispense);
    } catch (error) {
      next(error);
    }
  };

  listDispenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.pharmacyService.listDispenses({
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
      });

      this.ok(res, "Dispense history fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createSale = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sale = await this.pharmacyService.createSale(
        createPharmacySaleSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Pharmacy sale completed successfully", sale);
    } catch (error) {
      next(error);
    }
  };

  listSales = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.pharmacyService.listSales({
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
      });

      this.ok(res, "Pharmacy sales fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  listMovements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.pharmacyService.listMovements({
        medicationId: typeof req.query.medicationId === "string" ? req.query.medicationId : undefined,
        page: Number(req.query.page) || undefined,
        limit: Number(req.query.limit) || undefined,
      });

      this.ok(res, "Stock movements fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
