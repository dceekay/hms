import { BillPaymentStatus, PharmacyMovementType, Prisma } from "@prisma/client";
import { HttpStatus } from "../../core/HttpStatus";
import { prisma } from "../../database/prisma";
import { ApiError } from "../../shared/errors/ApiError";
import {
  CreatePharmacySaleDto,
  DispenseMedicationDto,
  ListMedicationsQueryDto,
  MedicationDto,
  StockAdjustmentDto,
  UpdateMedicationDto,
} from "./dto";
import { NotificationService } from "../notifications/service";

function cleanText(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function parseDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  return Number(value ?? 0);
}

function createPharmacyInvoiceNumber() {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MDSP-${year}-${suffix}`;
}

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new ApiError(HttpStatus.CONFLICT, "A medication with this name, strength, and dosage form already exists");
    }

    if (error.code === "P2025") {
      throw new ApiError(HttpStatus.NOT_FOUND, "Medication record not found");
    }
  }

  throw error;
}

function medicationPayload(payload: MedicationDto | UpdateMedicationDto) {
  return {
    ...payload,
    genericName: cleanText(payload.genericName),
    brandName: cleanText(payload.brandName),
    category: cleanText(payload.category),
    strength: cleanText(payload.strength),
    dosageForm: cleanText(payload.dosageForm),
    batchNumber: cleanText(payload.batchNumber),
    expiryDate: parseDate(payload.expiryDate),
  };
}

export class PharmacyService {
  async listMedications(params: ListMedicationsQueryDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const now = new Date();

    const where: Prisma.MedicationWhereInput = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search } },
              { genericName: { contains: params.search } },
              { brandName: { contains: params.search } },
              { category: { contains: params.search } },
              { batchNumber: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [allActive, matchingItems] = await prisma.$transaction([
      prisma.medication.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          id: true,
          currentStock: true,
          reorderLevel: true,
          expiryDate: true,
        },
      }),
      prisma.medication.findMany({
        where,
        orderBy: [{ currentStock: "asc" }, { name: "asc" }],
      }),
    ]);

    const filteredItems = matchingItems.filter((item) => {
      if (params.stockStatus === "low") {
        return item.currentStock > 0 && item.currentStock <= item.reorderLevel;
      }

      if (params.stockStatus === "out") {
        return item.currentStock === 0;
      }

      if (params.stockStatus === "expired") {
        return Boolean(item.expiryDate && item.expiryDate < now);
      }

      return true;
    });

    const total = filteredItems.length;
    const items = filteredItems.slice((page - 1) * limit, page * limit);

    const lowStock = allActive.filter(
      (item) => item.currentStock > 0 && item.currentStock <= item.reorderLevel
    ).length;
    const outOfStock = allActive.filter((item) => item.currentStock === 0).length;
    const expired = allActive.filter(
      (item) => item.expiryDate && item.expiryDate < now
    ).length;

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        active: allActive.length,
        lowStock,
        outOfStock,
        expired,
      },
    };
  }

  async createMedication(payload: MedicationDto) {
    try {
      return await prisma.medication.create({
        data: medicationPayload(payload) as Prisma.MedicationCreateInput,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async updateMedication(id: string, payload: UpdateMedicationDto) {
    try {
      return await prisma.medication.update({
        where: { id },
        data: medicationPayload(payload) as Prisma.MedicationUpdateInput,
      });
    } catch (error) {
      handlePrismaError(error);
    }
  }

  async adjustStock(id: string, payload: StockAdjustmentDto, recordedById?: string) {
    const updated = await prisma.$transaction(async (tx) => {
      const medication = await tx.medication.findFirst({
        where: { id, deletedAt: null },
      });

      if (!medication) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Medication not found");
      }

      const stockAfter = medication.currentStock + payload.quantityChange;

      if (stockAfter < 0) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Stock cannot be reduced below zero");
      }

      const updated = await tx.medication.update({
        where: { id },
        data: { currentStock: stockAfter },
      });

      await tx.pharmacyStockMovement.create({
        data: {
          medicationId: id,
          movementType:
            payload.quantityChange >= 0
              ? PharmacyMovementType.stock_in
              : PharmacyMovementType.adjustment,
          quantity: payload.quantityChange,
          stockBefore: medication.currentStock,
          stockAfter,
          reason: cleanText(payload.reason),
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
        },
      });

      return updated;
    });

    if (updated.currentStock <= updated.reorderLevel) {
      await NotificationService.notifyRoles(["Pharmacist", "Administrator", "Super Admin"], {
        title: updated.currentStock === 0 ? "Medicine out of stock" : "Medicine stock is low",
        message: `${updated.name} has ${updated.currentStock} ${updated.unit} remaining.`,
        eventKey: "pharmacy.stock.low",
        priority: updated.currentStock === 0 ? "critical" : "warning",
        linkUrl: "/pharmacy",
        metadata: {
          medicationId: updated.id,
          currentStock: updated.currentStock,
          reorderLevel: updated.reorderLevel,
        },
      });
    }

    return updated;
  }

  async dispense(payload: DispenseMedicationDto, recordedById?: string) {
    const dispense = await prisma.$transaction(async (tx) => {
      const [medication, patient] = await Promise.all([
        tx.medication.findFirst({
          where: { id: payload.medicationId, deletedAt: null, isActive: true },
        }),
        tx.patient.findFirst({
          where: { id: payload.patientId, deletedAt: null },
        }),
      ]);

      if (!medication) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Medication not found or inactive");
      }

      if (!patient) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found");
      }

      if (medication.currentStock < payload.quantity) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Not enough stock to dispense");
      }

      const unitPrice = payload.unitPrice ?? toNumber(medication.sellingPrice);
      const totalAmount = unitPrice * payload.quantity;
      const amountPaid = payload.amountPaid ?? 0;
      const paymentStatus =
        payload.paymentStatus ??
        (amountPaid >= totalAmount
          ? BillPaymentStatus.paid
          : BillPaymentStatus.pending);
      const stockAfter = medication.currentStock - payload.quantity;

      const dispense = await tx.pharmacyDispense.create({
        data: {
          invoiceNumber: createPharmacyInvoiceNumber(),
          medicationId: medication.id,
          patientId: patient.id,
          quantity: payload.quantity,
          unitPrice,
          totalAmount,
          amountPaid,
          paymentStatus,
          instructions: cleanText(payload.instructions),
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
        },
        include: {
          medication: true,
          patient: true,
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

      await tx.medication.update({
        where: { id: medication.id },
        data: { currentStock: stockAfter },
      });

      await tx.pharmacyStockMovement.create({
        data: {
          medicationId: medication.id,
          movementType: PharmacyMovementType.dispense,
          quantity: -payload.quantity,
          stockBefore: medication.currentStock,
          stockAfter,
          reason: "Dispensed to patient",
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
        },
      });

      return dispense;
    });

    await NotificationService.notifyRoles(["Pharmacist", "Billing Officer", "Administrator", "Super Admin"], {
      title: "Medication dispensed",
      message: `${dispense.medication.name} was dispensed to ${dispense.patient.firstName} ${dispense.patient.lastName}.`,
      eventKey: "pharmacy.dispensed",
      priority: "success",
      linkUrl: "/pharmacy",
      metadata: {
        dispenseId: dispense.id,
        invoiceNumber: dispense.invoiceNumber,
        patientId: dispense.patientId,
      },
    });

    if (dispense.medication.currentStock - dispense.quantity <= dispense.medication.reorderLevel) {
      await NotificationService.notifyRoles(["Pharmacist", "Administrator", "Super Admin"], {
        title: "Medicine needs restock",
        message: `${dispense.medication.name} is near reorder level after dispensing.`,
        eventKey: "pharmacy.stock.low",
        priority: "warning",
        linkUrl: "/pharmacy",
        metadata: {
          medicationId: dispense.medicationId,
        },
      });
    }

    return dispense;
  }

  async listDispenses(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: Prisma.PharmacyDispenseWhereInput = {
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search } },
              { medication: { name: { contains: params.search } } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.pharmacyDispense.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dispensedAt: "desc" },
        include: {
          medication: true,
          patient: true,
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
      prisma.pharmacyDispense.count({ where }),
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

  async createSale(payload: CreatePharmacySaleDto, recordedById?: string) {
    const sale = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: payload.patientId, deletedAt: null },
      });

      if (!patient) {
        throw new ApiError(HttpStatus.NOT_FOUND, "Patient not found");
      }

      const medicationIds = Array.from(
        new Set(payload.items.map((item) => item.medicationId))
      );
      const medications = await tx.medication.findMany({
        where: {
          id: { in: medicationIds },
          deletedAt: null,
          isActive: true,
        },
      });
      const medicationMap = new Map(
        medications.map((medication) => [medication.id, medication])
      );
      const requestedQuantities = new Map<string, number>();

      for (const item of payload.items) {
        const medication = medicationMap.get(item.medicationId);

        if (!medication) {
          throw new ApiError(HttpStatus.NOT_FOUND, "One or more medications are unavailable");
        }

        requestedQuantities.set(
          item.medicationId,
          (requestedQuantities.get(item.medicationId) ?? 0) + item.quantity
        );
      }

      for (const [medicationId, requestedQuantity] of requestedQuantities) {
        const medication = medicationMap.get(medicationId);

        if (!medication || medication.currentStock < requestedQuantity) {
          throw new ApiError(HttpStatus.BAD_REQUEST, "Not enough stock for one or more medicines");
        }
      }

      const invoiceNumber = createPharmacyInvoiceNumber();
      const saleItems = payload.items.map((item) => {
        const medication = medicationMap.get(item.medicationId)!;
        const unitPrice = item.unitPrice ?? toNumber(medication.sellingPrice);

        return {
          medicationId: item.medicationId,
          quantity: item.quantity,
          unitPrice,
          totalAmount: unitPrice * item.quantity,
          instructions: cleanText(item.instructions),
        };
      });
      const subtotalAmount = saleItems.reduce(
        (sum, item) => sum + item.totalAmount,
        0
      );

      if (payload.discountAmount > subtotalAmount) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Discount cannot exceed subtotal");
      }

      const totalAmount = subtotalAmount - payload.discountAmount;
      const amountPaid = payload.amountPaid ?? 0;
      const paymentStatus =
        payload.paymentStatus ??
        (amountPaid >= totalAmount
          ? BillPaymentStatus.paid
          : BillPaymentStatus.pending);

      const sale = await tx.pharmacySale.create({
        data: {
          invoiceNumber,
          patientId: patient.id,
          subtotalAmount,
          discountAmount: payload.discountAmount,
          totalAmount,
          amountPaid,
          paymentStatus,
          notes: cleanText(payload.notes),
          recordedById: recordedById ?? null,
          items: {
            create: saleItems,
          },
        },
        include: {
          patient: true,
          items: {
            include: {
              medication: true,
            },
          },
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

      for (const [medicationId, requestedQuantity] of requestedQuantities) {
        const medication = medicationMap.get(medicationId)!;
        const stockAfter = medication.currentStock - requestedQuantity;

        await tx.medication.update({
          where: { id: medicationId },
          data: { currentStock: stockAfter },
        });

        await tx.pharmacyStockMovement.create({
          data: {
            medicationId,
            movementType: PharmacyMovementType.dispense,
            quantity: -requestedQuantity,
            stockBefore: medication.currentStock,
            stockAfter,
            reason: `Sale ${invoiceNumber}`,
            notes: cleanText(payload.notes),
            recordedById: recordedById ?? null,
          },
        });
      }

      return sale;
    });

    await NotificationService.notifyRoles(["Pharmacist", "Billing Officer", "Administrator", "Super Admin"], {
      title: "Pharmacy invoice generated",
      message: `${sale.invoiceNumber} was generated for ${sale.patient.firstName} ${sale.patient.lastName}.`,
      eventKey: "pharmacy.sale.created",
      priority: "success",
      linkUrl: "/pharmacy",
      metadata: {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        patientId: sale.patientId,
      },
    });

    const lowItems = sale.items.filter(
      (item) => item.medication.currentStock - item.quantity <= item.medication.reorderLevel
    );

    if (lowItems.length > 0) {
      await NotificationService.notifyRoles(["Pharmacist", "Administrator", "Super Admin"], {
        title: "Pharmacy restock needed",
        message: `${lowItems.length} medicine item(s) are near or below reorder level.`,
        eventKey: "pharmacy.stock.low",
        priority: "warning",
        linkUrl: "/pharmacy",
        metadata: {
          saleId: sale.id,
          medicationIds: lowItems.map((item) => item.medicationId),
        },
      });
    }

    return sale;
  }

  async listSales(params: { page?: number; limit?: number; search?: string }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const where: Prisma.PharmacySaleWhereInput = {
      ...(params.search
        ? {
            OR: [
              { invoiceNumber: { contains: params.search } },
              { patient: { firstName: { contains: params.search } } },
              { patient: { lastName: { contains: params.search } } },
              { patient: { mrn: { contains: params.search } } },
              {
                items: {
                  some: {
                    medication: { name: { contains: params.search } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, paidTotal, pendingTotal] = await prisma.$transaction([
      prisma.pharmacySale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { soldAt: "desc" },
        include: {
          patient: true,
          items: {
            include: {
              medication: true,
            },
          },
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
      prisma.pharmacySale.count({ where }),
      prisma.pharmacySale.aggregate({
        where: { ...where, paymentStatus: BillPaymentStatus.paid },
        _sum: { totalAmount: true },
      }),
      prisma.pharmacySale.aggregate({
        where: { ...where, paymentStatus: BillPaymentStatus.pending },
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
        paidAmount: toNumber(paidTotal._sum.totalAmount),
        pendingAmount: toNumber(pendingTotal._sum.totalAmount),
      },
    };
  }

  async listMovements(params: { medicationId?: string; page?: number; limit?: number }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 30;

    const where: Prisma.PharmacyStockMovementWhereInput = {
      ...(params.medicationId ? { medicationId: params.medicationId } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.pharmacyStockMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          medication: true,
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
      prisma.pharmacyStockMovement.count({ where }),
    ]);

    return { items, total };
  }
}
