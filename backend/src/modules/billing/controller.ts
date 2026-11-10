import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { BillingService } from "./service";
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";
import {
  createPatientBillSchema,
  listPatientBillsQuerySchema,
} from "./dto";

export class BillingController extends BaseController {
  constructor(private readonly billingService = new BillingService()) {
    super();
  }

  list = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.billingService.list(
        listPatientBillsQuerySchema.parse(req.query)
      );

      this.ok(res, "Patient bills fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const bill = await this.billingService.create(
        createPatientBillSchema.parse(req.body),
        req.user?.sub
      );
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Patient bill",
        entityId: bill.id,
        userId: req.user?.sub,
        summary: `Created patient bill ${bill.invoiceNumber}`,
        reference: bill.invoiceNumber,
        changes: [
          { field: "payment status", after: bill.paymentStatus },
          { field: "total amount", after: Number(bill.totalAmount) },
        ],
      });

      this.created(res, "Patient bill created successfully", bill);
    } catch (error) {
      next(error);
    }
  };
}
