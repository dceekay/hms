import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { DashboardService } from "./service";

export class DashboardController extends BaseController {
  constructor(private readonly dashboardService = new DashboardService()) {
    super();
  }

  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await this.dashboardService.overview();

      return this.ok(res, "Dashboard overview retrieved successfully", overview);
    } catch (error) {
      next(error);
    }
  };
}
