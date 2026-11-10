import { NextFunction, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import {
  completeLaboratoryRequestSchema,
  createLaboratoryRequestSchema,
  createLaboratoryRequestsSchema,
  laboratoryTemplateSchema,
  listLaboratoryRequestsQuerySchema,
  listLaboratoryTemplatesQuerySchema,
  updateLaboratoryRequestSchema,
  updateLaboratoryTemplateSchema,
} from "./dto";
import { LaboratoryService } from "./service";
import { AuditAction } from "@prisma/client";
import { recordAudit } from "../audit/service";

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
      if (template) {
        await recordAudit({
          action: AuditAction.CREATE,
          entity: "Laboratory template",
          entityId: template.id,
          userId: req.user?.sub,
          summary: `Created laboratory test template ${template.name}`,
          reference: template.code ?? template.name,
        });
      }

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
      if (template) {
        await recordAudit({
          action: AuditAction.UPDATE,
          entity: "Laboratory template",
          entityId: template.id,
          userId: req.user?.sub,
          summary: `Updated laboratory test template ${template.name}`,
          reference: template.code ?? template.name,
        });
      }

      this.ok(res, "Laboratory template updated successfully", template);
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const deleted = await this.laboratoryService.deleteTemplate(id);
      await recordAudit({
        action: AuditAction.DELETE,
        entity: "Laboratory template",
        entityId: id,
        userId: req.user?.sub,
        summary: `Deleted laboratory test template ${deleted?.name ?? id.slice(0, 8)}`,
        reference: deleted?.code ?? id,
      });
      this.ok(res, "Laboratory template deleted successfully");
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
      await recordAudit({
        action: AuditAction.CREATE,
        entity: "Laboratory request",
        entityId: request.id,
        userId: req.user?.sub,
        summary: `Ordered ${request.template.name} for ${request.patient.firstName} ${request.patient.lastName}`,
        reference: request.requestNumber,
      });

      this.created(res, "Laboratory request created successfully", request);
    } catch (error) {
      next(error);
    }
  };

  createRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const requests = await this.laboratoryService.createRequests(
        createLaboratoryRequestsSchema.parse(req.body),
        req.user?.sub
      );
      if (requests.length > 0) {
        const first = requests[0];
        await recordAudit({
          action: AuditAction.CREATE,
          entity: "Laboratory request",
          entityId: first.id,
          userId: req.user?.sub,
          summary: `Ordered ${requests.length} test(s) for ${first.patient.firstName} ${first.patient.lastName}`,
          reference: requests.map((r) => r.requestNumber).join(", "),
        });
      }
      this.created(res, "Laboratory test batch created successfully", requests);
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
      if (request) {
        await recordAudit({
          action: AuditAction.UPDATE,
          entity: "Laboratory request",
          entityId: request.id,
          userId: req.user?.sub,
          summary: `Updated laboratory request ${request.requestNumber} (${request.status.replace(/_/g, " ")})`,
          reference: request.requestNumber,
          changes: [{ field: "status", after: request.status }],
        });
      }

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
      if (request) {
        await recordAudit({
          action: AuditAction.UPDATE,
          entity: "Laboratory result",
          entityId: request.id,
          userId: req.user?.sub,
          summary: `Completed laboratory result for ${request.template.name} (${request.requestNumber})`,
          reference: request.requestNumber,
          changes: [{ field: "status", after: "completed" }],
        });
      }

      this.ok(res, "Laboratory result completed successfully", request);
    } catch (error) {
      next(error);
    }
  };

  verifyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const verification = await this.laboratoryService.verifyLaboratoryRequest(
        String(req.params.identifier)
      );

      this.ok(res, "Laboratory request verified successfully", verification);
    } catch (error) {
      next(error);
    }
  };
}
