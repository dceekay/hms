import { EntryPersonType, Prisma, SecurityEntryLog } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class SecurityEntryRepository extends BaseRepository<SecurityEntryLog> {
  constructor() {
    super(prisma.securityEntryLog);
  }

  async createEntry(data: Prisma.SecurityEntryLogUncheckedCreateInput) {
    return this.model.create({ data });
  }

  async findByIdActive(id: string): Promise<SecurityEntryLog | null> {
    return this.model.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async list(params: {
    skip?: number;
    take?: number;
    search?: string;
    personType?: EntryPersonType;
    activeOnly?: boolean;
  }): Promise<SecurityEntryLog[]> {
    const where: Prisma.SecurityEntryLogWhereInput = {
      deletedAt: null,
      ...(params.personType ? { personType: params.personType } : {}),
      ...(params.activeOnly ? { checkedOutAt: null } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { phone: { contains: params.search } },
              { staffIdCardNumber: { contains: params.search } },
              { destination: { contains: params.search } },
              { purpose: { contains: params.search } },
            ],
          }
        : {}),
    };

    return this.model.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { checkedInAt: "desc" },
    });
  }
}
