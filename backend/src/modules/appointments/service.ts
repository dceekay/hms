import { AppointmentStatus, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { NotificationService } from "../notifications/service";
import {
  CreateAppointmentDto,
  ListAppointmentsQueryDto,
  UpdateAppointmentStatusDto,
} from "./dto";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : new Date();
}

function createAppointmentNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSA-${year}-${suffix}`;
}

function dayRange(date?: string) {
  const base = date ? new Date(date) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const patientSelect = {
  id: true,
  mrn: true,
  qrCode: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  photoUrl: true,
  photoDataUrl: true,
  dateOfBirth: true,
  gender: true,
  status: true,
  patientCategory: true,
  address: true,
  city: true,
  state: true,
  country: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRelationship: true,
  bloodGroup: true,
  genotype: true,
  allergies: true,
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

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  phone: true,
  serviceArea: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  doctorProfile: true,
};

const appointmentInclude = {
  patient: { select: patientSelect },
  doctor: { select: userSelect },
  recordedBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
    },
  },
};

function statusTimestamp(status: AppointmentStatus) {
  const now = new Date();

  if (status === "checked_in") return { checkedInAt: now };
  if (status === "in_consultation") return { startedAt: now };
  if (status === "completed") return { completedAt: now };
  if (status === "cancelled" || status === "no_show") return { cancelledAt: now };
  return {};
}

export class AppointmentService {
  async listDoctors() {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        roles: {
          some: {
            role: {
              name: "Doctor",
            },
          },
        },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: userSelect,
    });
  }

  async list(params: ListAppointmentsQueryDto, currentUserId?: string) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 50;
    const range = params.date ? dayRange(params.date) : undefined;

    const where: Prisma.AppointmentWhereInput = {
      deletedAt: null,
      ...(params.mine && currentUserId ? { doctorId: currentUserId } : {}),
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...(params.status && params.status !== "all"
        ? { status: params.status as AppointmentStatus }
        : {}),
      ...(range ? { scheduledFor: { gte: range.start, lt: range.end } } : {}),
      ...(params.search
        ? {
            OR: [
              { appointmentNumber: { contains: params.search } },
              { reason: { contains: params.search } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
              { doctor: { firstName: { contains: params.search } } },
              { doctor: { lastName: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total, summary] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
        include: appointmentInclude,
      }),
      prisma.appointment.count({ where }),
      prisma.appointment.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: summary.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.status] = item._count.status;
        return accumulator;
      }, {}),
    };
  }

  async create(payload: CreateAppointmentDto, recordedById?: string) {
    const appointment = await prisma.$transaction(async (tx) => {
      const [patient, doctor] = await Promise.all([
        tx.patient.findFirst({
          where: { id: payload.patientId, deletedAt: null, status: "active" },
        }),
        tx.user.findFirst({
          where: {
            id: payload.doctorId,
            deletedAt: null,
            isActive: true,
            roles: {
              some: {
                role: {
                  name: "Doctor",
                },
              },
            },
          },
        }),
      ]);

      if (!patient) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Active patient not found");
      }

      if (!doctor) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Doctor not found or inactive");
      }

      return tx.appointment.create({
        data: {
          appointmentNumber: createAppointmentNumber(),
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledFor: parseDate(payload.scheduledFor),
          reason: cleanText(payload.reason),
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
        },
        include: appointmentInclude,
      });
    });

    await NotificationService.notifyUsers([appointment.doctorId], {
      title: "Patient assigned",
      message: `${appointment.patient.firstName} ${appointment.patient.lastName} has been assigned to you.`,
      eventKey: "appointment.assigned",
      priority: "info",
      linkUrl: "/doctor",
      metadata: {
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
      },
    });

    return appointment;
  }

  async updateStatus(id: string, payload: UpdateAppointmentStatusDto) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, deletedAt: null },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Appointment not found");
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        status: payload.status as AppointmentStatus,
        notes: payload.notes !== undefined ? cleanText(payload.notes) : appointment.notes,
        ...statusTimestamp(payload.status as AppointmentStatus),
      },
      include: appointmentInclude,
    });
  }
}
