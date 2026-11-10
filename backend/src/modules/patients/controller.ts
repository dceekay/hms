import { NextFunction, Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { PatientService } from "./service";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";

export class PatientController extends BaseController {
  constructor(private readonly patientService = new PatientService()) {
    super();
  }

  create = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await this.patientService.create(req.body);
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Patient",
        entityId: patient.id,
        userId: req.user?.sub,
        summary: `Registered patient ${patient.firstName} ${patient.lastName}`,
        reference: patient.mrn,
      });
      return this.created(res, "Patient created successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  createInvestigation = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await this.patientService.createInvestigation(req.body);
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Patient",
        entityId: patient.id,
        userId: req.user?.sub,
        summary: `Registered investigation patient ${patient.firstName} ${patient.lastName}`,
        reference: patient.mrn,
      });
      return this.created(res, "Investigation patient created successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const take = Math.min(100, Math.max(1, Number(req.query.take || req.query.limit) || 20));
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const patientCategory =
        typeof req.query.patientCategory === "string" ? req.query.patientCategory : undefined;

      const patients = await this.patientService.list({
        page,
        take,
        search,
        status,
        patientCategory,
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

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.update(id, req.body);
      await recordAudit({
        action: AuditAction.UPDATE,
        entity: "Patient",
        entityId: patient.id,
        userId: req.user?.sub,
        summary: `Updated patient ${patient.firstName} ${patient.lastName}`,
        reference: patient.mrn,
        changes:
          req.body.status !== undefined
            ? [{ field: "status", after: patient.status }]
            : [],
      });
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

  verifyByQrCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qrCode = Array.isArray(req.params.qrCode) ? req.params.qrCode[0] : req.params.qrCode;
      const patient = await this.patientService.verifyByQrCode(qrCode);
      return this.ok(res, "Patient QR verification completed successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  convertInvestigationToHospital = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.convertInvestigationToHospital(id);
      return this.ok(res, "Investigation patient converted successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  insuranceProviders = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const providers = await this.patientService.listActiveInsuranceProviders();

      return this.ok(
        res,
        "Insurance providers retrieved successfully",
        providers
      );
    } catch (error) {
      next(error);
    }
  };

  reactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.reactivate(id);
      return this.ok(res, "Patient reactivated successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const patient = await this.patientService.deactivate(id);
      return this.ok(res, "Patient deactivated successfully", patient);
    } catch (error) {
      next(error);
    }
  };

  deletePermanently = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await this.patientService.deletePermanently(id, req.user?.sub);
      return this.ok(res, "Patient record permanently deleted", result);
    } catch (error) {
      next(error);
    }
  };
}
