import { Prisma, SemsasTransfer, SemsasTransferType } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class SemsasRepository extends BaseRepository<SemsasTransfer> {
  constructor() {
    super(prisma.semsasTransfer);
  }

  createTransfer(data: Prisma.SemsasTransferUncheckedCreateInput) {
    return this.model.create({ data, include: this.include });
  }

  findByIdActive(id: string) {
    return this.model.findFirst({
      where: { id, deletedAt: null },
      include: this.include,
    });
  }

  list(params: {
    skip?: number;
    take?: number;
    search?: string;
    transferType?: SemsasTransferType;
    month?: string;
    filingStatus?: "filed" | "unfiled";
  }) {
    const dateRange = params.month ? monthRange(params.month) : null;
    const where: Prisma.SemsasTransferWhereInput = {
      deletedAt: null,
      ...(params.transferType ? { transferType: params.transferType } : {}),
      ...(dateRange ? { transferDate: { gte: dateRange.start, lt: dateRange.end } } : {}),
      ...(params.filingStatus === "filed" ? { filedAt: { not: null } } : {}),
      ...(params.filingStatus === "unfiled" ? { filedAt: null } : {}),
      ...(params.search
        ? {
            OR: [
              { patientName: { contains: params.search } },
              { patientPhone: { contains: params.search } },
              { fromFacility: { contains: params.search } },
              { toFacility: { contains: params.search } },
              { ambulanceProvider: { contains: params.search } },
              { ambulancePlateNumber: { contains: params.search } },
              { driverName: { contains: params.search } },
            ],
          }
        : {}),
    };

    return prisma.$transaction([
      this.model.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { transferDate: "desc" },
        include: this.include,
      }),
      this.model.count({ where }),
    ]);
  }

  updateTransfer(id: string, data: Prisma.SemsasTransferUncheckedUpdateInput) {
    return this.model.update({
      where: { id },
      data,
      include: this.include,
    });
  }

  async fileMonthly(month: string, filedById?: string, filingNotes?: string | null) {
    const range = monthRange(month);
    const filedAt = new Date();

    const result = await this.model.updateMany({
      where: {
        deletedAt: null,
        filedAt: null,
        transferDate: { gte: range.start, lt: range.end },
      },
      data: {
        filedMonth: month,
        filedAt,
        filedById,
        filingNotes: filingNotes || null,
      },
    });

    return {
      count: result.count,
      month,
      filedAt,
    };
  }

  private get include() {
    return {
      patient: {
        select: {
          id: true,
          mrn: true,
          firstName: true,
          lastName: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
      filedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    };
  }
}

export function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return { start, end };
}
