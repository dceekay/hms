import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { PatientService } from "./service";

export class PatientController extends BaseController {
  constructor(private readonly patientService = new PatientService()) {
    super();
  }

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const patient = await this.patientService.create(req.body);
      return this.created(res, "Patient created successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const take = Number(req.query.take) || 10;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;

      const patients = await this.patientService.list({
        page,
        take,
        search,
      });

      return this.ok(res, "Patient list retrieved successfully", patients);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.getById(id);
      return this.ok(res, "Patient retrieved successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.update(id, req.body);
      return this.ok(res, "Patient updated successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const summary = await this.patientService.summary(id);
      return this.ok(res, "Patient summary retrieved successfully", summary);
    } catch (error) {
      next(error);
    }
  };

  qr = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const qr = await this.patientService.getQr(id);
      return this.ok(res, "Patient QR retrieved successfully", qr);
    } catch (error) {
      next(error);
    }
  };

  lookupByQrCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qrCode = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;
      const patient = await this.patientService.lookupByQrCode(qrCode);
      return this.ok(res, "Patient QR lookup completed successfully", patient);
    } catch (error) {
      next(error);
    }
  };
}
