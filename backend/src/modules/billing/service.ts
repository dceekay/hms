import { BillPaymentStatus, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import { CreatePatientBillDto, ListPatientBillsQueryDto } from "./dto";
import { NotificationService } from "../notifications/service";

function createInvoiceNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSB-${year}-${suffix}`;
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A bill with this invoice number already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Billing record not found");
    }
  }

  throw error;
}

export class BillingService {
  async list(params: ListPatientBillsQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: Prisma.PatientBillWhereInput = {
      deletedAt: null,
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.serviceId ? { serviceId: params.serviceId } : {}),
      ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
              { service: { name: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total, pendingTotal, paidTotal] = await prisma.$transaction([
      prisma.patientBill.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { billedAt: "desc" },
        include: {
          patient: true,
          service: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      }),
      prisma.patientBill.count({ where }),
      prisma.patientBill.aggregate({
        where: { ...where, paymentStatus: BillPaymentStatus.pending },
        _sum: { totalAmount: true },
      }),
      prisma.patientBill.aggregate({
        where: { ...where, paymentStatus: BillPaymentStatus.paid },
        _sum: { totalAmount: true },
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
      summary: {
        pendingAmount: pendingTotal._sum.totalAmount ?? 0,
        paidAmount: paidTotal._sum.totalAmount ?? 0,
      },
    };
  }

  async create(payload: CreatePatientBillDto, recordedById?: string) {
    const patient = await prisma.patient.findFirst({
      where: {
        id: payload.patientId,
        deletedAt: null,
      },
    });

    if (!patient) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found");
    }

    const service = await prisma.hospitalService.findFirst({
      where: {
        id: payload.serviceId,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Hospital service not found or inactive");
    }

    const unitPrice = payload.unitPrice ?? Number(service.price);
    const totalAmount = unitPrice * payload.quantity;
    const amountPaid = payload.amountPaid ?? 0;
    const paymentStatus =
      payload.paymentStatus ??
      (amountPaid >= totalAmount
        ? BillPaymentStatus.paid
        : BillPaymentStatus.pending);

    try {
      const bill = await prisma.patientBill.create({
        data: {
          invoiceNumber: createInvoiceNumber(),
          patientId: payload.patientId,
          serviceId: payload.serviceId,
          quantity: payload.quantity,
          unitPrice,
          totalAmount,
          amountPaid,
          paymentStatus,
          notes: payload.notes || null,
          recordedById: recordedById ?? null,
        },
        include: {
          patient: true,
          service: true,
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
      });

      await NotificationService.notifyRoles(["Billing Officer", "Receptionist", "Administrator", "Super Admin"], {
        title: "Patient bill created",
        message: `${bill.invoiceNumber} was created for ${bill.patient.firstName} ${bill.patient.lastName}.`,
        eventKey: "billing.created",
        priority: paymentStatus === BillPaymentStatus.pending ? "warning" : "success",
        linkUrl: "/billing",
        metadata: {
          billId: bill.id,
          invoiceNumber: bill.invoiceNumber,
          patientId: bill.patientId,
          paymentStatus,
        },
      });

      return bill;
    } catch (error) {
      handlePrismaError(error);
    }
  }
}
