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
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";

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
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Pharmacy medication",
        entityId: medication.id,
        userId: req.user?.sub,
        summary: `Added pharmacy product ${medication.name}`,
        reference: medication.batchNumber ?? medication.name,
      });

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
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "Pharmacy medication",
        entityId: medication.id,
        userId: req.user?.sub,
        summary: `Updated pharmacy product ${medication.name}`,
        reference: medication.batchNumber ?? medication.name,
        changes:
          req.body.sellingPrice !== undefined
            ? [{ field: "selling price", after: Number(req.body.sellingPrice) }]
            : [],
      });

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
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "Pharmacy stock",
        entityId: medication.id,
        userId: req.user?.sub,
        summary: `Adjusted ${medication.name} stock by ${req.body.quantityChange}`,
        reference: medication.name,
        changes: [
          { field: "quantity change", after: req.body.quantityChange },
          { field: "stock after", after: medication.currentStock },
        ],
      });

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
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Pharmacy dispense",
        entityId: dispense.id,
        userId: req.user?.sub,
        summary: `Dispensed ${dispense.quantity} ${dispense.medication.name}`,
        reference: dispense.invoiceNumber,
      });

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
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Pharmacy sale",
        entityId: sale.id,
        userId: req.user?.sub,
        summary: `Completed pharmacy sale ${sale.invoiceNumber}`,
        reference: sale.invoiceNumber,
        changes: [
          { field: "total amount", after: Number(sale.totalAmount) },
          { field: "payment status", after: sale.paymentStatus },
        ],
      });

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
