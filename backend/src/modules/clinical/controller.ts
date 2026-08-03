import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  createEncounterSchema,
  createPrescriptionSchema,
  listClinicalQuerySchema,
  updateEncounterSchema,
  updatePrescriptionStatusSchema,
} from "./dto";
import { ClinicalService } from "./service";

export class ClinicalController extends BaseController {
  constructor(private readonly clinicalService = new ClinicalService()) {
    super();
  }

  doctorWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.clinicalService.getDoctorWorkspace(req.user?.sub);
      this.ok(res, "Doctor workspace fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  listEncounters = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.clinicalService.listEncounters(
        listClinicalQuerySchema.parse(req.query)
      );

      this.ok(res, "Clinical encounters fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createEncounter = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const encounter = await this.clinicalService.createEncounter(
        createEncounterSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Clinical encounter saved successfully", encounter);
    } catch (error) {
      next(error);
    }
  };

  updateEncounter = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const encounter = await this.clinicalService.updateEncounter(
        String(req.params.id),
        updateEncounterSchema.parse(req.body),
        req.user?.sub
      );

      this.ok(res, "Clinical encounter updated successfully", encounter);
    } catch (error) {
      next(error);
    }
  };

  listPrescriptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.clinicalService.listPrescriptions(
        listClinicalQuerySchema.parse(req.query)
      );

      this.ok(res, "Prescriptions fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createPrescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const prescription = await this.clinicalService.createPrescription(
        createPrescriptionSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Prescription sent to pharmacy successfully", prescription);
    } catch (error) {
      next(error);
    }
  };

  updatePrescriptionStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const prescription = await this.clinicalService.updatePrescriptionStatus(
        String(req.params.id),
        updatePrescriptionStatusSchema.parse(req.body)
      );

      this.ok(res, "Prescription status updated successfully", prescription);
    } catch (error) {
      next(error);
    }
  };
}
