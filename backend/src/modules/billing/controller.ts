import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { BillingService } from "./service";
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

      this.created(res, "Patient bill created successfully", bill);
    } catch (error) {
      next(error);
    }
  };
}
