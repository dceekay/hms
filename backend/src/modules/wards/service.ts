import { BedStatus, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { HttpStatus } from "../../core/HttpStatus";
import { AssignBedDto, DischargeAssignmentDto, UpdateBedStatusDto } from "./dto";

const patientSelect = {
  id: true,
  mrn: true,
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  gender: true,
  patientCategory: true,
  status: true,
  photoDataUrl: true,
  photoUrl: true,
};

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
};

const assignmentInclude = {
  patient: { select: patientSelect },
  bed: { include: { ward: true, room: true } },
  ward: true,
  room: true,
  doctor: { select: userSelect },
  assignedBy: { select: userSelect },
  dischargedBy: { select: userSelect },
  admissionRequest: true,
};

const admissionRequestInclude = {
  patient: { select: patientSelect },
  doctor: { select: userSelect },
  ward: true,
  bed: { include: { ward: true, room: true } },
};

function cleanText(value?: string | null) {
  const clean = value?.trim();
  return clean ? clean : null;
}

function createAdmissionNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ADM-${stamp}-${suffix}`;
}

function summarizeBeds(beds: Array<{ status: BedStatus }>) {
  const counts = {
    total: beds.length,
    available: 0,
    occupied: 0,
    reserved: 0,
    cleaning: 0,
    maintenance: 0,
    blocked: 0,
  };

  for (const bed of beds) {
    counts[bed.status] += 1;
  }

  return {
    ...counts,
    occupancyRate: counts.total ? Math.round((counts.occupied / counts.total) * 100) : 0,
  };
}

export class WardService {
  async dashboard() {
    const [wards, beds, activeAdmissions, admissionRequests, patients, doctors] =
      await prisma.$transaction([
        prisma.ward.findMany({
          where: { deletedAt: null, isActive: true },
          orderBy: { name: "asc" },
          include: {
            rooms: {
              where: { deletedAt: null, isActive: true },
              orderBy: { roomNumber: "asc" },
            },
            beds: {
              where: { deletedAt: null, isActive: true },
              orderBy: { bedNumber: "asc" },
              include: {
                room: true,
                bedAssignments: {
                  where: { status: "active" },
                  take: 1,
                  orderBy: { admittedAt: "desc" },
                  include: {
                    patient: { select: patientSelect },
                    doctor: { select: userSelect },
                    assignedBy: { select: userSelect },
                  },
                },
              },
            },
          },
        }),
        prisma.bed.findMany({
          where: { deletedAt: null, isActive: true },
          include: { ward: true, room: true },
          orderBy: { bedNumber: "asc" },
        }),
        prisma.wardBedAssignment.findMany({
          where: { status: "active" },
          take: 80,
          orderBy: { admittedAt: "desc" },
          include: assignmentInclude,
        }),
        prisma.clinicalAdmissionRequest.findMany({
          where: { status: { in: ["pending", "approved"] } },
          take: 50,
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          include: admissionRequestInclude,
        }),
        prisma.patient.findMany({
          where: { deletedAt: null, status: "active" },
          take: 150,
          orderBy: { updatedAt: "desc" },
          select: patientSelect,
        }),
        prisma.user.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            roles: { some: { role: { name: "Doctor" } } },
          },
          take: 100,
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: userSelect,
        }),
      ]);

    const activePatientIds = new Set(activeAdmissions.map((item) => item.patientId));
    const wardSummaries = wards.map((ward) => ({
      id: ward.id,
      name: ward.name,
      description: ward.description,
      isActive: ward.isActive,
      rooms: ward.rooms,
      beds: ward.beds.map((bed) => ({
        ...bed,
        currentAssignment: bed.bedAssignments[0] ?? null,
        bedAssignments: undefined,
      })),
      summary: summarizeBeds(ward.beds),
    }));

    return {
      summary: summarizeBeds(beds),
      wards: wardSummaries,
      beds,
      activeAdmissions,
      admissionRequests,
      patients: patients.filter((patient) => !activePatientIds.has(patient.id)),
      doctors,
    };
  }

  async assignBed(payload: AssignBedDto, assignedById?: string) {
    if (!assignedById) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    const patient = await prisma.patient.findFirst({
      where: { id: payload.patientId, deletedAt: null, status: "active" },
    });

    if (!patient) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found or inactive");
    }

    const existingPatientAdmission = await prisma.wardBedAssignment.findFirst({
      where: { patientId: payload.patientId, status: "active" },
    });

    if (existingPatientAdmission) {
      throw new ApiError(HttpStatus.CONFLICT, "Patient is already assigned to a bed");
    }

    const result = await prisma.$transaction(async (tx) => {
      const bed = await tx.bed.findFirst({
        where: {
          id: payload.bedId,
          deletedAt: null,
          isActive: true,
          status: { in: ["available", "reserved"] },
        },
        include: { ward: true, room: true },
      });

      if (!bed) {
        throw new ApiError(HttpStatus.CONFLICT, "Bed is not available for assignment");
      }

      const activeBedAssignment = await tx.wardBedAssignment.findFirst({
        where: { bedId: payload.bedId, status: "active" },
      });

      if (activeBedAssignment) {
        throw new ApiError(HttpStatus.CONFLICT, "Bed already has an active patient");
      }

      const assignment = await tx.wardBedAssignment.create({
        data: {
          admissionNumber: createAdmissionNumber(),
          patientId: payload.patientId,
          bedId: bed.id,
          wardId: bed.wardId,
          roomId: bed.roomId,
          doctorId: cleanText(payload.doctorId),
          assignedById,
          admissionRequestId: cleanText(payload.admissionRequestId),
          priority: payload.priority,
          diagnosis: cleanText(payload.diagnosis),
          reason: payload.reason.trim(),
          notes: cleanText(payload.notes),
          expectedDischargeAt: payload.expectedDischargeAt ?? null,
        },
        include: assignmentInclude,
      });

      await tx.bed.update({
        where: { id: bed.id },
        data: { status: "occupied" },
      });

      if (payload.admissionRequestId) {
        await tx.clinicalAdmissionRequest.update({
          where: { id: payload.admissionRequestId },
          data: {
            status: "admitted",
            wardId: bed.wardId,
            bedId: bed.id,
          },
        });
      }

      return assignment;
    });

    return result;
  }

  async dischargeAssignment(id: string, payload: DischargeAssignmentDto, dischargedById?: string) {
    if (!dischargedById) {
      throw new ApiError(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    return prisma.$transaction(async (tx) => {
      const assignment = await tx.wardBedAssignment.findFirst({
        where: { id, status: "active" },
      });

      if (!assignment) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Active bed assignment not found");
      }

      const updated = await tx.wardBedAssignment.update({
        where: { id },
        data: {
          status: "discharged",
          dischargedAt: new Date(),
          dischargedById,
          dischargeDisposition: cleanText(payload.dischargeDisposition),
          notes: cleanText(payload.notes) ?? assignment.notes,
        },
        include: assignmentInclude,
      });

      await tx.bed.update({
        where: { id: assignment.bedId },
        data: { status: payload.nextBedStatus },
      });

      return updated;
    });
  }

  async updateBedStatus(id: string, payload: UpdateBedStatusDto) {
    const activeAssignment = await prisma.wardBedAssignment.findFirst({
      where: { bedId: id, status: "active" },
    });

    if (activeAssignment) {
      throw new ApiError(HttpStatus.CONFLICT, "Release the active patient before changing this bed status");
    }

    try {
      return await prisma.bed.update({
        where: { id },
        data: { status: payload.status },
        include: { ward: true, room: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ApiError(HttpStatus.NOT_FOUND, "Bed not found");
      }

      throw error;
    }
  }
}
