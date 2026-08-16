import { Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import {
  CreateInsuranceClaimDto,
  ListInsuranceClaimsQueryDto,
  UpdateInsuranceClaimDto,
} from "./dto";

function createClaimNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSC-${year}-${suffix}`;
}

function toDateRange(params: ListInsuranceClaimsQueryDto): Prisma.InsuranceClaimWhereInput {
  const claimDate: Prisma.DateTimeFilter = {};

  if (params.dateFrom) {
    claimDate.gte = new Date(params.dateFrom);
  }

  if (params.dateTo) {
    const end = new Date(params.dateTo);
    end.setHours(23, 59, 59, 999);
    claimDate.lte = end;
  }

  return Object.keys(claimDate).length > 0 ? { claimDate } : {};
}

function cleanClaimData(payload: CreateInsuranceClaimDto | UpdateInsuranceClaimDto) {
  return {
    ...(payload.insuranceProviderId ? { insuranceProviderId: payload.insuranceProviderId } : {}),
    ...(payload.amountClaimed !== undefined ? { amountClaimed: payload.amountClaimed } : {}),
    ...(payload.amountProvided !== undefined ? { amountProvided: payload.amountProvided } : {}),
    ...(payload.claimDate ? { claimDate: payload.claimDate } : {}),
    ...(payload.providedDate !== undefined ? { providedDate: payload.providedDate } : {}),
    ...(payload.notes !== undefined ? { notes: payload.notes?.trim() || null } : {}),
  };
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A claim with this claim number already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Insurance claim not found");
    }
  }

  throw error;
}

export class DeskOfficeService {
  async dashboard(params: ListInsuranceClaimsQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;

    const where: Prisma.InsuranceClaimWhereInput = {
      deletedAt: null,
      ...(params.insuranceProviderId ? { insuranceProviderId: params.insuranceProviderId } : {}),
      ...toDateRange(params),
      ...(params.search
        ? {
            OR: [
              { claimNumber: { contains: params.search } },
              { notes: { contains: params.search } },
              { insuranceProvider: { name: { contains: params.search } } },
              { insuranceProvider: { code: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total, aggregate, providerSummary] = await prisma.$transaction([
      prisma.insuranceClaim.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { claimDate: "desc" },
        include: {
          insuranceProvider: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      prisma.insuranceClaim.count({ where }),
      prisma.insuranceClaim.aggregate({
        where,
        _sum: {
          amountClaimed: true,
          amountProvided: true,
        },
      }),
      prisma.insuranceClaim.groupBy({
        by: ["insuranceProviderId"],
        where,
        _sum: {
          amountClaimed: true,
          amountProvided: true,
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const providerIds = providerSummary.map((item) => item.insuranceProviderId);
    const providers = providerIds.length
      ? await prisma.insuranceProvider.findMany({
          where: { id: { in: providerIds } },
        })
      : [];

    const providerMap = new Map(providers.map((provider) => [provider.id, provider]));

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalClaims: total,
        amountClaimed: aggregate._sum.amountClaimed ?? 0,
        amountProvided: aggregate._sum.amountProvided ?? 0,
        outstandingAmount:
          Number(aggregate._sum.amountClaimed ?? 0) - Number(aggregate._sum.amountProvided ?? 0),
      },
      providerSummary: providerSummary.map((item) => ({
        insuranceProviderId: item.insuranceProviderId,
        insuranceProvider: providerMap.get(item.insuranceProviderId) ?? null,
        totalClaims: item._count._all,
        amountClaimed: item._sum.amountClaimed ?? 0,
        amountProvided: item._sum.amountProvided ?? 0,
        outstandingAmount: Number(item._sum.amountClaimed ?? 0) - Number(item._sum.amountProvided ?? 0),
      })),
    };
  }

  async createClaim(payload: CreateInsuranceClaimDto, recordedById?: string) {
    const provider = await prisma.insuranceProvider.findFirst({
      where: {
        id: payload.insuranceProviderId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!provider) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Insurance provider not found or inactive");
    }

    try {
      return await prisma.insuranceClaim.create({
        data: {
          claimNumber: createClaimNumber(),
          insuranceProviderId: payload.insuranceProviderId,
          amountClaimed: payload.amountClaimed,
          amountProvided: payload.amountProvided,
          claimDate: payload.claimDate,
          providedDate: payload.providedDate ?? null,
          notes: payload.notes?.trim() || null,
          recordedById: recordedById ?? null,
        },
        include: {
          insuranceProvider: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateClaim(id: string, payload: UpdateInsuranceClaimDto) {
    if (payload.insuranceProviderId) {
      const provider = await prisma.insuranceProvider.findFirst({
        where: {
          id: payload.insuranceProviderId,
          isActive: true,
          deletedAt: null,
        },
      });

      if (!provider) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Insurance provider not found or inactive");
      }
    }

    try {
      return await prisma.insuranceClaim.update({
        where: { id },
        data: cleanClaimData(payload),
        include: {
          insuranceProvider: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
