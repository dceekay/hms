import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { PatientRepository } from "./repository";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";

export class PatientController extends BaseController {
  constructor(private readonly patientRepository = new PatientRepository()) {
    super();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await this.patientRepository.create(req.body);
      return this.created(res, "Patient created successfully", patient);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Unique constraint")) {
        return next(new ApiError(HttpStatus.CONFLICT, "Patient already exists."));
      }
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const take = Number(req.query.take) || 10;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const patients = await this.patientRepository.findManyWithPagination({
        skip: (page - 1) * take,
        take,
        search,
      });

      return this.ok(res, "Patient list retrieved successfully", {
        items: patients,
        page,
        take,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientRepository.findById(id);
      if (!patient) {
        return next(new ApiError(HttpStatus.NOT_FOUND, "Patient not found."));
      }
      return this.ok(res, "Patient retrieved successfully", patient);
    } catch (error) {
      next(error);
    }
  };
}
