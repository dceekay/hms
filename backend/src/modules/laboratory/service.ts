import { LaboratoryRequestStatus, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { NotificationService } from "../notifications/service";
import {
  CompleteLaboratoryRequestDto,
  CreateLaboratoryRequestDto,
  LaboratoryTemplateDto,
  ListLaboratoryRequestsQueryDto,
  ListLaboratoryTemplatesQueryDto,
  UpdateLaboratoryRequestDto,
  UpdateLaboratoryTemplateDto,
} from "./dto";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function createLabRequestNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSL-${year}-${suffix}`;
}

function handleTemplatePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A laboratory template with this name or code already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Laboratory template not found");
    }
  }

  throw error;
}

function templatePayload(payload: LaboratoryTemplateDto | UpdateLaboratoryTemplateDto) {
  return {
    ...payload,
    code: cleanText(payload.code),
    category: cleanText(payload.category),
    specimen: cleanText(payload.specimen),
    reportTitle: cleanText(payload.reportTitle),
    notes: cleanText(payload.notes),
    fields: payload.fields as Prisma.InputJsonValue | undefined,
  };
}

export class LaboratoryService {
  async listTemplates(params: ListLaboratoryTemplatesQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where: Prisma.LaboratoryTemplateWhereInput = {
      deletedAt: null,
      ...(params.activeOnly ? { isActive: true } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { code: { contains: params.search } },
              { category: { contains: params.search } },
              { specimen: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.laboratoryTemplate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.laboratoryTemplate.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTemplate(payload: LaboratoryTemplateDto) {
    try {
      return await prisma.laboratoryTemplate.create({
        data: templatePayload(payload) as Prisma.LaboratoryTemplateCreateInput,
      });
    } catch (error) {
      handleTemplatePrismaError(error);
    }
  }

  async updateTemplate(id: string, payload: UpdateLaboratoryTemplateDto) {
    try {
      return await prisma.laboratoryTemplate.update({
        where: { id },
        data: templatePayload(payload) as Prisma.LaboratoryTemplateUpdateInput,
      });
    } catch (error) {
      handleTemplatePrismaError(error);
    }
  }

  async listRequests(params: ListLaboratoryRequestsQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where: Prisma.LaboratoryRequestWhereInput = {
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.status && params.status !== "all"
        ? { status: params.status as LaboratoryRequestStatus }
        : {}),
      ...(params.search
        ? {
            OR: [
              { requestNumber: { contains: params.search } },
              { template: { name: { contains: params.search } } },
              { template: { code: { contains: params.search } } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
              { patient: { phone: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total, summary] = await prisma.$transaction([
      prisma.laboratoryRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          patient: true,
          template: true,
          recordedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          completedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
        },
      }),
      prisma.laboratoryRequest.count({ where }),
      prisma.laboratoryRequest.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.status] = item._count.status;
        return accumulator;
      }, {}),
    };
  }

  async createRequest(payload: CreateLaboratoryRequestDto, recordedById?: string) {
    const request = await prisma.$transaction(async (tx) => {
      const [patient, template] = await Promise.all([
        tx.patient.findFirst({
          where: { id: payload.patientId, deletedAt: null },
        }),
        tx.laboratoryTemplate.findFirst({
          where: { id: payload.templateId, deletedAt: null, isActive: true },
        }),
      ]);

      if (!patient) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found");
      }

      if (!template) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Laboratory template not found or inactive");
      }

      return tx.laboratoryRequest.create({
        data: {
          requestNumber: createLabRequestNumber(),
          patientId: patient.id,
          templateId: template.id,
          clinicalNotes: cleanText(payload.clinicalNotes),
          recordedById: recordedById ?? null,
        },
        include: {
          patient: true,
          template: true,
          recordedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          completedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
        },
      });
    });

    await NotificationService.notifyRoles(["Laboratory", "Administrator", "Super Admin"], {
      title: "New laboratory request",
      message: `${request.template.name} requested for ${request.patient.firstName} ${request.patient.lastName}.`,
      eventKey: "laboratory.request.created",
      priority: "info",
      linkUrl: "/laboratory",
      metadata: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        patientId: request.patientId,
      },
    });

    return request;
  }

  async updateRequest(id: string, payload: UpdateLaboratoryRequestDto) {
    const data: Prisma.LaboratoryRequestUpdateInput = {};

    if (payload.clinicalNotes !== undefined) {
      data.clinicalNotes = cleanText(payload.clinicalNotes);
    }

    if (payload.status) {
      data.status = payload.status as LaboratoryRequestStatus;
    }

    if (payload.sampleCollectedAt !== undefined) {
      data.sampleCollectedAt = parseDate(payload.sampleCollectedAt);
    }

    return prisma.laboratoryRequest.update({
      where: { id },
      data,
      include: {
        patient: true,
        template: true,
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        completedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });
  }

  async completeRequest(id: string, payload: CompleteLaboratoryRequestDto, completedById?: string) {
    const request = await prisma.laboratoryRequest.update({
      where: { id },
      data: {
        status: LaboratoryRequestStatus.completed,
        resultValues: payload.resultValues as Prisma.InputJsonValue,
        interpretation: cleanText(payload.interpretation),
        technicianNote: cleanText(payload.technicianNote),
        completedAt: new Date(),
        completedById: completedById ?? null,
      },
      include: {
        patient: true,
        template: true,
        recordedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        completedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });

    await NotificationService.notifyRoles(["Doctor", "Receptionist", "Administrator", "Super Admin"], {
      title: "Laboratory result completed",
      message: `${request.template.name} result is ready for ${request.patient.firstName} ${request.patient.lastName}.`,
      eventKey: "laboratory.result.completed",
      priority: "success",
      linkUrl: "/laboratory",
      metadata: {
        requestId: request.id,
        requestNumber: request.requestNumber,
        patientId: request.patientId,
      },
    });

    return request;
  }
}
