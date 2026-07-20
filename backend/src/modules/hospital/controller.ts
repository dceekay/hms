import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { HospitalProfileService } from "./service";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export class HospitalProfileController extends BaseController {
  constructor(private readonly hospitalProfileService = new HospitalProfileService()) {
    super();
  }

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.hospitalProfileService.getProfile();
      return this.ok(res, "Hospital profile retrieved successfully", profile);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === HttpStatus.NOT_FOUND) {
        return next(error);
      }

      next(error);
    }
  };

  upsert = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.hospitalProfileService.upsertProfile(req.body);
      return this.created(res, "Hospital profile saved successfully", profile);
    } catch (error) {
      next(error);
    }
  };
}
