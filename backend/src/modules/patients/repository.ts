import { Prisma, Patient } from "@prisma/client";
import { BaseRepository } from "../../core/BaseRepository";
import { prisma } from "../../database/prisma";

export type PatientWithDetails = Prisma.PatientGetPayload<{
  include: { insuranceProvider: true };
}>;

export class PatientRepository extends BaseRepository<Patient> {
  constructor() {
    super(prisma.patient);
  }

  async createPatient(data: Prisma.PatientUncheckedCreateInput): Promise<Patient> {
    const normalizedData: Prisma.PatientUncheckedCreateInput = {
      ...data,
      dateOfBirth:
        typeof data.dateOfBirth === "string"
          ? new Date(data.dateOfBirth)
          : data.dateOfBirth,
    };

    return this.model.create({ data: normalizedData });
  }

  async findByEmail(email: string): Promise<Patient | null> {
    return this.model.findUnique({ where: { email } });
  }

  async findByPhone(phone: string): Promise<Patient | null> {
    return this.model.findUnique({ where: { phone } });
  }

  async findByMrn(mrn: string): Promise<Patient | null> {
    return this.model.findUnique({ where: { mrn } });
  }

  async findByQrCode(qrCode: string): Promise<PatientWithDetails | null> {
    return this.model.findUnique({
      where: { qrCode },
      include: { insuranceProvider: true },
    });
  }

  async findByIdWithDetails(id: string): Promise<PatientWithDetails | null> {
    return this.model.findFirst({
      where: { id, deletedAt: null },
      include: { insuranceProvider: true },
    });
  }

  async findManyWithPagination(params: {
    skip?: number;
    take?: number;
    search?: string;
  }): Promise<PatientWithDetails[]> {
    const where: Prisma.PatientWhereInput = params.search
      ? {
          deletedAt: null,
          OR: [
            { mrn: { contains: params.search } },
            { qrCode: { contains: params.search } },
            { firstName: { contains: params.search } },
            { lastName: { contains: params.search } },
            { email: { contains: params.search } },
            { phone: { contains: params.search } },
            { emergencyContactName: { contains: params.search } },
            { insurancePolicyNumber: { contains: params.search } },
          ],
        }
      : { deletedAt: null };

    return this.model.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
      include: { insuranceProvider: true },
    });
  }
}
