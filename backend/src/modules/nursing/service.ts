import {
  MedicationAdministrationStatus,
  NursingShift,
  Prisma,
} from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { NotificationService } from "../notifications/service";
import {
  MedicationAdministrationDto,
  NursingNoteDto,
  NursingPatientQueryDto,
  OrderAcknowledgementDto,
  VitalSignDto,
} from "./dto";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function nurseInitials(firstName?: string | null, lastName?: string | null) {
  const initials = `${firstName?.charAt(0) ?? ""}${lastName?.charAt(0) ?? ""}`.toUpperCase();
  return initials || "NS";
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function parseFrequencyHours(value: string) {
  const text = value.toLowerCase();
  const everyHours = text.match(/(?:every|q)\s*(\d{1,2})\s*(?:h|hr|hrs|hour|hours)?/);

  if (everyHours) return Number(everyHours[1]);
  if (/\b(qid|four times|4 times)\b/.test(text)) return 6;
  if (/\b(tds|tid|three times|3 times)\b/.test(text)) return 8;
  if (/\b(bd|bid|twice|2 times)\b/.test(text)) return 12;
  if (/\b(od|daily|once daily|morning)\b/.test(text)) return 24;
  if (/\b(nocte|night)\b/.test(text)) return 24;

  const plainNumber = text.match(/\b(\d{1,2})\s*(?:h|hr|hrs|hour|hours)\b/);
  if (plainNumber) return Number(plainNumber[1]);

  return 8;
}

function parseDurationDays(value: string) {
  const text = value.toLowerCase();
  const count = Number(text.match(/\d+/)?.[0] ?? 0);

  if (!count) return null;
  if (text.includes("week")) return count * 7;
  if (text.includes("month")) return count * 30;
  if (text.includes("hour")) return Math.max(1, Math.ceil(count / 24));

  return count;
}

function patientSelect() {
  return {
    id: true,
    mrn: true,
    qrCode: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    photoDataUrl: true,
    photoUrl: true,
    dateOfBirth: true,
    gender: true,
    patientCategory: true,
    status: true,
    bloodGroup: true,
    genotype: true,
    allergies: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    insurancePolicyNumber: true,
    insuranceMemberNumber: true,
    insurancePrincipalName: true,
    insuranceCoverageStatus: true,
    insuranceProvider: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
    wardBedAssignments: {
      where: { status: "active" as const },
      take: 1,
      orderBy: { admittedAt: "desc" as const },
      include: {
        ward: true,
        room: true,
        bed: true,
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    },
  } satisfies Prisma.PatientSelect;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
};

const scheduleInclude = {
  patient: { select: patientSelect() },
  prescription: {
    include: {
      doctor: { select: userSelect },
    },
  },
  prescriptionItem: {
    include: {
      medication: true,
    },
  },
  records: {
    take: 8,
    orderBy: { administeredAt: "desc" as const },
    include: {
      nurse: { select: userSelect },
    },
  },
};

const vitalInclude = {
  patient: { select: patientSelect() },
  recordedBy: { select: userSelect },
};

const noteInclude = {
  patient: { select: patientSelect() },
  recordedBy: { select: userSelect },
};

export class NursingService {
  async workspace(nurseId?: string) {
    if (!nurseId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    await this.syncMedicationSchedules();

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoon = addHours(now, 2);

    const [
      patients,
      activeAdmissions,
      schedules,
      recentVitals,
      recentNotes,
      acknowledgements,
      prescriptions,
      labRequests,
      admissionRequests,
      referrals,
    ] = await prisma.$transaction([
      prisma.patient.findMany({
        where: { deletedAt: null, status: "active" },
        take: 120,
        orderBy: { updatedAt: "desc" },
        select: patientSelect(),
      }),
      prisma.wardBedAssignment.findMany({
        where: { status: "active" },
        take: 100,
        orderBy: { admittedAt: "desc" },
        include: {
          patient: { select: patientSelect() },
          ward: true,
          room: true,
          bed: true,
          doctor: { select: userSelect },
        },
      }),
      prisma.medicationAdministrationSchedule.findMany({
        where: { isActive: true },
        take: 120,
        orderBy: [{ nextDueAt: "asc" }, { createdAt: "desc" }],
        include: scheduleInclude,
      }),
      prisma.vitalSignRecord.findMany({
        take: 30,
        orderBy: { recordedAt: "desc" },
        include: vitalInclude,
      }),
      prisma.nursingNote.findMany({
        take: 30,
        orderBy: { recordedAt: "desc" },
        include: noteInclude,
      }),
      prisma.nurseOrderAcknowledgement.findMany({
        where: { nurseId },
        take: 200,
        orderBy: { acknowledgedAt: "desc" },
      }),
      prisma.prescription.findMany({
        where: { status: { in: ["sent_to_pharmacy", "dispensed"] } },
        take: 40,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: patientSelect() },
          doctor: { select: userSelect },
          items: { include: { medication: true } },
        },
      }),
      prisma.laboratoryRequest.findMany({
        where: { status: { in: ["pending", "sample_collected", "in_progress", "completed"] } },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: patientSelect() },
          template: true,
        },
      }),
      prisma.clinicalAdmissionRequest.findMany({
        where: { status: { in: ["pending", "approved"] } },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: patientSelect() },
          doctor: { select: userSelect },
          ward: true,
          bed: true,
        },
      }),
      prisma.clinicalReferral.findMany({
        where: { status: { in: ["pending", "sent"] } },
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          patient: { select: patientSelect() },
          doctor: { select: userSelect },
        },
      }),
    ]);

    const activeAdmissionPatientIds = new Set(activeAdmissions.map((item) => item.patientId));
    const dueNow = schedules.filter((item) => item.nextDueAt && item.nextDueAt <= dueSoon);
    const overdue = schedules.filter((item) => item.nextDueAt && item.nextDueAt < now);
    const completedToday = await prisma.medicationAdministrationRecord.count({
      where: {
        administeredAt: { gte: today },
        status: "given",
      },
    });

    return {
      summary: {
        activePatients: patients.length,
        admittedPatients: activeAdmissions.length,
        dueMedication: dueNow.length,
        overdueMedication: overdue.length,
        completedMedicationToday: completedToday,
        newDoctorOrders:
          prescriptions.length + labRequests.filter((item) => item.status !== "completed").length + admissionRequests.length,
        pendingVitals: activeAdmissions.length,
        nursingNotesToday: recentNotes.filter((note) => note.recordedAt >= today).length,
      },
      patients: patients.map((patient) => ({
        ...patient,
        currentAdmission: patient.wardBedAssignments[0] ?? null,
        wardBedAssignments: undefined,
        isAdmitted: activeAdmissionPatientIds.has(patient.id),
      })),
      activeAdmissions,
      medicationSchedules: schedules,
      recentVitals,
      recentNotes,
      acknowledgements,
      doctorOrders: {
        prescriptions,
        labRequests,
        admissionRequests,
        referrals,
      },
    };
  }

  async listPatients(params: NursingPatientQueryDto) {
    const search = cleanText(params.search);

    const patients = await prisma.patient.findMany({
      where: {
        deletedAt: null,
        status: "active",
        ...(search
          ? {
              OR: [
                { firstName: { contains: search } },
                { lastName: { contains: search } },
                { mrn: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      take: 100,
      orderBy: { updatedAt: "desc" },
      select: patientSelect(),
    });

    return patients.map((patient) => ({
      ...patient,
      currentAdmission: patient.wardBedAssignments[0] ?? null,
      wardBedAssignments: undefined,
      isAdmitted: Boolean(patient.wardBedAssignments[0]),
    }));
  }

  async administerMedication(scheduleId: string, payload: MedicationAdministrationDto, nurseId?: string) {
    if (!nurseId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const nurse = await prisma.user.findFirst({
      where: { id: nurseId, deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!nurse) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const schedule = await prisma.medicationAdministrationSchedule.findFirst({
      where: { id: scheduleId, isActive: true },
      include: { patient: true, prescription: true },
    });

    if (!schedule) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Medication schedule not found");
    }

    const scheduledFor = payload.scheduledFor ?? schedule.nextDueAt ?? new Date();
    const nextDueAt = schedule.intervalHours ? addHours(scheduledFor, schedule.intervalHours) : null;
    const isStillActive = Boolean(nextDueAt && (!schedule.endAt || nextDueAt <= schedule.endAt));

    const record = await prisma.$transaction(async (tx) => {
      const medicationRecord = await tx.medicationAdministrationRecord.create({
        data: {
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          nurseId,
          status: payload.status as MedicationAdministrationStatus,
          scheduledFor,
          nurseInitials: cleanText(payload.nurseInitials) ?? nurseInitials(nurse.firstName, nurse.lastName),
          note: cleanText(payload.note),
        },
        include: {
          schedule: { include: scheduleInclude },
          patient: { select: patientSelect() },
          nurse: { select: userSelect },
        },
      });

      await tx.medicationAdministrationSchedule.update({
        where: { id: schedule.id },
        data: {
          nextDueAt,
          isActive: isStillActive,
        },
      });

      return medicationRecord;
    });

    if (payload.status !== "given") {
      await NotificationService.create({
        title: "Medication attention needed",
        message: `${schedule.medicationName} for ${schedule.patient.firstName} ${schedule.patient.lastName} was marked ${payload.status}.`,
        eventKey: "nursing.medication.exception",
        priority: payload.status === "missed" ? "critical" : "warning",
        targetUserId: schedule.doctorId,
        linkUrl: "/doctor/prescription",
        metadata: {
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          status: payload.status,
        },
      });
    }

    return record;
  }

  async recordVitals(payload: VitalSignDto, nurseId?: string) {
    if (!nurseId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    return prisma.vitalSignRecord.create({
      data: {
        patientId: payload.patientId,
        recordedById: nurseId,
        temperatureCelsius: payload.temperatureCelsius,
        systolicBp: payload.systolicBp,
        diastolicBp: payload.diastolicBp,
        pulse: payload.pulse,
        respiration: payload.respiration,
        spo2: payload.spo2,
        painScore: payload.painScore,
        notes: cleanText(payload.notes),
      },
      include: vitalInclude,
    });
  }

  async createNote(payload: NursingNoteDto, nurseId?: string) {
    if (!nurseId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    return prisma.nursingNote.create({
      data: {
        patientId: payload.patientId,
        recordedById: nurseId,
        shift: payload.shift as NursingShift,
        note: payload.note.trim(),
      },
      include: noteInclude,
    });
  }

  async acknowledgeOrder(payload: OrderAcknowledgementDto, nurseId?: string) {
    if (!nurseId) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    return prisma.nurseOrderAcknowledgement.upsert({
      where: {
        orderType_orderId_nurseId: {
          orderType: payload.orderType,
          orderId: payload.orderId,
          nurseId,
        },
      },
      update: {
        note: cleanText(payload.note),
        acknowledgedAt: new Date(),
      },
      create: {
        orderType: payload.orderType,
        orderId: payload.orderId,
        patientId: payload.patientId,
        nurseId,
        note: cleanText(payload.note),
      },
    });
  }

  private async syncMedicationSchedules() {
    const prescriptions = await prisma.prescription.findMany({
      where: { status: { in: ["sent_to_pharmacy", "dispensed"] } },
      include: {
        items: true,
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });

    const prescriptionItems = prescriptions.flatMap((prescription) =>
      prescription.items.map((item) => ({ prescription, item }))
    );

    for (const { prescription, item } of prescriptionItems) {
      const intervalHours = parseFrequencyHours(item.frequency);
      const durationDays = parseDurationDays(item.duration);
      const endAt = durationDays ? addHours(prescription.createdAt, durationDays * 24) : null;
      const isActive = !endAt || endAt >= new Date();

      await prisma.medicationAdministrationSchedule.upsert({
        where: { prescriptionItemId: item.id },
        update: {
          medicationId: item.medicationId,
          medicationName: item.medicationName,
          strength: item.strength,
          dosageForm: item.dosageForm,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
          intervalHours,
          endAt,
          isActive,
        },
        create: {
          patientId: prescription.patientId,
          prescriptionId: prescription.id,
          prescriptionItemId: item.id,
          medicationId: item.medicationId,
          doctorId: prescription.doctorId,
          medicationName: item.medicationName,
          strength: item.strength,
          dosageForm: item.dosageForm,
          dose: item.dose,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
          startAt: prescription.createdAt,
          nextDueAt: prescription.createdAt,
          intervalHours,
          endAt,
          isActive,
        },
      });
    }
  }
}
