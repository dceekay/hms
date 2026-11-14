import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  createAdmissionRequestSchema,
  createEncounterSchema,
  createPrescriptionSchema,
  createReferralSchema,
  listClinicalQuerySchema,
  listPrescriptionsQuerySchema,
  updateAdmissionRequestStatusSchema,
  updateEncounterSchema,
  updatePrescriptionStatusSchema,
  updateReferralStatusSchema,
} from "./dto";
import { ClinicalService } from "./service";
import { extractOcrFromNoteImage, transcribeClinicalAudio } from "./aiCapture";
import { z } from "zod";

const ocrNoteSchema = z.object({
  imageDataUrl: z.string().min(20),
  mimeType: z.string().optional(),
});

const transcribeNoteSchema = z.object({
  audioDataUrl: z.string().min(20),
  mimeType: z.string().optional(),
});

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
        listPrescriptionsQuerySchema.parse(req.query)
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

  createAdmissionRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const admissionRequest = await this.clinicalService.createAdmissionRequest(
        createAdmissionRequestSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Admission request created successfully", admissionRequest);
    } catch (error) {
      next(error);
    }
  };

  updateAdmissionRequestStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const admissionRequest = await this.clinicalService.updateAdmissionRequestStatus(
        String(req.params.id),
        updateAdmissionRequestStatusSchema.parse(req.body)
      );

      this.ok(res, "Admission request updated successfully", admissionRequest);
    } catch (error) {
      next(error);
    }
  };

  createReferral = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const referral = await this.clinicalService.createReferral(
        createReferralSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Referral created successfully", referral);
    } catch (error) {
      next(error);
    }
  };

  updateReferralStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const referral = await this.clinicalService.updateReferralStatus(
        String(req.params.id),
        updateReferralStatusSchema.parse(req.body)
      );

      this.ok(res, "Referral updated successfully", referral);
    } catch (error) {
      next(error);
    }
  };

  ocrNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { imageDataUrl, mimeType } = ocrNoteSchema.parse(req.body);
      const result = await extractOcrFromNoteImage(imageDataUrl, mimeType);
      this.ok(res, "OCR extraction completed", result);
    } catch (error) {
      next(error);
    }
  };

  transcribeNote = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { audioDataUrl, mimeType } = transcribeNoteSchema.parse(req.body);
      const result = await transcribeClinicalAudio(audioDataUrl, mimeType);
      this.ok(res, "Audio transcription completed", result);
    } catch (error) {
      next(error);
    }
  };
}
