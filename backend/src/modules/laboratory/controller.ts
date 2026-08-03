import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  completeLaboratoryRequestSchema,
  createLaboratoryRequestSchema,
  laboratoryTemplateSchema,
  listLaboratoryRequestsQuerySchema,
  listLaboratoryTemplatesQuerySchema,
  updateLaboratoryRequestSchema,
  updateLaboratoryTemplateSchema,
} from "./dto";
import { LaboratoryService } from "./service";

export class LaboratoryController extends BaseController {
  constructor(private readonly laboratoryService = new LaboratoryService()) {
    super();
  }

  listTemplates = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.laboratoryService.listTemplates(
        listLaboratoryTemplatesQuerySchema.parse(req.query)
      );

      this.ok(res, "Laboratory templates fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const template = await this.laboratoryService.createTemplate(
        laboratoryTemplateSchema.parse(req.body)
      );

      this.created(res, "Laboratory template created successfully", template);
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const template = await this.laboratoryService.updateTemplate(
        String(req.params.id),
        updateLaboratoryTemplateSchema.parse(req.body)
      );

      this.ok(res, "Laboratory template updated successfully", template);
    } catch (error) {
      next(error);
    }
  };

  listRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.laboratoryService.listRequests(
        listLaboratoryRequestsQuerySchema.parse(req.query)
      );

      this.ok(res, "Laboratory requests fetched successfully", result);
    } catch (error) {
      next(error);
    }
  };

  createRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const request = await this.laboratoryService.createRequest(
        createLaboratoryRequestSchema.parse(req.body),
        req.user?.sub
      );

      this.created(res, "Laboratory request created successfully", request);
    } catch (error) {
      next(error);
    }
  };

  updateRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const request = await this.laboratoryService.updateRequest(
        String(req.params.id),
        updateLaboratoryRequestSchema.parse(req.body)
      );

      this.ok(res, "Laboratory request updated successfully", request);
    } catch (error) {
      next(error);
    }
  };

  completeRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const request = await this.laboratoryService.completeRequest(
        String(req.params.id),
        completeLaboratoryRequestSchema.parse(req.body),
        req.user?.sub
      );

      this.ok(res, "Laboratory result completed successfully", request);
    } catch (error) {
      next(error);
    }
  };
}
