import { Prisma, Department } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class DepartmentRepository extends BaseRepository<Department> {
  constructor() {
    super(prisma.department);
  }

  async findManyWithPagination(params: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<Department[]> {
    const where: Prisma.DepartmentWhereInput = params.search
      ? {
          OR: [
            { name: { contains: params.search } },
            { description: { contains: params.search } },
          ],
        }
      : {};

    return this.model.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });
  }
}
