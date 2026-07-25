import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { SemsasService } from "./service";

export class SemsasController extends BaseController {
  constructor(private readonly semsasService = new SemsasService()) {
    super();
  }

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const transfer = await this.semsasService.create(req.body, req.user?.sub);
      return this.created(res, "SEMSAS record created successfully", transfer);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const take = Number(req.query.take) || 20;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const transferType = typeof req.query.transferType === "string" ? req.query.transferType : undefined;
      const month = typeof req.query.month === "string" ? req.query.month : undefined;
      const filingStatus =
        req.query.filingStatus === "filed" || req.query.filingStatus === "unfiled"
          ? req.query.filingStatus
          : undefined;

      const transfers = await this.semsasService.list({
        page,
        take,
        search,
        transferType,
        month,
        filingStatus,
      });

      return this.ok(res, "SEMSAS records retrieved successfully", transfers);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const transfer = await this.semsasService.getById(id);
      return this.ok(res, "SEMSAS record retrieved successfully", transfer);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const transfer = await this.semsasService.update(id, req.body);
      return this.ok(res, "SEMSAS record updated successfully", transfer);
    } catch (error) {
      next(error);
    }
  };

  fileMonthly = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const filing = await this.semsasService.fileMonthly(req.body, req.user?.sub);
      return this.ok(res, "SEMSAS month filed successfully", filing);
    } catch (error) {
      next(error);
    }
  };
}
