import { Prisma, Patient } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export class PatientRepository extends BaseRepository<Patient> {
  constructor() {
    super(prisma.patient);
  }

  async create(data: Partial<Patient>): Promise<Patient> {
    const normalizedData: Prisma.PatientCreateInput = {
      ...(data as Prisma.PatientCreateInput),
      dateOfBirth:
        typeof (data as Prisma.PatientCreateInput).dateOfBirth === "string"
          ? new Date((data as Prisma.PatientCreateInput).dateOfBirth as string)
          : (data as Prisma.PatientCreateInput).dateOfBirth,
    };

    return this.model.create({ data: normalizedData });
  }

  async findByEmail(email: string): Promise<Patient | null> {
    return this.model.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<Patient | null> {
    return this.model.findUnique({ where: { phone } });
  }

  async findManyWithPagination(params: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<Patient[]> {
    const where: Prisma.PatientWhereInput = params.search
      ? {
          OR: [
            { firstName: { contains: params.search } },
            { lastName: { contains: params.search } },
            { email: { contains: params.search } },
            { phone: { contains: params.search } },
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
