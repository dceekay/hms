import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { ApiError } from "../../shared/errors/ApiError";
import { PatientRepository } from "./repository";
import { PatientCreateDto, PatientUpdateDto } from "./validators";

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function normalizePayload<T extends PatientCreateDto | PatientUpdateDto>(payload: T) {
  return {
    ...payload,
    dateOfBirth: payload.dateOfBirth ? toDate(payload.dateOfBirth) : undefined,
  };
}

function publicQrPayload(qrCode: string) {
  return {
    qrCode,
    lookupPath: `/api/v1/patients/lookup/${qrCode}`,
  };
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A patient with this unique value already exists.");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found.");
    }
  }

  throw error;
}

export class PatientService {
  constructor(private readonly patientRepository = new PatientRepository()) {}

  private async generateUniqueMrn() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const year = new Date().getFullYear();
      const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const mrn = `CXHMS-${year}-${suffix}`;
      const existing = await this.patientRepository.findByMrn(mrn);

      if (!existing) {
        return mrn;
      }
    }

    throw new ApiError(HttpStatus.CONFLICT, "Unable to generate a unique MRN. Please retry.");
  }

  private async generateUniqueQrCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const qrCode = `PAT-${randomUUID().replace(/-/g, "").toUpperCase()}`;
      const existing = await this.patientRepository.findByQrCode(qrCode);

      if (!existing) {
        return qrCode;
      }
    }

    throw new ApiError(HttpStatus.CONFLICT, "Unable to generate a unique QR code. Please retry.");
  }

  async create(payload: PatientCreateDto) {
    const data = normalizePayload(payload);

    try {
      return await this.patientRepository.createPatient({
        ...data,
        mrn: data.mrn ?? (await this.generateUniqueMrn()),
        qrCode: await this.generateUniqueQrCode(),
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async list(params: { page?: number; take?: number; search?: string }) {
    const page = params.page ?? 1;
    const take = params.take ?? 10;
    const items = await this.patientRepository.findManyWithPagination({
      skip: (page - 1) * take,
      take,
      search: params.search,
    });

    return {
      items,
      page,
      take,
    };
  }

  async getById(id: string) {
    const patient = await this.patientRepository.findByIdWithDetails(id);

    if (!patient) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found.");
    }

    return patient;
  }

  async update(id: string, payload: PatientUpdateDto) {
    const patient = await this.getById(id);
    const data = normalizePayload(payload);

    try {
      return await this.patientRepository.update(id, {
        ...data,
        version: patient.version + 1,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async summary(id: string) {
    const patient = await this.getById(id);

    return {
      id: patient.id,
      mrn: patient.mrn,
      qrCode: patient.qrCode,
      fullName: `${patient.firstName} ${patient.lastName}`,
      gender: patient.gender,
      dateOfBirth: patient.dateOfBirth,
      phone: patient.phone,
      email: patient.email,
      status: patient.status,
      bloodGroup: patient.bloodGroup,
      genotype: patient.genotype,
      allergies: patient.allergies,
      insurance: patient.insuranceProvider
        ? {
            provider: patient.insuranceProvider.name,
            policyNumber: patient.insurancePolicyNumber,
            coverageStatus: patient.insuranceCoverageStatus,
          }
        : null,
      emergencyContact: {
        name: patient.emergencyContactName,
        phone: patient.emergencyContactPhone,
        relationship: patient.emergencyContactRelationship,
      },
      visits: [],
    };
  }

  async getQr(id: string) {
    const patient = await this.getById(id);

    if (!patient.qrCode) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient QR code not found.");
    }

    return {
      patientId: patient.id,
      mrn: patient.mrn,
      ...publicQrPayload(patient.qrCode),
    };
  }

  async lookupByQrCode(qrCode: string) {
    const patient = await this.patientRepository.findByQrCode(qrCode);

    if (!patient || patient.deletedAt) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found for QR code.");
    }

    return {
      id: patient.id,
      mrn: patient.mrn,
      fullName: `${patient.firstName} ${patient.lastName}`,
      gender: patient.gender,
      status: patient.status,
      phone: patient.phone,
      insuranceProvider: patient.insuranceProvider?.name ?? null,
    };
  }
}
