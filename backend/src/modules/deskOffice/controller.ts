import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { DeskOfficeService } from "./service";
import {
  createInsuranceClaimSchema,
  listInsuranceClaimsQuerySchema,
  updateInsuranceClaimSchema,
} from "./dto";

export class DeskOfficeController extends BaseController {
  constructor(private readonly deskOfficeService = new DeskOfficeService()) {
    super();
  }

  dashboard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.deskOfficeService.dashboard(
        listInsuranceClaimsQuerySchema.parse(req.query)
      );

      this.ok(res, "Insurance claims fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createClaim = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await this.deskOfficeService.createClaim(
        createInsuranceClaimSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Insurance claim recorded successfully", claim);
    } catch (error) {
      next(error);
    }
  };

  updateClaim = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const claim = await this.deskOfficeService.updateClaim(
        String(req.params.id),
        updateInsuranceClaimSchema.parse(req.body)
      );

      this.ok(res, "Insurance claim updated successfully", claim);
    } catch (error) {
      next(error);
    }
  };
}
