import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  medicationAdministrationSchema,
  nursingNoteSchema,
  nursingPatientQuerySchema,
  orderAcknowledgementSchema,
  vitalSignSchema,
} from "./dto";
import { NursingService } from "./service";

export class NursingController extends BaseController {
  constructor(private readonly nursingService = new NursingService()) {
    super();
  }

  workspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.workspace(req.user?.sub);
      this.ok(res, "Nursing workspace fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  patients = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.listPatients(
        nursingPatientQuerySchema.parse(req.query)
      );
      this.ok(res, "Nursing patients fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  administerMedication = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.administerMedication(
        String(req.params.scheduleId),
        medicationAdministrationSchema.parse(req.body),
        req.user?.sub
      );
      this.created(res, "Medication administration recorded successfully", result);
    } catch (error) {
      next(error);
    }
  };

  recordVitals = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.recordVitals(
        vitalSignSchema.parse(req.body),
        req.user?.sub
      );
      this.created(res, "Vitals recorded successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.createNote(
        nursingNoteSchema.parse(req.body),
        req.user?.sub
      );
      this.created(res, "Nursing note saved successfully", result);
    } catch (error) {
      next(error);
    }
  };

  acknowledgeOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.nursingService.acknowledgeOrder(
        orderAcknowledgementSchema.parse(req.body),
        req.user?.sub
      );
      this.ok(res, "Order acknowledged successfully", result);
    } catch (error) {
      next(error);
    }
  };
}
