import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { WardService } from "./service";
import { assignBedSchema, dischargeAssignmentSchema, updateBedStatusSchema } from "./dto";

function getParamId(req: AuthRequest) {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export class WardController extends BaseController {
  constructor(private readonly wardService = new WardService()) {
    super();
  }

  dashboard = async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const dashboard = await this.wardService.dashboard();
      return this.ok(res, "Ward dashboard fetched successfully", dashboard);
    } catch (error) {
      next(error);
    }
  };

  assignBed = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignment = await this.wardService.assignBed(assignBedSchema.parse(req.body), req.user?.sub);
      return this.created(res, "Patient assigned to bed successfully", assignment);
    } catch (error) {
      next(error);
    }
  };

  dischargeAssignment = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignment = await this.wardService.dischargeAssignment(
        getParamId(req),
        dischargeAssignmentSchema.parse(req.body),
        req.user?.sub
      );
      return this.ok(res, "Patient discharged and bed released", assignment);
    } catch (error) {
      next(error);
    }
  };

  updateBedStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const bed = await this.wardService.updateBedStatus(
        getParamId(req),
        updateBedStatusSchema.parse(req.body)
      );
      return this.ok(res, "Bed status updated successfully", bed);
    } catch (error) {
      next(error);
    }
  };
}
