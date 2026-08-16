import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { tourEventSchema, tourStatusQuerySchema } from "./dto";
import { OnboardingService } from "./service";

export class OnboardingController extends BaseController {
  constructor(private readonly onboardingService = new OnboardingService()) {
    super();
  }

  listMine = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.onboardingService.listMyTourProgress(String(req.user?.sub));
      return this.ok(res, "Tour progress retrieved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  status = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.onboardingService.getTourStatus(
        String(req.user?.sub),
        String(req.params.tourKey),
        tourStatusQuerySchema.parse(req.query)
      );

      return this.ok(res, "Tour status retrieved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  recordEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.onboardingService.recordEvent(
        String(req.user?.sub),
        tourEventSchema.parse(req.body)
      );

      return this.ok(res, "Tour event recorded successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
