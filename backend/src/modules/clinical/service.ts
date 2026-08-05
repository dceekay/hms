import { ClinicalEncounterStatus, PrescriptionStatus, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { NotificationService } from "../notifications/service";
import {
  CreateEncounterDto,
  CreatePrescriptionDto,
  ListClinicalQueryDto,
  UpdateEncounterDto,
  UpdatePrescriptionStatusDto,
} from "./dto";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function createEncounterNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSE-${year}-${suffix}`;
}

function createPrescriptionNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSPR-${year}-${suffix}`;
}

function patientSelect() {
  return {
    id: true,
    mrn: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    qrCode: true,
    photoDataUrl: true,
    photoUrl: true,
    dateOfBirth: true,
    gender: true,
    patientCategory: true,
    status: true,
    address: true,
    city: true,
    state: true,
    country: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    emergencyContactRelationship: true,
    allergies: true,
    bloodGroup: true,
    genotype: true,
    insuranceProviderId: true,
    insurancePolicyNumber: true,
    insuranceCoverageStatus: true,
    insuranceProvider: {
      select: {
        id: true,
        name: true,
        code: true,
        patientPayPercentage: true,
      },
    },
  } satisfies Prisma.PatientSelect;
}

const doctorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  phone: true,
  doctorProfile: true,
};

const appointmentInclude = {
  patient: { select: patientSelect() },
  doctor: { select: doctorSelect },
  recordedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  },
};

const encounterInclude = {
  patient: { select: patientSelect() },
  doctor: { select: doctorSelect },
  prescriptions: {
    include: {
      items: {
        include: {
          medication: true,
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
};

const prescriptionInclude = {
  patient: { select: patientSelect() },
  doctor: { select: doctorSelect },
  encounter: true,
  items: {
    include: {
      medication: true,
    },
  },
};

function mapEncounterPayload(payload: CreateEncounterDto | UpdateEncounterDto) {
  return {
    visitType: cleanText(payload.visitType),
    chiefComplaint: cleanText(payload.chiefComplaint),
    history: cleanText(payload.history),
    examination: cleanText(payload.examination),
    diagnosis: cleanText(payload.diagnosis),
    remarks: cleanText(payload.remarks),
    plan: cleanText(payload.plan),
  };
}

export class ClinicalService {
  async getDoctorWorkspace(doctorId?: string) {
    if (!doctorId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const [
        patients,
        assignedAppointments,
        recentEncounters,
        recentPrescriptions,
        pendingLabRequests,
        completedLabRequests,
        medications,
        summary,
      ] = await prisma.$transaction([
        prisma.patient.findMany({
          where: { deletedAt: null, status: "active" },
          take: 80,
          orderBy: { updatedAt: "desc" },
          select: patientSelect(),
        }),
        prisma.appointment.findMany({
          where: {
            deletedAt: null,
            doctorId,
            status: { in: ["scheduled", "checked_in", "in_consultation"] },
          },
          take: 50,
          orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
          include: appointmentInclude,
        }),
        prisma.clinicalEncounter.findMany({
          take: 50,
          orderBy: { startedAt: "desc" },
          include: encounterInclude,
        }),
        prisma.prescription.findMany({
          where: { doctorId },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: prescriptionInclude,
        }),
        prisma.laboratoryRequest.findMany({
          where: { status: { in: ["pending", "sample_collected", "in_progress"] } },
          take: 15,
          orderBy: { createdAt: "desc" },
          include: {
            patient: { select: patientSelect() },
            template: true,
          },
        }),
        prisma.laboratoryRequest.findMany({
          where: { status: "completed" },
          take: 15,
          orderBy: { completedAt: "desc" },
          include: {
            patient: { select: patientSelect() },
            template: true,
            completedBy: { select: doctorSelect },
          },
        }),
        prisma.medication.findMany({
          where: { deletedAt: null, isActive: true },
          take: 100,
          orderBy: [{ name: "asc" }],
        }),
        prisma.clinicalEncounter.groupBy({
          by: ["status"],
          where: { doctorId },
          _count: { status: true },
        }),
      ]);

      const todayEncounters = recentEncounters.filter(
        (encounter) => encounter.startedAt >= today
      ).length;
      const appointmentPatients = assignedAppointments.map((appointment) => appointment.patient);
      const patientMap = new Map(patients.map((patient) => [patient.id, patient]));

      for (const patient of appointmentPatients) {
        patientMap.set(patient.id, patient);
      }

      return {
        patients: Array.from(patientMap.values()),
        assignedAppointments,
        recentEncounters,
        recentPrescriptions,
        pendingLabRequests,
        completedLabRequests,
        medications,
        summary: {
          activePatients: patients.length,
          assignedAppointments: assignedAppointments.length,
          todayEncounters,
          pendingLabRequests: pendingLabRequests.length,
          completedLabResults: completedLabRequests.length,
          prescriptionsSent: recentPrescriptions.length,
          encounters: summary.reduce<Record<string, number>>((accumulator, item) => {
            accumulator[item.status] = item._count.status;
            return accumulator;
          }, {}),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientKnownRequestError) {
        return {
          patients: [],
          assignedAppointments: [],
          recentEncounters: [],
          recentPrescriptions: [],
          pendingLabRequests: [],
          completedLabRequests: [],
          medications: [],
          summary: {
            activePatients: 0,
            assignedAppointments: 0,
            todayEncounters: 0,
            pendingLabRequests: 0,
            completedLabResults: 0,
            prescriptionsSent: 0,
            encounters: {},
          },
        };
      }

      throw error;
    }
  }

  async listEncounters(params: ListClinicalQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where: Prisma.ClinicalEncounterWhereInput = {
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.status ? { status: params.status as ClinicalEncounterStatus } : {}),
      ...(params.search
        ? {
            OR: [
              { encounterNumber: { contains: params.search } },
              { diagnosis: { contains: params.search } },
              { chiefComplaint: { contains: params.search } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.clinicalEncounter.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startedAt: "desc" },
        include: encounterInclude,
      }),
      prisma.clinicalEncounter.count({ where }),
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

  async createEncounter(payload: CreateEncounterDto, doctorId?: string) {
    if (!doctorId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const patient = await prisma.patient.findFirst({
      where: { id: payload.patientId, deletedAt: null, status: "active" },
    });

    if (!patient) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Active patient not found");
    }

    return prisma.clinicalEncounter.create({
      data: {
        encounterNumber: createEncounterNumber(),
        patientId: patient.id,
        doctorId,
        ...mapEncounterPayload(payload),
      },
      include: encounterInclude,
    });
  }

  async updateEncounter(id: string, payload: UpdateEncounterDto, doctorId?: string) {
    if (!doctorId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const encounter = await prisma.clinicalEncounter.findFirst({
      where: { id, doctorId },
    });

    if (!encounter) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Clinical encounter not found");
    }

    return prisma.clinicalEncounter.update({
      where: { id },
      data: {
        ...mapEncounterPayload(payload),
        ...(payload.status
          ? {
              status: payload.status as ClinicalEncounterStatus,
              completedAt:
                payload.status === "completed" && encounter.status !== "completed"
                  ? new Date()
                  : encounter.completedAt,
            }
          : {}),
      },
      include: encounterInclude,
    });
  }

  async listPrescriptions(params: ListClinicalQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;

    const where: Prisma.PrescriptionWhereInput = {
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.search
        ? {
            OR: [
              { prescriptionNumber: { contains: params.search } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
              { items: { some: { medicationName: { contains: params.search } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.prescription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: prescriptionInclude,
      }),
      prisma.prescription.count({ where }),
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

  async createPrescription(payload: CreatePrescriptionDto, doctorId?: string) {
    if (!doctorId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: payload.patientId, deletedAt: null, status: "active" },
      });

      if (!patient) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Active patient not found");
      }

      const encounterId = cleanText(payload.encounterId);

      if (encounterId) {
        const encounter = await tx.clinicalEncounter.findFirst({
          where: { id: encounterId, patientId: patient.id, doctorId },
        });

        if (!encounter) {
          throw new ApiError(HttpStatus.NOT_FOUND, "Clinical encounter not found for this patient");
        }
      }

      return tx.prescription.create({
        data: {
          prescriptionNumber: createPrescriptionNumber(),
          patientId: patient.id,
          doctorId,
          encounterId,
          notes: cleanText(payload.notes),
          items: {
            create: payload.items.map((item) => ({
              medicationId: cleanText(item.medicationId),
              medicationName: item.medicationName.trim(),
              strength: cleanText(item.strength),
              dosageForm: cleanText(item.dosageForm),
              dose: item.dose.trim(),
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              quantity: item.quantity ?? null,
              instructions: cleanText(item.instructions),
            })),
          },
        },
        include: prescriptionInclude,
      });
    });

    await NotificationService.notifyRoles(["Pharmacist", "Administrator", "Super Admin"], {
      title: "New prescription",
      message: `${prescription.patient.firstName} ${prescription.patient.lastName} has a prescription ready for pharmacy.`,
      eventKey: "clinical.prescription.created",
      priority: "info",
      linkUrl: "/pharmacy",
      metadata: {
        prescriptionId: prescription.id,
        prescriptionNumber: prescription.prescriptionNumber,
        patientId: prescription.patientId,
      },
    });

    return prescription;
  }

  async updatePrescriptionStatus(id: string, payload: UpdatePrescriptionStatusDto) {
    return prisma.prescription.update({
      where: { id },
      data: { status: payload.status as PrescriptionStatus },
      include: prescriptionInclude,
    });
  }
}
