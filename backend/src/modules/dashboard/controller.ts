import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";

export class DashboardController extends BaseController {
  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      return this.ok(res, "Dashboard overview retrieved successfully", {
        revenue: 1342500,
        patientsToday: 42,
        admissions: 12,
        doctorsAvailable: 17,
        occupiedBeds: 34,
        pendingBills: 8,
      });
    } catch (error) {
      next(error);
    }
  }
}
