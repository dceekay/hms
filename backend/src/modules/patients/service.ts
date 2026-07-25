import { randomUUID } from "crypto";
import { PatientCategory, PatientStatus, Prisma } from "@prisma/client";
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

  private async createWithCategory(payload: PatientCreateDto, patientCategory: PatientCategory) {
    const data = normalizePayload(payload);

    try {
      return await this.patientRepository.createPatient({
        ...data,
        patientCategory,
        status: data.status ?? PatientStatus.active,
        mrn: data.mrn ?? (await this.generateUniqueMrn()),
        qrCode: await this.generateUniqueQrCode(),
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async create(payload: PatientCreateDto) {
    const patientCategory =
      payload.patientCategory === PatientCategory.old_patient
        ? PatientCategory.old_patient
        : PatientCategory.new_patient;

    return this.createWithCategory(payload, patientCategory);
  }

  async createInvestigation(payload: PatientCreateDto) {
    return this.createWithCategory(payload, PatientCategory.investigation_patient);
  }

  async list(params: {
    page?: number;
    take?: number;
    search?: string;
    status?: string;
    patientCategory?: string;
  }) {
    const page = params.page ?? 1;
    const take = params.take ?? 10;
    const status = Object.values(PatientStatus).includes(params.status as PatientStatus)
      ? (params.status as PatientStatus)
      : undefined;
    const patientCategory = Object.values(PatientCategory).includes(params.patientCategory as PatientCategory)
      ? (params.patientCategory as PatientCategory)
      : undefined;
    const items = await this.patientRepository.findManyWithPagination({
      skip: (page - 1) * take,
      take,
      search: params.search,
      status,
      patientCategory,
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
      patientCategory: patient.patientCategory,
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
      patientCategory: patient.patientCategory,
      phone: patient.phone,
      insuranceProvider: patient.insuranceProvider?.name ?? null,
    };
  }

  async convertInvestigationToHospital(id: string) {
    const patient = await this.getById(id);

    if (patient.patientCategory !== PatientCategory.investigation_patient) {
      throw new ApiError(HttpStatus.CONFLICT, "Only investigation patients can be converted.");
    }

    return this.patientRepository.update(id, {
      patientCategory: PatientCategory.new_patient,
      status: PatientStatus.active,
      convertedToHospitalAt: new Date(),
      version: patient.version + 1,
    });
  }

  async reactivate(id: string) {
    const patient = await this.getById(id);

    return this.patientRepository.update(id, {
      patientCategory: PatientCategory.old_patient,
      status: PatientStatus.active,
      reactivatedAt: new Date(),
      version: patient.version + 1,
    });
  }

  async deactivate(id: string) {
    const patient = await this.getById(id);

    return this.patientRepository.update(id, {
      status: PatientStatus.inactive,
      version: patient.version + 1,
    });
  }
}
